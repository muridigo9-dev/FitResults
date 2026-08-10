// @ts-nocheck
/**
 * Send Notification Edge Function
 * 
 * Sistema completo para envio de notificações push e in-app
 * com suporte a templates, throttling e logging
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import "https://deno.land/x/xhr@0.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationPayload {
  // Event-based (uses template)
  eventType?: string;
  userId?: string | string[]; // single user or array
  variables?: Record<string, string>; // template variables

  // Or direct (no template)
  title?: string;
  body?: string;
  actionUrl?: string;
  channel?: "push" | "in_app" | "both";

  // Optional
  icon?: string;
  badge?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: NotificationPayload = await req.json();

    console.log("[send-notification] Payload received:", payload);

    // Validate payload
    if (!payload.eventType && (!payload.title || !payload.body)) {
      return new Response(
        JSON.stringify({
          error: "Either eventType or title+body must be provided",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payload.userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Normalize userId to array
    const userIds = Array.isArray(payload.userId)
      ? payload.userId
      : [payload.userId];

    let totalSent = 0;
    let totalFailed = 0;
    const results: any[] = [];

    // Process each user
    for (const userId of userIds) {
      try {
        const result = await sendNotificationToUser(
          supabase,
          userId,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        results.push(result);
        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      } catch (error) {
        console.error(`[send-notification] Error for user ${userId}:`, error);
        totalFailed++;
        results.push({ userId, success: false, error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notification processing completed",
        sent: totalSent,
        failed: totalFailed,
        total: userIds.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-notification] Global error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Send notification to single user
 */
async function sendNotificationToUser(
  supabase: any,
  userId: string,
  payload: NotificationPayload,
  vapidPublicKey: string | undefined,
  vapidPrivateKey: string | undefined
) {
  console.log(`[sendNotificationToUser] Processing for user: ${userId}`);

  let title = payload.title || "";
  let body = payload.body || "";
  let actionUrl = payload.actionUrl || "";
  let channel = payload.channel || "both";
  let templateId: string | null = null;
  let eventType = payload.eventType || "custom";

  // If event-based, get template and render
  if (payload.eventType) {
    console.log(`[sendNotificationToUser] Event-based: ${payload.eventType}`);

    // Get template
    const { data: template, error: templateError } = await supabase.rpc(
      "get_notification_template_for_user",
      {
        p_event_type: payload.eventType,
        p_user_id: userId,
      }
    );

    if (templateError) {
      console.error("[sendNotificationToUser] Template error:", templateError);
      throw new Error(`Template error: ${templateError.message}`);
    }

    if (!template) {
      console.warn(`[sendNotificationToUser] No template found for ${payload.eventType}`);
      throw new Error(`No active template found for event: ${payload.eventType}`);
    }

    console.log(`[sendNotificationToUser] Template found:`, template);

    // Check throttle
    const canSend = await supabase.rpc("should_send_notification", {
      p_user_id: userId,
      p_event_type: payload.eventType,
      p_throttle_minutes: template.throttle_minutes || 0,
    });

    if (!canSend.data) {
      console.log(`[sendNotificationToUser] Throttled for user ${userId}`);
      await logNotification(supabase, {
        template_id: template.id,
        event_type: payload.eventType,
        user_id: userId,
        title: "Throttled",
        body: "Throttled",
        channel: template.channel,
        status: "skipped",
        metadata: payload.metadata || {},
      });
      return { userId, success: false, reason: "throttled" };
    }

    // Render template
    const variables = payload.variables || {};
    title = await renderTemplate(supabase, template.title_template, variables);
    body = await renderTemplate(supabase, template.body_template, variables);
    actionUrl = template.action_url_template
      ? await renderTemplate(supabase, template.action_url_template, variables)
      : "";
    channel = template.channel;
    templateId = template.id;
  }

  console.log(`[sendNotificationToUser] Rendered notification:`, {
    title,
    body,
    actionUrl,
    channel,
  });

  // Create initial log
  const { data: logEntry, error: logError } = await supabase
    .from("notification_logs")
    .insert({
      template_id: templateId,
      event_type: eventType,
      user_id: userId,
      title,
      body,
      action_url: actionUrl,
      channel,
      status: "pending",
      metadata: payload.metadata || {},
    })
    .select()
    .single();

  if (logError) {
    console.error("[sendNotificationToUser] Log error:", logError);
    throw new Error(`Failed to create log: ${logError.message}`);
  }

  const logId = logEntry.id;
  let pushSuccess = false;
  let inAppSuccess = false;
  let pushError: string | null = null;
  let inAppError: string | null = null;

  // Send in-app notification
  if (channel === "in_app" || channel === "both") {
    try {
      const { data: inAppNotif, error: inAppErr } = await supabase
        .from("in_app_notifications")
        .insert({
          user_id: userId,
          title,
          message: body,
          type: "info",
          action_url: actionUrl,
        })
        .select()
        .single();

      if (inAppErr) {
        inAppError = inAppErr.message;
        console.error("[sendNotificationToUser] In-app error:", inAppErr);
      } else {
        inAppSuccess = true;
        await supabase
          .from("notification_logs")
          .update({
            in_app_notification_id: inAppNotif.id,
            in_app_sent_at: new Date().toISOString(),
          })
          .eq("id", logId);
        console.log("[sendNotificationToUser] In-app sent successfully");
      }
    } catch (error) {
      inAppError = String(error);
      console.error("[sendNotificationToUser] In-app exception:", error);
    }
  }

  // Send push notification
  if (channel === "push" || channel === "both") {
    if (!vapidPublicKey || !vapidPrivateKey) {
      pushError = "VAPID keys not configured";
      console.warn("[sendNotificationToUser] VAPID keys missing");
    } else {
      try {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId);

        if (!subscriptions || subscriptions.length === 0) {
          pushError = "No push subscriptions found";
          console.log(`[sendNotificationToUser] No subscriptions for user ${userId}`);
        } else {
          const notificationPayload = {
            title,
            body,
            icon: payload.icon || "/pwa-192x192.png",
            badge: payload.badge || "/pwa-192x192.png",
            data: {
              url: actionUrl,
              ...payload.metadata,
            },
            timestamp: Date.now(),
          };

          // Send to all subscriptions
          for (const sub of subscriptions) {
            try {
              const subscription = sub.subscription as {
                endpoint: string;
                keys: { p256dh: string; auth: string };
              };

              const response = await fetch(subscription.endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  TTL: "86400",
                },
                body: JSON.stringify(notificationPayload),
              });

              if (response.ok) {
                pushSuccess = true;
              } else if (response.status === 410) {
                // Subscription expired
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("id", sub.id);
                console.log(`[sendNotificationToUser] Removed expired subscription`);
              } else {
                pushError = `Push failed: ${response.status}`;
              }
            } catch (subError) {
              pushError = String(subError);
              console.error("[sendNotificationToUser] Push subscription error:", subError);
            }
          }

          if (pushSuccess) {
            await supabase
              .from("notification_logs")
              .update({
                push_sent_at: new Date().toISOString(),
              })
              .eq("id", logId);
          }
        }
      } catch (error) {
        pushError = String(error);
        console.error("[sendNotificationToUser] Push exception:", error);
      }
    }
  }

  // Update final status
  const finalStatus = (pushSuccess || inAppSuccess) ? "sent" : "failed";
  await supabase
    .from("notification_logs")
    .update({
      status: finalStatus,
      push_error: pushError,
      in_app_error: inAppError,
    })
    .eq("id", logId);

  // Update throttle if sent
  if (payload.eventType && finalStatus === "sent") {
    await supabase.rpc("update_notification_throttle", {
      p_user_id: userId,
      p_event_type: payload.eventType,
    });
  }

  console.log(`[sendNotificationToUser] Final status: ${finalStatus}`);

  return {
    userId,
    success: finalStatus === "sent",
    pushSuccess,
    inAppSuccess,
    pushError,
    inAppError,
  };
}

/**
 * Render template with variables
 */
async function renderTemplate(
  supabase: any,
  template: string,
  variables: Record<string, string>
): Promise<string> {
  const { data, error } = await supabase.rpc("render_notification_template", {
    template_text: template,
    variables,
  });

  if (error) {
    console.error("[renderTemplate] Error:", error);
    return template;
  }

  return data || template;
}

/**
 * Log notification (helper)
 */
async function logNotification(supabase: any, logData: any) {
  const { error } = await supabase.from("notification_logs").insert(logData);
  if (error) {
    console.error("[logNotification] Error:", error);
  }
}
