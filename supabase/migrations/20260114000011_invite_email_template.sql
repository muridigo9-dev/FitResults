-- =====================================================
-- Migration: Invite Email Template
-- Description: Template de email para convites de academias/trainers
-- =====================================================

-- Deletar template anterior se existir para garantir idempotência
DELETE FROM public.email_templates WHERE name = 'Convite para Organização';

-- Inserir template de convite
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, is_active)
VALUES (
  'Convite para Organização',
  'invite',
  '{{inviter_name}} convidou você para {{context_name}}',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você foi convidado!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header com logo -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              {{#if brand_logo_url}}
                <img src="{{brand_logo_url}}" alt="{{brand_name}}" style="max-width: 200px; height: auto;">
              {{else}}
                <h1 style="margin: 0; color: {{brand_primary_color}};">{{brand_name}}</h1>
              {{/if}}
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: bold;">
                🎉 Você foi convidado!
              </h2>
              
              <p style="margin: 0 0 16px; color: #666666; font-size: 16px; line-height: 1.5;">
                <strong>{{inviter_name}}</strong> convidou você para fazer parte de <strong>{{context_name}}</strong> como <strong>{{role_label}}</strong>.
              </p>

              {{#if custom_message}}
                <div style="margin: 20px 0; padding: 16px; background-color: #f8f9fa; border-left: 4px solid {{brand_primary_color}}; border-radius: 4px;">
                  <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.5; font-style: italic;">
                    "{{custom_message}}"
                  </p>
                </div>
              {{/if}}

              <!-- Informações do convite -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666666; font-size: 14px;">👤 Convidado por:</span>
                      <strong style="color: #333333; font-size: 14px; display: block; margin-top: 4px;">{{inviter_name}}</strong>
                    </td>
                  </tr>
                  {{#if context_name}}
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666666; font-size: 14px;">🏢 Organização:</span>
                      <strong style="color: #333333; font-size: 14px; display: block; margin-top: 4px;">{{context_name}}</strong>
                    </td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666666; font-size: 14px;">🎭 Função:</span>
                      <strong style="color: #333333; font-size: 14px; display: block; margin-top: 4px;">{{role_label}}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666666; font-size: 14px;">⏰ Válido até:</span>
                      <strong style="color: #333333; font-size: 14px; display: block; margin-top: 4px;">{{expires_at}}</strong>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Botão de aceitar -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{accept_url}}" style="display: inline-block; padding: 16px 40px; background-color: {{brand_primary_color}}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link alternativo -->
              <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.5; text-align: center;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="{{accept_url}}" style="color: {{brand_primary_color}}; word-break: break-all;">{{accept_url}}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 12px; line-height: 1.5;">
                Este convite expira em 7 dias. Se você não esperava este email ou não deseja aceitar, pode ignorá-lo com segurança.
              </p>
              <p style="margin: 8px 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
                Dúvidas? Entre em contato: <a href="mailto:{{support_email}}" style="color: {{brand_primary_color}};">{{support_email}}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Olá!

{{inviter_name}} convidou você para fazer parte de {{context_name}} como {{role_label}}.

{{#if custom_message}}
Mensagem pessoal:
"{{custom_message}}"
{{/if}}

Detalhes do convite:
- Convidado por: {{inviter_name}}
- Organização: {{context_name}}
- Função: {{role_label}}
- Válido até: {{expires_at}}

Para aceitar este convite, acesse o link abaixo:
{{accept_url}}

Este convite expira em 7 dias. Se você não esperava este email ou não deseja aceitar, pode ignorá-lo com segurança.

Dúvidas? Entre em contato: {{support_email}}

---
{{brand_name}}
{{app_url}}',
  true
);

-- Adicionar variáveis do template na documentação
COMMENT ON TABLE public.email_templates IS 'Templates de email. Template "invite" usa: inviter_name, context_name, role_label, custom_message, accept_url, expires_at, support_email, brand_name, brand_logo_url, brand_primary_color, app_url';
