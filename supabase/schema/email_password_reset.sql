-- ================================================
-- PASSWORD RESET EMAIL TEMPLATE (WHITELABEL)
-- Template profissional com suporte a branding dinâmico
-- ================================================

-- Adicionar campos extras em brand_settings se não existirem
DO $$ 
BEGIN
    -- support_email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'support_email'
    ) THEN
        ALTER TABLE public.brand_settings ADD COLUMN support_email text;
    END IF;

    -- app_url  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'app_url'
    ) THEN
        ALTER TABLE public.brand_settings ADD COLUMN app_url text;
    END IF;

    -- tagline
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'tagline'
    ) THEN
        ALTER TABLE public.brand_settings ADD COLUMN tagline text;
    END IF;
END $$;

-- ==========================================
-- TEMPLATE: PASSWORD RESET (WHITELABEL)
-- ==========================================
-- Remove template antigo se existir
DELETE FROM public.email_templates WHERE type = 'password_reset';

INSERT INTO public.email_templates (
    name, 
    type, 
    subject, 
    body_html, 
    body_text, 
    variables, 
    is_active
)
VALUES (
    'Redefinir Senha',
    'password_reset',
    'Redefinir sua senha - {{brand_name}}',
    '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                    
                    <!-- Logo Header -->
                    <tr>
                        <td align="center" style="padding: 30px 40px; background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); border-radius: 16px 16px 0 0;">
                            {{#if brand_logo_url}}
                            <img src="{{brand_logo_url}}" alt="{{brand_name}}" style="max-height: 60px; max-width: 200px; margin-bottom: 16px;">
                            {{else}}
                            <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; margin-bottom: 16px; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 28px; color: #ffffff;">🔐</span>
                            </div>
                            {{/if}}
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                Redefinir sua senha
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="background: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Olá,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Recebemos uma solicitação para redefinir a senha da sua conta <strong>{{user_email}}</strong> no <strong>{{brand_name}}</strong>.
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Clique no botão abaixo para criar uma nova senha:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{{reset_password_url}}" style="display: inline-block; background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
                                            🔑 Criar nova senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                                            <strong>⚠️ Importante:</strong><br>
                                            Este link expira em <strong>1 hora</strong>. Se você não solicitou esta alteração, ignore este email e sua senha permanecerá a mesma.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">
                                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                            </p>
                            <p style="color: {{brand_primary_color}}; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 0 0 30px;">
                                {{reset_password_url}}
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                            
                            <!-- Footer -->
                            <p style="color: #374151; font-size: 14px; margin: 0;">
                                Atenciosamente,<br>
                                <strong>Equipe {{brand_name}}</strong>
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer Info -->
                    <tr>
                        <td align="center" style="padding: 30px 40px;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px;">
                                Este email foi enviado para {{user_email}}.
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px;">
                                Precisa de ajuda? Entre em contato: <a href="mailto:{{support_email}}" style="color: {{brand_primary_color}}; text-decoration: none;">{{support_email}}</a>
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                {{brand_name}} • <a href="{{app_url}}" style="color: {{brand_primary_color}}; text-decoration: none;">{{app_url}}</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    'Olá,

Recebemos uma solicitação para redefinir a senha da sua conta {{user_email}} no {{brand_name}}.

Para criar uma nova senha, acesse o link abaixo:
{{reset_password_url}}

IMPORTANTE: Este link expira em 1 hora. Se você não solicitou esta alteração, ignore este email.

Atenciosamente,
Equipe {{brand_name}}

---
Precisa de ajuda? {{support_email}}
{{brand_name}} - {{app_url}}',
    '["brand_name", "brand_logo_url", "brand_primary_color", "brand_secondary_color", "user_email", "reset_password_url", "support_email", "app_url"]'::jsonb,
    true
);

-- ==========================================
-- FUNÇÃO: Buscar branding para emails
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_email_branding()
RETURNS TABLE (
    brand_name text,
    brand_logo_url text,
    brand_primary_color text,
    brand_secondary_color text,
    support_email text,
    app_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(app_name, 'App') as brand_name,
        logo_url as brand_logo_url,
        COALESCE(primary_color, '#10b981') as brand_primary_color,
        COALESCE(secondary_color, '#059669') as brand_secondary_color,
        COALESCE(support_email, 'suporte@app.com') as support_email,
        COALESCE(app_url, 'https://app.com') as app_url
    FROM public.brand_settings
    LIMIT 1;
$$;
