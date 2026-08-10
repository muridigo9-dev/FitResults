/**
 * Admin Impersonation System
 * 
 * Sistema seguro de impersonação para SUPER ADMIN com:
 * - Auditoria completa (LGPD compliant)
 * - Sessões temporárias
 * - Rastreabilidade total
 * - Bloqueios de segurança
 */

-- =====================================================
-- 1. TABELA DE LOGS DE IMPERSONAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem está impersonando
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quem está sendo impersonado
  impersonated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Justificativa (obrigatória para usuários reais)
  reason TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Informações de contexto
  ip_address INET,
  user_agent TEXT,
  
  -- Status da sessão
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired', 'revoked')),
  
  -- Token de sessão temporária
  session_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_impersonation_logs_admin ON admin_impersonation_logs(admin_id);
CREATE INDEX idx_impersonation_logs_impersonated ON admin_impersonation_logs(impersonated_user_id);
CREATE INDEX idx_impersonation_logs_status ON admin_impersonation_logs(status);
CREATE INDEX idx_impersonation_logs_session_token ON admin_impersonation_logs(session_token) WHERE status = 'active';
CREATE INDEX idx_impersonation_logs_started_at ON admin_impersonation_logs(started_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_impersonation_logs_updated_at
  BEFORE UPDATE ON admin_impersonation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TABELA DE RESTRIÇÕES DE IMPERSONAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS impersonation_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuário que não pode ser impersonado
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Motivo da restrição
  reason TEXT NOT NULL,
  
  -- Tipo de restrição
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('lgpd_request', 'security', 'permanent', 'temporary')),
  
  -- Se temporária, quando expira
  expires_at TIMESTAMPTZ,
  
  -- Quem criou a restrição
  created_by UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: usuário único se ativo (Fixed syntax: separate index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_impersonation_restrictions_unique_active 
ON impersonation_restrictions(user_id) 
WHERE is_active = true;

-- Índices
CREATE INDEX idx_impersonation_restrictions_user ON impersonation_restrictions(user_id) WHERE is_active = true;
CREATE INDEX idx_impersonation_restrictions_type ON impersonation_restrictions(restriction_type);

-- Trigger para updated_at
CREATE TRIGGER update_impersonation_restrictions_updated_at
  BEFORE UPDATE ON impersonation_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. FUNÇÃO: VERIFICAR SE USUÁRIO PODE SER IMPERSONADO
-- =====================================================

CREATE OR REPLACE FUNCTION can_impersonate_user(
  p_admin_id UUID,
  p_target_user_id UUID
)
RETURNS TABLE (
  can_impersonate BOOLEAN,
  reason TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role TEXT;
  v_has_restriction BOOLEAN;
  v_restriction_reason TEXT;
  v_is_test_user BOOLEAN;
BEGIN
  -- Verificar se admin é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT false, 'Apenas SUPER ADMIN pode impersonar usuários';
    RETURN;
  END IF;
  
  -- Verificar se usuário alvo existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RETURN QUERY SELECT false, 'Usuário não encontrado';
    RETURN;
  END IF;
  
  -- Verificar se admin está tentando impersonar a si mesmo
  IF p_admin_id = p_target_user_id THEN
    RETURN QUERY SELECT false, 'Não é possível impersonar a si mesmo';
    RETURN;
  END IF;
  
  -- Verificar restrições ativas
  SELECT EXISTS(
    SELECT 1 
    FROM impersonation_restrictions 
    WHERE user_id = p_target_user_id 
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ), reason
  INTO v_has_restriction, v_restriction_reason
  FROM impersonation_restrictions
  WHERE user_id = p_target_user_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF v_has_restriction THEN
    RETURN QUERY SELECT false, COALESCE(v_restriction_reason, 'Usuário possui restrição de impersonação');
    RETURN;
  END IF;
  
  -- Verificar se é usuário de teste
  SELECT email LIKE '%@test.com' INTO v_is_test_user
  FROM auth.users
  WHERE id = p_target_user_id;
  
  -- Tudo OK
  RETURN QUERY SELECT true, CASE 
    WHEN v_is_test_user THEN 'Usuário de teste - impersonação permitida'
    ELSE 'Impersonação permitida - justificativa obrigatória'
  END;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO: INICIAR IMPERSONAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION start_impersonation(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  session_token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_impersonate BOOLEAN;
  v_reason TEXT;
  v_is_test_user BOOLEAN;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_log_id UUID;
BEGIN
  -- Verificar se pode impersonar
  SELECT ci.can_impersonate, ci.reason
  INTO v_can_impersonate, v_reason
  FROM can_impersonate_user(p_admin_id, p_target_user_id) ci;
  
  IF NOT v_can_impersonate THEN
    RETURN QUERY SELECT false, v_reason, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Verificar se é usuário de teste
  SELECT email LIKE '%@test.com' INTO v_is_test_user
  FROM auth.users
  WHERE id = p_target_user_id;
  
  -- Se não é usuário de teste, justificativa é obrigatória
  IF NOT v_is_test_user AND (p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10) THEN
    RETURN QUERY SELECT false, 'Justificativa obrigatória (mínimo 10 caracteres) para usuários reais', NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Encerrar sessões ativas anteriores do mesmo admin
  UPDATE admin_impersonation_logs
  SET status = 'ended',
      ended_at = NOW(),
      updated_at = NOW()
  WHERE admin_id = p_admin_id
    AND status = 'active';
  
  -- Gerar token de sessão único
  v_session_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + INTERVAL '30 minutes';
  
  -- Criar log de impersonação
  INSERT INTO admin_impersonation_logs (
    admin_id,
    impersonated_user_id,
    reason,
    ip_address,
    user_agent,
    session_token,
    expires_at,
    status
  ) VALUES (
    p_admin_id,
    p_target_user_id,
    p_reason,
    p_ip_address,
    p_user_agent,
    v_session_token,
    v_expires_at,
    'active'
  )
  RETURNING id INTO v_log_id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    true, 
    'Impersonação iniciada com sucesso', 
    v_session_token,
    v_expires_at;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO: VALIDAR SESSÃO DE IMPERSONAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION validate_impersonation_session(
  p_session_token TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  admin_id UUID,
  impersonated_user_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log RECORD;
BEGIN
  -- Buscar sessão ativa
  SELECT * INTO v_log
  FROM admin_impersonation_logs
  WHERE session_token = p_session_token
    AND status = 'active'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    -- Marcar como expirada se encontrar
    UPDATE admin_impersonation_logs
    SET status = 'expired',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE session_token = p_session_token
      AND status = 'active';
    
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Retornar dados da sessão válida
  RETURN QUERY SELECT 
    true,
    v_log.admin_id,
    v_log.impersonated_user_id,
    v_log.expires_at;
END;
$$;

-- =====================================================
-- 6. FUNÇÃO: ENCERRAR IMPERSONAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION end_impersonation(
  p_session_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar log
  UPDATE admin_impersonation_logs
  SET status = 'ended',
      ended_at = NOW(),
      updated_at = NOW()
  WHERE session_token = p_session_token
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Sessão não encontrada ou já encerrada';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Impersonação encerrada com sucesso';
END;
$$;

-- =====================================================
-- 7. FUNÇÃO: OBTER LOGS DE IMPERSONAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION get_impersonation_logs(
  p_admin_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  admin_email TEXT,
  admin_name TEXT,
  impersonated_email TEXT,
  impersonated_name TEXT,
  reason TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTERVAL,
  status TEXT,
  ip_address INET
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    au.email as admin_email,
    ap.full_name as admin_name,
    iu.email as impersonated_email,
    ip.full_name as impersonated_name,
    l.reason,
    l.started_at,
    l.ended_at,
    CASE 
      WHEN l.ended_at IS NOT NULL THEN l.ended_at - l.started_at
      ELSE NOW() - l.started_at
    END as duration,
    l.status,
    l.ip_address
  FROM admin_impersonation_logs l
  JOIN auth.users au ON l.admin_id = au.id
  JOIN profiles ap ON l.admin_id = ap.id
  JOIN auth.users iu ON l.impersonated_user_id = iu.id
  JOIN profiles ip ON l.impersonated_user_id = ip.id
  WHERE (p_admin_id IS NULL OR l.admin_id = p_admin_id)
  ORDER BY l.started_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE admin_impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_restrictions ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas SUPER ADMIN pode ver logs
CREATE POLICY "Super admin can view all impersonation logs"
  ON admin_impersonation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Policy: Apenas SUPER ADMIN pode ver restrições
CREATE POLICY "Super admin can view impersonation restrictions"
  ON impersonation_restrictions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Policy: Apenas SUPER ADMIN pode criar restrições
CREATE POLICY "Super admin can create impersonation restrictions"
  ON impersonation_restrictions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- =====================================================
-- 9. CRON JOB: EXPIRAR SESSÕES ANTIGAS
-- =====================================================

-- Função para expirar sessões
CREATE OR REPLACE FUNCTION expire_old_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_impersonation_logs
  SET status = 'expired',
      ended_at = NOW(),
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$;

-- Agendar cron job (a cada 5 minutos)
SELECT cron.schedule(
  'expire-impersonation-sessions',
  '*/5 * * * *',
  $$SELECT expire_old_impersonation_sessions()$$
);

-- =====================================================
-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE admin_impersonation_logs IS 'Logs de auditoria para impersonação de usuários por SUPER ADMIN (LGPD compliant)';
COMMENT ON TABLE impersonation_restrictions IS 'Restrições de impersonação para usuários específicos';
COMMENT ON FUNCTION can_impersonate_user IS 'Verifica se um admin pode impersonar um usuário específico';
COMMENT ON FUNCTION start_impersonation IS 'Inicia uma sessão de impersonação com auditoria completa';
COMMENT ON FUNCTION validate_impersonation_session IS 'Valida se uma sessão de impersonação está ativa e válida';
COMMENT ON FUNCTION end_impersonation IS 'Encerra uma sessão de impersonação';
COMMENT ON FUNCTION get_impersonation_logs IS 'Retorna logs de impersonação com detalhes completos';
