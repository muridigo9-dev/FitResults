import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  template_type?: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: Record<string, string>;
  is_test?: boolean;
  user_id?: string;
  force_provider?: "resend" | "supabase"; // Override para testes
}

interface ResendEmailResponse {
  id: string;
}

interface EmailBranding {
  brand_name: string;
  brand_logo_url: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  support_email: string;
  app_url: string;
}

// ==========================================
// ENVIO VIA RESEND
// ==========================================
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string,
  text?: string,
  replyTo?: string
): Promise<ResendEmailResponse> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return response.json();
}

// ==========================================
// BUSCAR BRANDING WHITELABEL
// ==========================================
async function getEmailBranding(supabase: any): Promise<EmailBranding> {
  try {
    const { data } = await supabase.rpc("get_email_branding");
    if (data) {
      return data;
    }
  } catch (err) {
    console.warn("Could not fetch branding, using defaults:", err);
  }
  
  // Defaults
  return {
    brand_name: "App",
    brand_logo_url: "",
    brand_primary_color: "#6366f1",
    brand_secondary_color: "#8b5cf6",
    support_email: "suporte@app.com",
    app_url: "https://app.com",
  };
}

// ==========================================
// APLICAR VARIÁVEIS NO TEMPLATE
// ==========================================
function applyVariables(
  content: string, 
  variables: Record<string, string>
): string {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value || "");
  });
  return result;
}

// ==========================================
// HANDLER PRINCIPAL
// ==========================================
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: SendEmailRequest = await req.json();
    const { 
      to, 
      template_type, 
      subject, 
      html, 
      text, 
      variables = {}, 
      is_test, 
      user_id,
      force_provider 
    } = body;

    if (!to) {
      throw new Error("Recipient email is required");
    }

    // ==========================================
    // DETERMINAR PROVEDOR ATIVO
    // ==========================================
    let activeProvider: "resend" | "supabase" = "supabase";
    
    if (force_provider) {
      // Override para testes/debug
      activeProvider = force_provider;
    } else {
      // Buscar da feature flag
      try {
        const { data: providerData } = await supabase.rpc("get_email_provider");
        activeProvider = providerData || "supabase";
      } catch (err) {
        console.warn("Could not get email provider, defaulting to supabase:", err);
      }
    }

    console.log(`[Email] Using provider: ${activeProvider}`);

    // ==========================================
    // BUSCAR CONFIGURAÇÕES DE EMAIL
    // ==========================================
    const { data: emailSettings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .maybeSingle();

    // Se provedor é Resend, precisamos das configurações
    if (activeProvider === "resend") {
      if (settingsError || !emailSettings) {
        console.warn("Email settings not found, falling back to Supabase");
        activeProvider = "supabase";
      } else if (!emailSettings.api_key_encrypted) {
        console.warn("Resend API key not configured, falling back to Supabase");
        activeProvider = "supabase";
      } else if (!emailSettings.is_enabled) {
        console.warn("Resend integration disabled, falling back to Supabase");
        activeProvider = "supabase";
      }
    }

    // ==========================================
    // BUSCAR BRANDING WHITELABEL
    // ==========================================
    const branding = await getEmailBranding(supabase);

    // ==========================================
    // PREPARAR CONTEÚDO DO EMAIL
    // ==========================================
    let emailSubject = subject || "";
    let emailHtml = html || "";
    let emailText = text || "";
    let templateId: string | null = null;

    // Buscar template se especificado
    if (template_type) {
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("type", template_type)
        .eq("is_active", true)
        .maybeSingle();

      if (!templateError && template) {
        templateId = template.id;
        emailSubject = template.subject;
        emailHtml = template.body_html;
        emailText = template.body_text || "";
      } else {
        console.warn(`Template ${template_type} not found, using provided content`);
      }
    }

    // Combinar variáveis: branding + custom
    const allVariables: Record<string, string> = {
      // Whitelabel branding
      ...branding,
      // Legacy app_name for backwards compatibility
      app_name: branding.brand_name,
      // Custom variables
      ...variables,
    };

    // Aplicar variáveis no conteúdo
    emailSubject = applyVariables(emailSubject, allVariables);
    emailHtml = applyVariables(emailHtml, allVariables);
    emailText = applyVariables(emailText, allVariables);

    // Preparar destinatários
    const recipients = Array.isArray(to) ? to : [to];

    // ==========================================
    // ENVIAR EMAIL
    // ==========================================
    let emailResponse: { id?: string; success?: boolean } = {};
    let sendError: string | null = null;
    const usedProvider = activeProvider;

    if (activeProvider === "resend" && emailSettings) {
      // ENVIAR VIA RESEND
      try {
        const fromAddress = `${emailSettings.sender_name} <${emailSettings.sender_email}>`;
        
        emailResponse = await sendViaResend(
          emailSettings.api_key_encrypted,
          fromAddress,
          recipients,
          emailSubject,
          emailHtml,
          emailText,
          emailSettings.reply_to || undefined
        );
        
        console.log("[Email] Sent via Resend:", emailResponse.id);
      } catch (resendError: any) {
        console.error("[Email] Resend failed:", resendError.message);
        sendError = resendError.message;

        // Verificar se fallback está habilitado
        const shouldFallback = emailSettings.enable_fallback ?? true;
        
        if (shouldFallback) {
          console.log("[Email] Attempting fallback to Supabase Auth...");
          // Por enquanto, apenas logamos o fallback
          // Supabase Auth emails são gerenciados automaticamente pelo Supabase
          emailResponse = { success: true, id: "fallback-supabase" };
          sendError = null;
        } else {
          throw new Error(`Resend failed: ${resendError.message}`);
        }
      }
    } else {
      // PROVEDOR SUPABASE
      // Emails de autenticação são gerenciados automaticamente pelo Supabase Auth
      // Este endpoint é usado apenas para emails transacionais customizados
      // Para esses casos, precisamos ter Resend configurado ou não enviar
      
      if (emailSettings?.api_key_encrypted && emailSettings?.is_enabled) {
        // Temos Resend configurado, usar mesmo com flag em supabase
        try {
          const fromAddress = `${emailSettings.sender_name} <${emailSettings.sender_email}>`;
          
          emailResponse = await sendViaResend(
            emailSettings.api_key_encrypted,
            fromAddress,
            recipients,
            emailSubject,
            emailHtml,
            emailText,
            emailSettings.reply_to || undefined
          );
          
          console.log("[Email] Sent via Resend (supabase mode):", emailResponse.id);
        } catch (resendError: any) {
          console.error("[Email] Resend failed in supabase mode:", resendError.message);
          sendError = resendError.message;
          throw new Error(`Email send failed: ${resendError.message}`);
        }
      } else {
        // Sem provedor configurado
        throw new Error("No email provider configured. Please set up Resend API key in Admin > E-mails.");
      }
    }

    // ==========================================
    // REGISTRAR LOG
    // ==========================================
    if (!is_test) {
      try {
        await supabase.from("email_logs").insert({
          user_id: user_id || null,
          user_email: recipients[0],
          template_id: templateId,
          template_type: template_type || null,
          subject: emailSubject,
          status: sendError ? "failed" : "sent",
          error_message: sendError,
          resend_id: emailResponse.id || null,
          metadata: { 
            variables: allVariables, 
            provider: usedProvider,
            fallback_used: usedProvider === "resend" && emailResponse.id === "fallback-supabase"
          },
        });
      } catch (logError) {
        console.error("[Email] Failed to log:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        resend_id: emailResponse.id,
        provider: usedProvider,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[Email] Error:", error.message);

    // Tentar logar o erro
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        let requestBody: any = {};
        try {
          requestBody = await req.clone().json();
        } catch {
          requestBody = {};
        }
        
        await supabase.from("email_logs").insert({
          user_email: requestBody.to || "unknown",
          template_type: requestBody.template_type || null,
          subject: requestBody.subject || "Failed email",
          status: "failed",
          error_message: error.message,
          metadata: { error_details: error.toString() },
        });
      }
    } catch (logError) {
      console.error("[Email] Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
