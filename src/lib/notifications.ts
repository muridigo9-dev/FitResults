/**
 * Notification System - Centralized notification sending
 * 
 * Provides helpers to send notifications based on events
 * Automatically handles templates, throttling, and dual-channel delivery
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationEventType =
  | "workout_assigned"
  | "diet_assigned"
  | "challenge_created"
  | "challenge_completed"
  | "trainer_message"
  | "academy_invite"
  | "personal_invite"
  | "checkin_reminder"
  | "plan_changed"
  | "achievement_unlocked"
  | "new_content"
  | "support_response"
  | "cancellation_approved"
  | "lgpd_update"
  | "custom";

export interface NotificationVariables {
  [key: string]: string;
}

export interface SendNotificationOptions {
  eventType: NotificationEventType;
  userId: string | string[];
  variables: NotificationVariables;
  metadata?: Record<string, unknown>;
}

export interface SendDirectNotificationOptions {
  userId: string | string[];
  title: string;
  body: string;
  actionUrl?: string;
  channel?: "push" | "in_app" | "both";
  icon?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send event-based notification (uses template)
 */
export async function sendNotification(
  options: SendNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  console.log("[sendNotification] Sending notification:", options);

  try {
    const { data, error } = await supabase.functions.invoke(
      "send-notification",
      {
        body: {
          eventType: options.eventType,
          userId: options.userId,
          variables: options.variables,
          metadata: options.metadata || {},
        },
      }
    );

    if (error) {
      console.error("[sendNotification] Error:", error);
      return { success: false, error: error.message };
    }

    console.log("[sendNotification] Response:", data);
    return { success: true };
  } catch (error) {
    console.error("[sendNotification] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send direct notification (no template)
 */
export async function sendDirectNotification(
  options: SendDirectNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  console.log("[sendDirectNotification] Sending direct:", options);

  try {
    const { data, error } = await supabase.functions.invoke(
      "send-notification",
      {
        body: {
          userId: options.userId,
          title: options.title,
          body: options.body,
          actionUrl: options.actionUrl,
          channel: options.channel || "both",
          icon: options.icon,
          metadata: options.metadata || {},
        },
      }
    );

    if (error) {
      console.error("[sendDirectNotification] Error:", error);
      return { success: false, error: error.message };
    }

    console.log("[sendDirectNotification] Response:", data);
    return { success: true };
  } catch (error) {
    console.error("[sendDirectNotification] Exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// EVENT-SPECIFIC HELPERS
// ============================================

export async function notifyWorkoutAssigned(
  userId: string,
  workoutId: string,
  workoutName: string,
  trainerName: string
) {
  return sendNotification({
    eventType: "workout_assigned",
    userId,
    variables: {
      workout_id: workoutId,
      workout_name: workoutName,
      trainer_name: trainerName,
    },
    metadata: {
      workout_id: workoutId,
    },
  });
}

export async function notifyDietAssigned(
  userId: string,
  dietId: string,
  dietName: string,
  trainerName: string
) {
  return sendNotification({
    eventType: "diet_assigned",
    userId,
    variables: {
      diet_id: dietId,
      diet_name: dietName,
      trainer_name: trainerName,
    },
    metadata: {
      diet_id: dietId,
    },
  });
}

export async function notifyChallengeCreated(
  userIds: string[],
  challengeId: string,
  challengeName: string
) {
  return sendNotification({
    eventType: "challenge_created",
    userId: userIds,
    variables: {
      challenge_id: challengeId,
      challenge_name: challengeName,
    },
    metadata: {
      challenge_id: challengeId,
    },
  });
}

export async function notifyChallengeCompleted(
  userId: string,
  challengeId: string,
  challengeName: string,
  points: number
) {
  return sendNotification({
    eventType: "challenge_completed",
    userId,
    variables: {
      challenge_id: challengeId,
      challenge_name: challengeName,
      points: points.toString(),
    },
    metadata: {
      challenge_id: challengeId,
      points,
    },
  });
}

export async function notifyTrainerMessage(
  userId: string,
  trainerName: string,
  messagePreview: string
) {
  return sendNotification({
    eventType: "trainer_message",
    userId,
    variables: {
      trainer_name: trainerName,
      message_preview: messagePreview,
    },
  });
}

export async function notifyAcademyInvite(
  userId: string,
  academyName: string
) {
  return sendNotification({
    eventType: "academy_invite",
    userId,
    variables: {
      academy_name: academyName,
    },
  });
}

export async function notifyCheckinReminder(userIds: string[]) {
  return sendNotification({
    eventType: "checkin_reminder",
    userId: userIds,
    variables: {},
  });
}

export async function notifyAchievementUnlocked(
  userId: string,
  achievementName: string,
  achievementDescription: string
) {
  return sendNotification({
    eventType: "achievement_unlocked",
    userId,
    variables: {
      achievement_name: achievementName,
      achievement_description: achievementDescription,
    },
  });
}

export async function notifyPlanChanged(
  userId: string,
  oldPlan: string,
  newPlan: string
) {
  return sendNotification({
    eventType: "plan_changed",
    userId,
    variables: {
      old_plan: oldPlan,
      new_plan: newPlan,
    },
  });
}

// ============================================
// IN-APP ONLY HELPERS
// ============================================

/**
 * Create in-app notification directly (bypasses push)
 */
export async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  type: "info" | "success" | "warning" | "error" = "info"
) {
  console.log("[createInAppNotification] Creating:", { userId, title });

  try {
    const { error } = await supabase.from("in_app_notifications").insert({
      user_id: userId,
      title,
      message,
      action_url: actionUrl,
      type,
    });

    if (error) {
      console.error("[createInAppNotification] Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[createInAppNotification] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify user about LGPD request update
 */
export async function notifyLGPDUpdate(
  userId: string,
  requestType: string,
  newStatus: string,
  adminNotes?: string
) {
  return sendNotification({
    eventType: "lgpd_update",
    userId,
    variables: {
      request_type: requestType,
      status: newStatus,
      admin_notes: adminNotes || "",
    },
    metadata: {
      action: "lgpd_update",
      status: newStatus,
    },
  });
}

/**
 * Notify user about support ticket response
 */
export async function notifySupportResponse(
  userId: string,
  ticketId: string,
  subject: string,
  messagePreview: string
) {
  return sendNotification({
    eventType: "support_response",
    userId,
    variables: {
      ticket_id: ticketId,
      subject,
      message_preview: messagePreview,
    },
    metadata: {
      ticket_id: ticketId,
    },
  });
}
