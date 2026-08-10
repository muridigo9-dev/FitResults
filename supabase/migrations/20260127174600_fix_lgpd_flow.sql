-- Migration: 20260127000001_fix_lgpd_submission_and_notifications.sql
-- Description: Unify LGPD types, standardize column names in FE, and add Admin notifications
-- Created: 2026-01-27

-- 1. LGPD Enums are now handled in 20260127174591_add_all_lgpd_enums.sql
-- (Avoids PG error 55P04)

-- 3. Create Notification Template for LGPD
INSERT INTO public.notification_templates (
  name,
  description,
  event_type,
  channel,
  target_audience,
  target_roles,
  title_template,
  body_template,
  action_url_template,
  is_active,
  priority
) VALUES (
  'Nova Solicitação LGPD',
  'Notifica administradores sobre novas solicitações de privacidade',
  'lgpd_new_request',
  'both',
  'by_role',
  ARRAY['admin'],
  'Nova Solicitação LGPD: {{request_type}} 🛡️',
  'O usuário {{user_name}} enviou uma solicitação de {{request_type}}. Verifique no painel de administração.',
  '/admin/lgpd',
  true,
  10
) ON CONFLICT (name) DO UPDATE SET 
  title_template = EXCLUDED.title_template,
  body_template = EXCLUDED.body_template;

-- 4. Create Email Template for LGPD
DELETE FROM public.email_templates WHERE type = 'lgpd_new_request';
INSERT INTO public.email_templates (
  name,
  type,
  subject,
  body_html,
  body_text,
  is_active
) VALUES (
  'Notificação LGPD para Admin',
  'lgpd_new_request',
  'Nova Solicitação LGPD: {{request_type}}',
  '<h2>Nova Solicitação de Privacidade</h2><p>O usuário <strong>{{user_name}}</strong> enviou uma solicitação de <strong>{{request_type}}</strong>.</p><p>Acesse o painel administrativo para processar.</p><a href="{{app_url}}/admin/lgpd" style="padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; borderRadius: 5px;">Ver Solicitação</a>',
  'Nova Solicitação LGPD de {{user_name}} para {{request_type}}. Acesse {{app_url}}/admin/lgpd',
  true
);

-- 5. Update the RPC function to be safer and trigger notifications
CREATE OR REPLACE FUNCTION public.create_lgpd_request(
  _user_id UUID,
  _request_type TEXT,
  _description TEXT DEFAULT NULL,
  _user_notes TEXT DEFAULT NULL, -- We'll accept _user_notes for compatibility but map it
  _correction_details JSONB DEFAULT NULL,
  _consent_types TEXT[] DEFAULT NULL,
  _export_format TEXT DEFAULT 'json'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id UUID;
  _deadline_days INTEGER;
  _final_type lgpd_request_type;
  _user_name TEXT;
  _admin_id UUID;
  _admin_email TEXT;
BEGIN
  -- GUARD: Check if LGPD is enabled
  IF NOT public.is_feature_active_for_user('lgpd_enabled', auth.uid()) THEN
    INSERT INTO public.feature_usage (flag_key, user_id, action, metadata)
    VALUES ('lgpd_enabled', auth.uid(), 'unauthorized_access', jsonb_build_object('function', 'create_lgpd_request', 'request_type', _request_type));
    RETURN NULL;
  END IF;

  -- 1. Map / Validate Request Type
  -- We accept BOTH 'data_access' and 'access' thanks to enum update
  BEGIN
    _final_type := _request_type::lgpd_request_type;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback mapping if casting fails
    _final_type := CASE _request_type
      WHEN 'confirmation' THEN 'data_confirmation'::lgpd_request_type
      WHEN 'access' THEN 'data_access'::lgpd_request_type
      WHEN 'correction' THEN 'data_correction'::lgpd_request_type
      WHEN 'portability' THEN 'data_portability'::lgpd_request_type
      WHEN 'anonymization' THEN 'data_anonymization'::lgpd_request_type
      WHEN 'deletion' THEN 'data_deletion'::lgpd_request_type
      WHEN 'revocation' THEN 'consent_revocation'::lgpd_request_type
      ELSE 'data_confirmation'::lgpd_request_type -- Default safe
    END;
  END;

  -- 2. Get Deadline
  SELECT default_deadline_days INTO _deadline_days FROM lgpd_policies LIMIT 1;
  
  -- 3. Create Request
  INSERT INTO lgpd_requests (
    user_id,
    request_type,
    description,
    user_message, -- Standardized column
    correction_details,
    consent_types,
    export_format,
    deadline_at
  ) VALUES (
    _user_id,
    _final_type,
    _description,
    _user_notes,
    _correction_details,
    _consent_types,
    _export_format,
    now() + (COALESCE(_deadline_days, 15) || ' days')::interval
  )
  RETURNING id INTO _request_id;
  
  -- 4. Log Audit
  INSERT INTO lgpd_audit_logs (request_id, user_id, action, actor_id, actor_role, description)
  VALUES (_request_id, _user_id, 'request_created', _user_id, 'user', 'Usuário criou solicitação LGPD: ' || _final_type::text);

  -- 5. NOTIFY ADMINS (Push/In-App and potentially Email via Edge Function)
  -- Get user name for variables
  SELECT full_name INTO _user_name FROM profiles WHERE id = _user_id;

  -- Loop through admins to create in-app entries and trigger notification logic
  FOR _admin_id IN (SELECT user_id FROM user_roles WHERE role = 'admin') LOOP
    -- Push notification will be handled by the Edge Function if called, 
    -- but here we at least make sure they see it in-app
    INSERT INTO in_app_notifications (user_id, title, message, type, action_url)
    VALUES (
      _admin_id, 
      'Nova Solicitação LGPD: ' || _final_type::text,
      'O usuário ' || COALESCE(_user_name, 'Desconhecido') || ' solicitou ' || _final_type::text,
      'info',
      '/admin/lgpd'
    );
  END LOOP;

  RETURN _request_id;
END;
$$;

-- 6. Ensure the table has the correct column if it somehow missed it (defensive)
-- We know it's user_message from previous files, but we'll ensure it.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lgpd_requests' AND column_name = 'user_message') THEN
        ALTER TABLE lgpd_requests ADD COLUMN IF NOT EXISTS user_message TEXT;
    END IF;
END $$;
