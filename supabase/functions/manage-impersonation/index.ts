/**
 * Manage Impersonation Edge Function
 * 
 * Gerencia sessões de impersonação de usuários para SUPER ADMIN
 * Compatível com LGPD e boas práticas de compliance
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StartImpersonationRequest {
  targetUserId: string;
  reason?: string;
}

interface EndImpersonationRequest {
  sessionToken: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is SUPER ADMIN
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only SUPER ADMIN can manage impersonation" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get client IP and User-Agent
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // START IMPERSONATION
    if (action === "start" && req.method === "POST") {
      const body: StartImpersonationRequest = await req.json();

      if (!body.targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call start_impersonation function
      const { data, error } = await supabaseClient.rpc("start_impersonation", {
        p_admin_id: user.id,
        p_target_user_id: body.targetUserId,
        p_reason: body.reason || null,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
      });

      if (error) {
        console.error("Error starting impersonation:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const impersonationData = data[0];

      return new Response(
        JSON.stringify({
          success: true,
          sessionToken: impersonationData.session_token,
          impersonationId: impersonationData.impersonation_id,
          targetUser: {
            email: impersonationData.target_user_email,
            role: impersonationData.target_user_role,
          },
          expiresAt: impersonationData.expires_at,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // END IMPERSONATION
    if (action === "end" && req.method === "POST") {
      const body: EndImpersonationRequest = await req.json();

      if (!body.sessionToken) {
        return new Response(
          JSON.stringify({ error: "sessionToken is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call end_impersonation function
      const { data, error } = await supabaseClient.rpc("end_impersonation", {
        p_session_token: body.sessionToken,
      });

      if (error) {
        console.error("Error ending impersonation:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // VALIDATE SESSION
    if (action === "validate" && req.method === "GET") {
      const sessionToken = url.searchParams.get("sessionToken");

      if (!sessionToken) {
        return new Response(
          JSON.stringify({ error: "sessionToken is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call validate_impersonation_session function
      const { data, error } = await supabaseClient.rpc(
        "validate_impersonation_session",
        {
          p_session_token: sessionToken,
        }
      );

      if (error) {
        console.error("Error validating session:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const sessionData = data[0];

      return new Response(
        JSON.stringify({
          isValid: sessionData.is_valid,
          adminId: sessionData.admin_id,
          impersonatedUserId: sessionData.impersonated_user_id,
          startedAt: sessionData.started_at,
          expiresAt: sessionData.expires_at,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET LOGS
    if (action === "logs" && req.method === "GET") {
      const { data, error } = await supabaseClient
        .from("admin_impersonation_logs")
        .select(
          `
          *,
          admin:admin_id(email, profiles(full_name)),
          impersonated:impersonated_user_id(email, profiles(full_name))
        `
        )
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching logs:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ logs: data }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET STATS
    if (action === "stats" && req.method === "GET") {
      const { data, error } = await supabaseClient.rpc(
        "get_impersonation_stats"
      );

      if (error) {
        console.error("Error fetching stats:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ stats: data[0] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or method" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
