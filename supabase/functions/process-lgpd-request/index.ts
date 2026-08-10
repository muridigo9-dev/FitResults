// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProcessLGPDRequestPayload {
  request_id: string;
  action: "approve" | "deny" | "execute" | "request_info";
  admin_notes?: string;
  denial_reason?: string;
  justification?: string; // Fallback for frontend mismatch
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const payload: ProcessLGPDRequestPayload = await req.json();
    const { request_id, action, admin_notes } = payload;
    const denial_reason = payload.denial_reason || payload.justification;

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: "request_id and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request
    const { data: request, error: fetchError } = await supabaseClient
      .from("lgpd_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    switch (action) {
      case "approve":
        result = await approveRequest(supabaseClient, request, user.id, admin_notes);
        break;
      case "deny":
        result = await denyRequest(supabaseClient, request, user.id, admin_notes, denial_reason);
        break;
      case "request_info":
        result = await requestInfo(supabaseClient, request, user.id, admin_notes);
        break;
      case "execute":
        result = await executeRequest(supabaseClient, request, user.id);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[process-lgpd-request] Global error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function approveRequest(supabase: any, request: any, adminId: string, adminNotes?: string) {
  const { error } = await supabase.rpc("update_lgpd_request_status", {
    _request_id: request.id,
    _new_status: "approved",
    _admin_id: adminId,
    _admin_notes: adminNotes
  });
  if (error) throw error;
  return { status: "approved" };
}

async function denyRequest(supabase: any, request: any, adminId: string, adminNotes?: string, denialReason?: string) {
  if (!denialReason) throw new Error("Justificativa é obrigatória para negar a solicitação");

  const { error } = await supabase.rpc("update_lgpd_request_status", {
    _request_id: request.id,
    _new_status: "denied",
    _admin_id: adminId,
    _admin_notes: adminNotes,
    _denial_reason: denialReason
  });
  if (error) throw error;
  return { status: "denied" };
}

async function requestInfo(supabase: any, request: any, adminId: string, adminNotes?: string) {
  const { error } = await supabase.rpc("update_lgpd_request_status", {
    _request_id: request.id,
    _new_status: "requires_info",
    _admin_id: adminId,
    _admin_notes: adminNotes
  });
  if (error) throw error;
  return { status: "requires_info" };
}

async function executeRequest(supabase: any, request: any, adminId: string) {
  // Check if approved
  if (request.status !== "approved") {
    throw new Error("Solicitação deve estar aprovada antes de ser executada");
  }

  // Implementation of execution logic...
  // For now, call the existing logic or mark as completed
  const { error } = await supabase.from("lgpd_requests").update({
    status: "completed",
    resolved_at: new Date().toISOString(),
    handled_by: adminId
  }).eq("id", request.id);

  if (error) throw error;
  return { status: "completed" };
}
