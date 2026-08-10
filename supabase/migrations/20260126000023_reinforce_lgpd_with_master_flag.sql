-- Migration: 20260126000023_reinforce_lgpd_with_master_flag.sql
-- Description: Reinforce LGPD system with master flag 'lgpd_enabled' enforcement in RLS and Functions
-- Created: 2026-01-26

-- 1. Helper function for centralized LGPD status check
CREATE OR REPLACE FUNCTION public.is_lgpd_enabled()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.is_feature_active_for_user('lgpd_enabled', auth.uid());
$$;

-- 2. Update RLS policies to respect the master flag
-- We use DO blocks to drop and recreate policies safely (idempotent)

-- lgpd_requests
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view all LGPD requests" ON public.lgpd_requests;
    CREATE POLICY "Admins can view all LGPD requests"
      ON public.lgpd_requests FOR SELECT
      TO authenticated
      USING (public.is_lgpd_enabled() AND public.is_admin());

    DROP POLICY IF EXISTS "Users can view own LGPD requests" ON public.lgpd_requests;
    CREATE POLICY "Users can view own LGPD requests"
      ON public.lgpd_requests FOR SELECT
      TO authenticated
      USING (public.is_lgpd_enabled() AND user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can create own LGPD requests" ON public.lgpd_requests;
    CREATE POLICY "Users can create own LGPD requests"
      ON public.lgpd_requests FOR INSERT
      TO authenticated
      WITH CHECK (public.is_lgpd_enabled() AND user_id = auth.uid());

    DROP POLICY IF EXISTS "Admins can update LGPD requests" ON public.lgpd_requests;
    CREATE POLICY "Admins can update LGPD requests"
      ON public.lgpd_requests FOR UPDATE
      TO authenticated
      USING (public.is_lgpd_enabled() AND public.is_admin());
END $$;

-- user_consents
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own consents" ON public.user_consents;
    CREATE POLICY "Users can view own consents"
      ON public.user_consents FOR SELECT
      TO authenticated
      USING (public.is_lgpd_enabled() AND user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can manage own consents" ON public.user_consents;
    CREATE POLICY "Users can manage own consents"
      ON public.user_consents FOR ALL
      TO authenticated
      USING (public.is_lgpd_enabled() AND user_id = auth.uid())
      WITH CHECK (public.is_lgpd_enabled() AND user_id = auth.uid());

    DROP POLICY IF EXISTS "Admins can view all consents" ON public.user_consents;
    CREATE POLICY "Admins can view all consents"
      ON public.user_consents FOR SELECT
      TO authenticated
      USING (public.is_lgpd_enabled() AND public.is_admin());
END $$;

-- 3. Reinforce RPC Functions with silent blocking and logging
CREATE OR REPLACE FUNCTION public.create_lgpd_request(
  _user_id UUID,
  _request_type TEXT,
  _description TEXT DEFAULT NULL,
  _user_notes TEXT DEFAULT NULL,
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
BEGIN
  -- GUARD: Check if LGPD is enabled
  IF NOT public.is_feature_active_for_user('lgpd_enabled', auth.uid()) THEN
    -- Log unauthorized attempt
    INSERT INTO public.feature_usage (flag_key, user_id, action, metadata)
    VALUES ('lgpd_enabled', auth.uid(), 'unauthorized_access', jsonb_build_object('function', 'create_lgpd_request', 'request_type', _request_type));
    
    RETURN NULL; -- Silent block
  END IF;

  -- Buscar prazo da política
  SELECT default_deadline_days INTO _deadline_days
  FROM lgpd_policies
  LIMIT 1;
  
  -- Criar solicitação
  INSERT INTO lgpd_requests (
    user_id,
    request_type,
    description,
    user_message, -- Fixed column name from user_notes to user_message based on schema view
    correction_details,
    consent_types,
    export_format,
    deadline_at
  ) VALUES (
    _user_id,
    _request_type::lgpd_request_type,
    _description,
    _user_notes,
    _correction_details,
    _consent_types,
    _export_format,
    now() + (COALESCE(_deadline_days, 15) || ' days')::interval
  )
  RETURNING id INTO _request_id;
  
  -- Log de auditoria
  INSERT INTO lgpd_audit_logs (
    request_id,
    user_id,
    action,
    actor_id,
    actor_role,
    description
  ) VALUES (
    _request_id,
    _user_id,
    'request_created',
    _user_id,
    'user',
    'Usuário criou solicitação LGPD: ' || _request_type
  );
  
  RETURN _request_id;
END;
$$;

-- 3.1 Update status function check
CREATE OR REPLACE FUNCTION public.update_lgpd_request_status(
  _request_id UUID,
  _new_status lgpd_request_status,
  _admin_id UUID,
  _admin_notes TEXT DEFAULT NULL,
  _denial_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _request_type lgpd_request_type;
  _audit_action lgpd_audit_action;
BEGIN
  -- GUARD: Check if LGPD is enabled
  IF NOT public.is_feature_active_for_user('lgpd_enabled', auth.uid()) THEN
    RETURN FALSE; -- Silent block
  END IF;

  -- Buscar info da solicitação
  SELECT user_id, request_type INTO _user_id, _request_type
  FROM lgpd_requests
  WHERE id = _request_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar solicitação
  UPDATE lgpd_requests
  SET 
    status = _new_status,
    handled_by = _admin_id,
    admin_notes = COALESCE(_admin_notes, admin_notes),
    denial_reason = _denial_reason,
    resolved_at = CASE 
      WHEN _new_status IN ('completed', 'denied', 'cancelled') THEN now()
      ELSE resolved_at
    END,
    updated_at = now()
  WHERE id = _request_id;
  
  -- Determinar ação de auditoria
  _audit_action := CASE _new_status
    WHEN 'under_review' THEN 'request_reviewed'
    WHEN 'approved' THEN 'request_approved'
    WHEN 'denied' THEN 'request_denied'
    ELSE 'request_reviewed'
  END;
  
  -- Log de auditoria
  INSERT INTO lgpd_audit_logs (
    request_id,
    user_id,
    action,
    actor_id,
    actor_role,
    description,
    metadata
  ) VALUES (
    _request_id,
    _user_id,
    _audit_action,
    _admin_id,
    'admin',
    'Status alterado para: ' || _new_status::text,
    jsonb_build_object(
      'old_status', (SELECT status FROM lgpd_requests WHERE id = _request_id),
      'new_status', _new_status,
      'admin_notes', _admin_notes,
      'denial_reason', _denial_reason
    )
  );
  
  RETURN TRUE;
END;
$$;

-- 4. Ensure master flag exists and default to TRUE for initial rollout if desired, 
-- but the prompt says ONLY appear if active.
INSERT INTO public.feature_flags (key, description, enabled, affects)
VALUES ('lgpd_enabled', 'Sistema LGPD ativado', true, '["lgpd", "privacy"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
