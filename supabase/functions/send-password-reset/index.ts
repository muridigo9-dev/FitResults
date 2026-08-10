import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirect_url: string;
  is_admin_request?: boolean;
}

interface PasswordResetResponse {
  success: boolean;
  code?: string;
  message: string;
  resend_id?: string;
}

// Rate limit check interval in seconds
const RATE_LIMIT_SECONDS = 60;

/**
 * Edge function para enviar email de reset de senha com template whitelabel
 * 
 * Fluxo:
 * 1. Recebe email do usuário
 * 2. Verifica rate limit interno (para evitar spam)
 * 3. Gera token de reset via Supabase Auth Admin API (bypassa rate limit do Auth)
 * 4. Busca branding ativo do banco
 * 5. Busca template password_reset
 * 6. Renderiza HTML com placeholders
 * 7. Envia via Resend
 * 
 * Tratamento especial para admin:
 * - Admin pode reenviar mesmo dentro do cooldown com aviso
 * - Logs detalhados para debugging
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { email, redirect_url, is_admin_request }: PasswordResetRequest = await req.json();

    if (!email) {
      return createErrorResponse("EMAIL_REQUIRED", "Email é obrigatório", 400);
    }

    // Log the request
    console.log(`[PasswordReset] Request for: ${email}, admin: ${is_admin_request}, time: ${new Date().toISOString()}`);

    // 1. Check if user exists (don't reveal this to client for security)
    const { data: userData } = await supabase.auth.admin.listUsers();
    const targetUser = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      // Return success anyway to prevent email enumeration
      console.log(`[PasswordReset] User not found: ${email} - returning success for security`);
      return createSuccessResponse("Se o email existir, um link de redefinição foi enviado");
    }

    // 2. Check internal rate limit (our own tracking to prevent spam)
    const { data: recentReset } = await supabase
      .from("password_reset_logs")
      .select("created_at")
      .eq("user_email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentReset) {
      const lastResetTime = new Date(recentReset.created_at).getTime();
      const secondsSinceLastReset = Math.floor((Date.now() - lastResetTime) / 1000);
      const remainingSeconds = RATE_LIMIT_SECONDS - secondsSinceLastReset;

      if (remainingSeconds > 0) {
        console.log(`[PasswordReset] Rate limit hit for ${email}. Remaining: ${remainingSeconds}s, admin: ${is_admin_request}`);

        // For admin requests, return a warning but don't block completely
        if (is_admin_request) {
          return new Response(
            JSON.stringify({
              success: false,
              code: "PASSWORD_RESET_RATE_LIMIT",
              message: `Email de redefinição foi enviado recentemente. Aguarde ${remainingSeconds} segundos antes de reenviar.`,
              remaining_seconds: remainingSeconds,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // For regular users, return rate limit response
        return new Response(
          JSON.stringify({
            success: false,
            code: "PASSWORD_RESET_RATE_LIMIT",
            message: `O email de redefinição foi solicitado recentemente. Tente novamente em ${remainingSeconds} segundos.`,
            remaining_seconds: remainingSeconds,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 3. Generate password reset link using Admin API (bypasses Auth rate limit)
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirect_url,
      },
    });

    if (resetError) {
      console.error(`[PasswordReset] Error generating link for ${email}:`, resetError);

      // Check if it's a rate limit error from Supabase Auth
      if (resetError.message?.includes("security purposes") || resetError.message?.includes("seconds")) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "PASSWORD_RESET_RATE_LIMIT",
            message: "O sistema está processando muitas solicitações. Tente novamente em alguns segundos.",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return createErrorResponse("LINK_GENERATION_FAILED", "Não foi possível gerar o link de redefinição", 500);
    }

    const resetUrl = resetData.properties.action_link;

    // 4. Get email settings
    const { data: emailSettings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .single();

    // Log the reset attempt before sending email
    await supabase.from("password_reset_logs").insert({
      user_email: email.toLowerCase(),
      user_id: targetUser.id,
      requested_by_admin: is_admin_request || false,
      status: "pending",
    });

    if (settingsError || !emailSettings?.api_key_encrypted) {
      console.log(`[PasswordReset] Email settings not configured.`);

      // Update log status
      await supabase
        .from("password_reset_logs")
        .update({ status: "failed_no_provider" })
        .eq("user_email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1);

      // Return a specific custom error
      return new Response(
        JSON.stringify({
          success: false,
          code: "RESEND_NOT_CONFIGURED",
          message: "Serviço de email não configurado. Vá em Admin > Configurações > Email para configurar o Resend."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Get branding
    const { data: branding } = await supabase.rpc("get_email_branding");
    const brandData = branding?.[0] || {
      brand_name: "App",
      brand_logo_url: "",
      brand_primary_color: "#10b981",
      brand_secondary_color: "#059669",
      support_email: "suporte@app.com",
      app_url: redirect_url.split("/reset-password")[0],
    };

    // 5. Get password_reset template
    const { data: templateData } = await supabase.rpc("get_email_template", {
      template_type: "password_reset",
    });

    const template = templateData?.[0] || {
      id: null,
      subject: "Redefinição de Senha - {{brand_name}}",
      body_html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Redefinição de Senha</h2>
          <p>Olá, você solicitou a redefinição de sua senha no {{brand_name}}.</p>
          <div style="margin: 20px 0;">
            <a href="{{reset_password_url}}" style="background: {{brand_primary_color}}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Redefinir Minha Senha
            </a>
          </div>
          <p>Se você não solicitou isso, pode ignorar este email.</p>
        </div>
      `,
      body_text: "Olá, para redefinir sua senha no {{brand_name}}, acesse: {{reset_password_url}}"
    };

    // 6. Replace placeholders
    const variables: Record<string, string> = {
      brand_name: brandData.brand_name,
      brand_logo_url: brandData.brand_logo_url || "",
      brand_primary_color: brandData.brand_primary_color,
      brand_secondary_color: brandData.brand_secondary_color,
      user_email: email,
      reset_password_url: resetUrl,
      support_email: brandData.support_email,
      app_url: brandData.app_url,
    };

    let emailHtml = template.body_html;
    let emailText = template.body_text || "";
    let emailSubject = template.subject;

    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      emailHtml = emailHtml.replace(regex, value);
      emailText = emailText.replace(regex, value);
      emailSubject = emailSubject.replace(regex, value);
    });

    // Handle conditional logo (simple if/else for handlebars-like syntax)
    if (brandData.brand_logo_url) {
      emailHtml = emailHtml.replace(/{{#if brand_logo_url}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g, "$1");
    } else {
      emailHtml = emailHtml.replace(/{{#if brand_logo_url}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g, "$1");
    }

    // 7. Send via Resend
    const fromAddress = `${emailSettings.sender_name} <${emailSettings.sender_email}>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${emailSettings.api_key_encrypted}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend error:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const resendData = await resendResponse.json();

    // 8. Log the email
    await supabase.from("email_logs").insert({
      user_email: email,
      template_id: template.id,
      template_type: "password_reset",
      subject: emailSubject,
      status: "sent",
      resend_id: resendData.id,
      metadata: { variables },
    });

    // Update password reset log status
    await supabase
      .from("password_reset_logs")
      .update({ status: "sent", resend_id: resendData.id })
      .eq("user_email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1);

    const duration = Date.now() - startTime;
    console.log(`[PasswordReset] Success for ${email}. Resend ID: ${resendData.id}. Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        code: "PASSWORD_RESET_SENT",
        message: "Email de redefinição de senha enviado com sucesso",
        resend_id: resendData.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[PasswordReset] Unexpected error:", error);

    // Check for rate limit errors from Supabase Auth
    if (error.message?.includes("security purposes") || error.message?.includes("seconds")) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "PASSWORD_RESET_RATE_LIMIT",
          message: "O email de redefinição foi solicitado recentemente. Tente novamente em alguns segundos.",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        code: "INTERNAL_ERROR",
        message: `Erro interno: ${error.message || "Erro desconhecido"}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper functions
function createSuccessResponse(message: string, resendId?: string): Response {
  return new Response(
    JSON.stringify({
      success: true,
      code: "PASSWORD_RESET_SENT",
      message,
      resend_id: resendId,
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function createErrorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      code,
      message,
    }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

serve(handler);
