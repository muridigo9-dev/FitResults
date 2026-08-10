-- ================================================
-- STUDENT INVITE EMAIL TEMPLATE
-- Insert the template (enum value was added in previous migration)
-- ================================================

INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables, is_active)
SELECT
    'Convite de Aluno',
    'student_invite'::public.email_template_type,
    '{{trainer_name}} convidou você para ser aluno(a)!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite de Treinador</title>
  <style>
    body { font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px; }
    .content { padding: 32px; }
    .trainer-box { background-color: #f9fafb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .trainer-avatar { width: 64px; height: 64px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: white; font-size: 24px; font-weight: bold; line-height: 64px; }
    .trainer-name { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
    .message-box { background-color: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .message-box p { margin: 0; color: #6b21a8; font-style: italic; }
    .benefits { margin-bottom: 24px; }
    .benefit { padding: 8px 0; color: #4b5563; }
    .benefit-icon { display: inline-block; width: 20px; height: 20px; background-color: #10b981; border-radius: 50%; margin-right: 12px; color: white; font-size: 12px; text-align: center; line-height: 20px; }
    .cta-button { display: block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🏋️ Convite de Treinador</h1>
        <p>Você foi convidado para um acompanhamento personalizado</p>
      </div>
      <div class="content">
        <div class="trainer-box">
          <div class="trainer-avatar">{{trainer_initial}}</div>
          <p class="trainer-name">{{trainer_name}}</p>
        </div>
        <div class="message-box">
          <p>"{{invite_message}}"</p>
        </div>
        <div class="benefits">
          <div class="benefit">
            <span class="benefit-icon">✓</span>
            Treinos personalizados para seus objetivos
          </div>
          <div class="benefit">
            <span class="benefit-icon">✓</span>
            Dietas sob medida para sua rotina
          </div>
          <div class="benefit">
            <span class="benefit-icon">✓</span>
            Acompanhamento contínuo do seu progresso
          </div>
        </div>
        <a href="{{invite_url}}" class="cta-button">Aceitar Convite</a>
        <p style="text-align: center; color: #6b7280; font-size: 14px;">Este convite expira em 7 dias.</p>
      </div>
      <div class="footer">
        <p>Se você não esperava este convite, pode ignorar este email.</p>
      </div>
    </div>
  </div>
</body>
</html>',
    'Olá!

{{trainer_name}} convidou você para ser aluno(a) e começar um acompanhamento personalizado.

Benefícios:
- Treinos personalizados para seus objetivos
- Dietas sob medida para sua rotina
- Acompanhamento contínuo do seu progresso

Mensagem do treinador: "{{invite_message}}"

Para aceitar o convite, acesse o link:
{{invite_url}}

Este convite expira em 7 dias.

Se você não esperava este convite, pode ignorar este email.',
    '["trainer_name", "trainer_initial", "invite_message", "invite_url", "student_email"]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates 
    WHERE type = 'student_invite'::public.email_template_type AND is_active = true
);
