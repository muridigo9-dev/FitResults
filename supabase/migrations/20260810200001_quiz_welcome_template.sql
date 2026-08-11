-- The credentials email a quiz buyer receives, in the three languages the funnel
-- sells in.
--
-- Separate from 20260810200000 because that migration runs
-- `alter type ... add value 'quiz_welcome_credentials'`, and Postgres refuses to
-- *use* a new enum value in the same transaction that added it.
--
-- Why credentials and not an invite link: an invite link expires. Someone who
-- buys on Friday, opens the email on Monday, and finds a dead link has paid for
-- a product they cannot reach — and the support ticket costs more than the sale.
-- A temporary password plus a forced change on first login survives the delay.

do $$
declare
  body_es text;
  body_pt text;
  body_en text;
begin
  body_es := $html$
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">¡Bienvenida, {{name}}!</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Tu pago se ha confirmado y tu cuenta ya está lista. Estos son tus datos de acceso:</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Correo</p>
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: bold;">{{email}}</p>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Contraseña temporal</p>
      <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">{{temp_password}}</p>
    </div>
    <p style="text-align: center; margin: 28px 0;">
      <a href="{{login_url}}" style="background: #667eea; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Entrar ahora</a>
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Por seguridad, te pediremos que cambies esta contraseña la primera vez que entres.</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">¿Necesitas ayuda? Escríbenos a {{support_email}}.</p>
  </div>
</div>
$html$;

  body_pt := $html$
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Bem-vindo(a), {{name}}!</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Seu pagamento foi confirmado e sua conta já está pronta. Estes são seus dados de acesso:</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">E-mail</p>
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: bold;">{{email}}</p>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Senha temporária</p>
      <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">{{temp_password}}</p>
    </div>
    <p style="text-align: center; margin: 28px 0;">
      <a href="{{login_url}}" style="background: #667eea; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Entrar agora</a>
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Por segurança, vamos pedir que você troque esta senha no primeiro acesso.</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Precisa de ajuda? Escreva para {{support_email}}.</p>
  </div>
</div>
$html$;

  body_en := $html$
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome, {{name}}!</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your payment is confirmed and your account is ready. Here are your sign-in details:</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Email</p>
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: bold;">{{email}}</p>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Temporary password</p>
      <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">{{temp_password}}</p>
    </div>
    <p style="text-align: center; margin: 28px 0;">
      <a href="{{login_url}}" style="background: #667eea; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Sign in now</a>
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">For your security, we'll ask you to change this password the first time you sign in.</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Need help? Write to {{support_email}}.</p>
  </div>
</div>
$html$;

  insert into public.email_templates (name, type, locale, subject, body_html, body_text, variables, is_active, version)
  values
    ('Credenciales de acceso (quiz)', 'quiz_welcome_credentials', 'es-ES',
     'Tu acceso a {{brand_name}} — {{email}}', body_es,
     E'¡Bienvenida, {{name}}!\n\nCorreo: {{email}}\nContraseña temporal: {{temp_password}}\n\nEntra en {{login_url}} — te pediremos cambiar la contraseña la primera vez.',
     '["name","email","temp_password","login_url","brand_name","support_email"]'::jsonb, true, 1),
    ('Credenciais de acesso (quiz)', 'quiz_welcome_credentials', 'pt-BR',
     'Seu acesso ao {{brand_name}} — {{email}}', body_pt,
     E'Bem-vindo(a), {{name}}!\n\nE-mail: {{email}}\nSenha temporária: {{temp_password}}\n\nAcesse {{login_url}} — vamos pedir a troca da senha no primeiro acesso.',
     '["name","email","temp_password","login_url","brand_name","support_email"]'::jsonb, true, 1),
    ('Access credentials (quiz)', 'quiz_welcome_credentials', 'en-US',
     'Your access to {{brand_name}} — {{email}}', body_en,
     E'Welcome, {{name}}!\n\nEmail: {{email}}\nTemporary password: {{temp_password}}\n\nSign in at {{login_url}} — we will ask you to change the password on first use.',
     '["name","email","temp_password","login_url","brand_name","support_email"]'::jsonb, true, 1)
  on conflict do nothing;
end $$;
