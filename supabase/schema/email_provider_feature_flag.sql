-- ================================================
-- EMAIL PROVIDER FEATURE FLAG
-- Permite alternar entre Supabase SMTP e Resend
-- ================================================

-- ==========================================
-- 1. ADICIONAR FEATURE FLAG email_provider
-- ==========================================
INSERT INTO public.feature_flags (
    key,
    description,
    enabled,
    allow_user_content,
    affects
)
VALUES (
    'email_provider',
    'Controla qual provedor de email será usado: supabase (padrão) ou resend. Quando ativo (enabled=true), usa Resend. Quando desativado, usa SMTP nativo do Supabase.',
    false, -- Por padrão, começa com Supabase (disabled = supabase)
    false,
    '["email", "auth", "notifications"]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description,
    affects = EXCLUDED.affects,
    updated_at = now();

-- ==========================================
-- 2. ADICIONAR COLUNAS PARA FALLBACK E DOMÍNIO
-- ==========================================
DO $$ 
BEGIN
    -- Adicionar coluna para habilitar fallback automático
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_settings' 
        AND column_name = 'enable_fallback'
    ) THEN
        ALTER TABLE public.email_settings ADD COLUMN enable_fallback boolean NOT NULL DEFAULT true;
    END IF;

    -- Adicionar coluna para domínio verificado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_settings' 
        AND column_name = 'verified_domain'
    ) THEN
        ALTER TABLE public.email_settings ADD COLUMN verified_domain text;
    END IF;

    -- Adicionar coluna para reply-to
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_settings' 
        AND column_name = 'reply_to'
    ) THEN
        ALTER TABLE public.email_settings ADD COLUMN reply_to text;
    END IF;

    -- Adicionar coluna para última verificação de status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_settings' 
        AND column_name = 'last_status_check'
    ) THEN
        ALTER TABLE public.email_settings ADD COLUMN last_status_check timestamptz;
    END IF;

    -- Adicionar coluna para status da conexão
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_settings' 
        AND column_name = 'connection_status'
    ) THEN
        ALTER TABLE public.email_settings ADD COLUMN connection_status text DEFAULT 'unknown';
    END IF;
END $$;

-- ==========================================
-- 3. ADICIONAR ENUM PARA AUTH CONFIRMATION
-- ==========================================
DO $$ BEGIN
    ALTER TYPE public.email_template_type ADD VALUE IF NOT EXISTS 'auth_confirmation';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 4. ADICIONAR TEMPLATES WHITELABEL FALTANTES
-- ==========================================

-- Template: Auth Confirmation (Confirmação de Email)
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables, is_active)
VALUES (
    'Confirmação de E-mail',
    'auth_confirmation',
    'Confirme seu e-mail - {{brand_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu E-mail</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="{{brand_logo_url}}" alt="{{brand_name}}" style="max-width: 180px; height: auto;">
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">
                                📧 Confirme seu E-mail
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                            <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                                Olá, <strong>{{user_name}}</strong>!
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                                Você está quase lá! Clique no botão abaixo para confirmar seu e-mail e ativar sua conta no <strong>{{brand_name}}</strong>.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{{confirmation_url}}" style="display: inline-block; background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                            ✅ Confirmar meu e-mail
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 15px;">
                                Ou copie e cole este link no navegador:
                            </p>
                            <p style="color: {{brand_primary_color}}; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 0 0 30px;">
                                {{confirmation_url}}
                            </p>
                            
                            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                                ⏰ Este link expira em <strong>24 horas</strong>.
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                            
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                Se você não criou uma conta, ignore este e-mail.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 30px 20px;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © {{brand_name}} • <a href="{{app_url}}" style="color: {{brand_primary_color}}; text-decoration: none;">{{app_url}}</a>
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">
                                Precisa de ajuda? <a href="mailto:{{support_email}}" style="color: {{brand_primary_color}}; text-decoration: none;">{{support_email}}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    'Olá {{user_name}}, confirme seu e-mail clicando neste link: {{confirmation_url}}. Este link expira em 24 horas.',
    '["user_name", "user_email", "brand_name", "brand_logo_url", "brand_primary_color", "brand_secondary_color", "confirmation_url", "app_url", "support_email"]'::jsonb,
    true
)
ON CONFLICT (type, is_active) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    variables = EXCLUDED.variables,
    updated_at = now();

-- ==========================================
-- 5. ATUALIZAR TEMPLATES EXISTENTES COM BRANDING
-- ==========================================

-- Atualizar Welcome template para usar brand_name
UPDATE public.email_templates 
SET 
    subject = 'Bem-vindo(a) ao {{brand_name}}! Defina sua senha para acessar',
    body_html = REPLACE(body_html, '{{app_name}}', '{{brand_name}}'),
    body_text = REPLACE(body_text, '{{app_name}}', '{{brand_name}}'),
    updated_at = now()
WHERE type = 'welcome' AND is_active = true
AND body_html NOT LIKE '%{{brand_name}}%';

-- ==========================================
-- 6. FUNÇÃO PARA OBTER PROVEDOR ATIVO
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_email_provider()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    provider_flag boolean;
BEGIN
    -- Buscar status da feature flag email_provider
    SELECT enabled INTO provider_flag
    FROM public.feature_flags
    WHERE key = 'email_provider';
    
    -- Se flag enabled = true, usa Resend
    -- Se flag enabled = false ou não existe, usa Supabase
    IF provider_flag = true THEN
        RETURN 'resend';
    ELSE
        RETURN 'supabase';
    END IF;
END;
$$;

-- ==========================================
-- 7. FUNÇÃO PARA VERIFICAR FALLBACK
-- ==========================================
CREATE OR REPLACE FUNCTION public.should_use_email_fallback()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(enable_fallback, true)
    FROM public.email_settings
    LIMIT 1;
$$;

-- ==========================================
-- 8. VIEW PARA STATUS COMPLETO DO EMAIL
-- ==========================================
CREATE OR REPLACE VIEW public.email_system_status AS
SELECT 
    es.id,
    es.sender_name,
    es.sender_email,
    es.is_enabled,
    es.enable_fallback,
    es.verified_domain,
    es.reply_to,
    es.connection_status,
    es.last_status_check,
    CASE WHEN es.api_key_encrypted IS NOT NULL THEN true ELSE false END as has_api_key,
    public.get_email_provider() as active_provider,
    (SELECT enabled FROM public.feature_flags WHERE key = 'email_provider') as resend_flag_enabled
FROM public.email_settings es
LIMIT 1;

-- Grant access to authenticated users (will be filtered by RLS)
GRANT SELECT ON public.email_system_status TO authenticated;

-- ==========================================
-- 9. COMENTÁRIOS
-- ==========================================
COMMENT ON FUNCTION public.get_email_provider() IS 'Retorna o provedor de email ativo: supabase ou resend';
COMMENT ON FUNCTION public.should_use_email_fallback() IS 'Verifica se o fallback automático está habilitado';
COMMENT ON VIEW public.email_system_status IS 'Status completo do sistema de email';
