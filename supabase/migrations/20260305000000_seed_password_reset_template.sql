-- Migration: Seed Missing Password Reset Email Template
-- Target: public.email_templates

INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
SELECT 
    'Recuperação de Senha',
    'password_reset'::public.email_template_type,
    'Redefina sua senha - {{brand_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            {{#if brand_logo_url}}
            <img src="{{brand_logo_url}}" alt="{{brand_name}}" style="max-height: 50px; margin-bottom: 10px;">
            {{else}}
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{brand_name}}</h1>
            {{/if}}
            <h2 style="color: #ffffff; margin: 10px 0 0; font-size: 20px;">Recuperação de Senha</h2>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>{{brand_name}}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{reset_password_url}}" style="display: inline-block; background: linear-gradient(135deg, {{brand_primary_color}} 0%, {{brand_secondary_color}} 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Redefinir minha senha
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Se você não solicitou a alteração da senha, ignore este e-mail. Sua senha permanecerá a mesma.</p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Este link é válido por 24 horas.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #374151; font-size: 16px;">Abraços,<br><strong>Equipe {{brand_name}}</strong></p>
            
            <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px;">Precisa de ajuda? Entre em contato via <a href="mailto:{{support_email}}" style="color: {{brand_primary_color}};">{{support_email}}</a></p>
            </div>
        </div>
    </div>',
    'Olá, recebemos uma solicitação para redefinir sua senha no {{brand_name}}. Clique no link para redefinir: {{reset_password_url}}. Se não foi você, ignore este email.',
    '["brand_name", "brand_logo_url", "brand_primary_color", "brand_secondary_color", "user_email", "reset_password_url", "support_email", "app_url"]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates WHERE type = 'password_reset' AND is_active = true
);
