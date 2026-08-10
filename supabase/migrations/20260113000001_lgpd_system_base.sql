-- =====================================================
-- Migration: LGPD System Base
-- Description: Sistema completo de gestão LGPD
-- =====================================================

-- Enum para tipos de solicitação LGPD
CREATE TYPE lgpd_request_type AS ENUM (
  'data_confirmation',      -- Confirmação de tratamento
  'data_access',           -- Acesso aos dados
  'data_correction',       -- Correção de dados
  'data_portability',      -- Portabilidade
  'data_anonymization',    -- Anonimização
  'data_deletion',         -- Exclusão (direito ao esquecimento)
  'consent_revocation'     -- Revogação de consentimento
);

-- Enum para status da solicitação
CREATE TYPE lgpd_request_status AS ENUM (
  'pending',               -- Aguardando análise
  'under_review',          -- Em análise
  'approved',              -- Aprovada
  'denied',                -- Negada
  'completed',             -- Concluída
  'requires_info',         -- Requer mais informações
  'cancelled'              -- Cancelada pelo usuário
);

-- Enum para ações de auditoria
CREATE TYPE lgpd_audit_action AS ENUM (
  'request_created',
  'request_reviewed',
  'request_approved',
  'request_denied',
  'data_exported',
  'data_anonymized',
  'data_deleted',
  'consent_revoked',
  'policy_updated'
);

-- =====================================================
-- Tabela: lgpd_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type lgpd_request_type NOT NULL,
  status lgpd_request_status NOT NULL DEFAULT 'pending',
  
  -- Detalhes da solicitação
  description TEXT,
  user_message TEXT,
  
  -- Campos específicos por tipo
  correction_details JSONB, -- Para data_correction: campos a corrigir
  consent_types TEXT[],     -- Para consent_revocation: tipos de consentimento
  export_format TEXT,       -- Para data_portability: json, csv, pdf
  
  -- Gestão e resposta
  handled_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  denial_reason TEXT,
  
  -- Resultado da execução
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  export_file_url TEXT,     -- URL do arquivo exportado (se aplicável)
  
  -- Prazos
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ,  -- Prazo legal (ex: 15 dias)
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lgpd_requests_user_id ON public.lgpd_requests(user_id);
CREATE INDEX idx_lgpd_requests_status ON public.lgpd_requests(status);
CREATE INDEX idx_lgpd_requests_type ON public.lgpd_requests(request_type);
CREATE INDEX idx_lgpd_requests_created ON public.lgpd_requests(created_at DESC);
CREATE INDEX idx_lgpd_requests_deadline ON public.lgpd_requests(deadline_at) WHERE status IN ('pending', 'under_review');

-- =====================================================
-- Tabela: lgpd_audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lgpd_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.lgpd_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ação executada
  action lgpd_audit_action NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT,
  
  -- Detalhes
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- IP e contexto
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp (imutável)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lgpd_audit_request ON public.lgpd_audit_logs(request_id);
CREATE INDEX idx_lgpd_audit_user ON public.lgpd_audit_logs(user_id);
CREATE INDEX idx_lgpd_audit_actor ON public.lgpd_audit_logs(actor_id);
CREATE INDEX idx_lgpd_audit_created ON public.lgpd_audit_logs(created_at DESC);

-- =====================================================
-- Tabela: lgpd_policies
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lgpd_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configurações de prazo
  default_deadline_days INTEGER NOT NULL DEFAULT 15,
  
  -- Políticas de exclusão
  allow_hard_delete BOOLEAN NOT NULL DEFAULT false,
  retention_days_after_soft_delete INTEGER NOT NULL DEFAULT 90,
  
  -- Dados protegidos (não podem ser excluídos)
  protected_tables TEXT[] DEFAULT ARRAY['subscriptions', 'payments'],
  
  -- Anonimização
  anonymization_rules JSONB,
  
  -- Notificações
  notify_user_on_completion BOOLEAN NOT NULL DEFAULT true,
  notify_admin_on_new_request BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir política padrão
INSERT INTO public.lgpd_policies (
  default_deadline_days,
  allow_hard_delete,
  retention_days_after_soft_delete,
  protected_tables,
  anonymization_rules
) VALUES (
  15,
  false,
  90,
  ARRAY['subscriptions', 'payments', 'lgpd_audit_logs'],
  '{
    "profile": {"email": "anonimizado@example.com", "full_name": "Usuário Anonimizado"},
    "checkins": {"notes": null},
    "anamnesis": {"medical_history": "REDACTED"}
  }'::jsonb
);

-- =====================================================
-- Tabela: user_consents
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de consentimento
  consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'notifications', 'data_processing'
  granted BOOLEAN NOT NULL DEFAULT true,
  
  -- Contexto
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, consent_type)
);

-- Index
CREATE INDEX idx_user_consents_user ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);

-- =====================================================
-- Functions: Helper Functions
-- =====================================================

-- Função para criar solicitação LGPD
CREATE OR REPLACE FUNCTION create_lgpd_request(
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
AS $$
DECLARE
  _request_id UUID;
  _deadline_days INTEGER;
BEGIN
  -- Buscar prazo da política
  SELECT default_deadline_days INTO _deadline_days
  FROM lgpd_policies
  LIMIT 1;
  
  -- Criar solicitação
  INSERT INTO lgpd_requests (
    user_id,
    request_type,
    description,
    user_notes,
    correction_details,
    consent_types,
    export_format,
    deadline_at
  ) VALUES (
    _user_id,
    _request_type,
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

-- Função para atualizar status da solicitação
CREATE OR REPLACE FUNCTION update_lgpd_request_status(
  _request_id UUID,
  _new_status lgpd_request_status,
  _admin_id UUID,
  _admin_notes TEXT DEFAULT NULL,
  _denial_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id UUID;
  _request_type lgpd_request_type;
  _audit_action lgpd_audit_action;
BEGIN
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

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- lgpd_requests policies
CREATE POLICY "Admins can view all LGPD requests"
  ON public.lgpd_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own LGPD requests"
  ON public.lgpd_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own LGPD requests"
  ON public.lgpd_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update LGPD requests"
  ON public.lgpd_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- lgpd_audit_logs policies (read-only)
CREATE POLICY "Admins can view audit logs"
  ON public.lgpd_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- lgpd_policies policies
CREATE POLICY "Admins can manage LGPD policies"
  ON public.lgpd_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- user_consents policies
CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own consents"
  ON public.user_consents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lgpd_requests_updated_at
  BEFORE UPDATE ON public.lgpd_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lgpd_policies_updated_at
  BEFORE UPDATE ON public.lgpd_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Feature Flags
-- =====================================================

-- Inserir feature flags LGPD
INSERT INTO public.feature_flags (key, enabled, description, affects)
VALUES 
  ('lgpd_enabled', true, 'Sistema LGPD ativado', '["lgpd"]'::jsonb),
  ('lgpd_data_export_enabled', true, 'Exportação de dados habilitada', '["lgpd", "data_export"]'::jsonb),
  ('lgpd_anonymization_enabled', true, 'Anonimização habilitada', '["lgpd", "anonymization"]'::jsonb),
  ('lgpd_hard_delete_enabled', false, 'Exclusão permanente habilitada (requer aprovação extra)', '["lgpd", "hard_delete"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.lgpd_requests IS 'Solicitações LGPD dos usuários';
COMMENT ON TABLE public.lgpd_audit_logs IS 'Logs de auditoria imutáveis para compliance LGPD';
COMMENT ON TABLE public.lgpd_policies IS 'Políticas e configurações do sistema LGPD';
COMMENT ON TABLE public.user_consents IS 'Consentimentos do usuário para diferentes finalidades';
