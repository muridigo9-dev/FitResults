-- =====================================================
-- Migration: Multi-Tenant Helper Functions
-- Description: Funções auxiliares para gerenciar contexto
--              multi-tenant e verificações de permissões
-- =====================================================

-- =====================================================
-- 1. FUNÇÕES DE VERIFICAÇÃO DE MODO
-- =====================================================

-- Verificar se modo multi-tenant está ativo
CREATE OR REPLACE FUNCTION public.is_multi_tenant_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'multi_tenant_mode_enabled'),
    false
  );
$$;

COMMENT ON FUNCTION public.is_multi_tenant_enabled() IS 'Retorna true se o modo multi-tenant (academias) está ativo';

-- =====================================================
-- 2. FUNÇÕES DE VERIFICAÇÃO DE MEMBERSHIP
-- =====================================================

-- Verificar se usuário é membro de uma academia
CREATE OR REPLACE FUNCTION public.is_academy_member(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE user_id = _user_id 
    AND academy_id = _academy_id
    AND status = 'active'
  );
$$;

-- Verificar se usuário é owner/admin de uma academia
CREATE OR REPLACE FUNCTION public.is_academy_admin(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE user_id = _user_id 
    AND academy_id = _academy_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
$$;

-- =====================================================
-- 3. FUNÇÕES DE OBTENÇÃO DE DADOS
-- =====================================================

-- Obter IDs de todas as academias do usuário
CREATE OR REPLACE FUNCTION public.get_user_academy_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(academy_id),
    ARRAY[]::UUID[]
  )
  FROM public.academy_members
  WHERE user_id = _user_id
  AND status = 'active';
$$;

-- Obter contexto completo do usuário (para uso em RLS e lógica de negócio)
CREATE OR REPLACE FUNCTION public.get_user_context(_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_admin', public.has_role(_user_id, 'admin'),
    'is_multi_tenant', public.is_multi_tenant_enabled(),
    'academy_ids', public.get_user_academy_ids(_user_id),
    'is_trainer', public.has_role(_user_id, 'personal_trainer'),
    'is_nutritionist', public.has_role(_user_id, 'nutritionist'),
    'is_academy_admin', EXISTS(SELECT 1 FROM public.academy_members WHERE user_id = _user_id AND role IN ('owner', 'admin') AND status = 'active'),
    'primary_academy', (SELECT primary_academy_id FROM public.profiles WHERE id = _user_id)
  );
$$;

-- Obter role do usuário em uma academia específica
CREATE OR REPLACE FUNCTION public.get_academy_role(_user_id UUID, _academy_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.academy_members
  WHERE user_id = _user_id 
  AND academy_id = _academy_id
  AND status = 'active'
  LIMIT 1;
$$;

-- =====================================================
-- 4. FUNÇÃO CRÍTICA: VERIFICAR VISIBILIDADE DE CONTEÚDO
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_view_content(
  _content_visibility TEXT,
  _content_academy_id UUID,
  _content_created_by UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_multi_tenant BOOLEAN;
  v_user_academies UUID[];
BEGIN
  v_is_admin := public.has_role(_user_id, 'admin');
  v_multi_tenant := public.is_multi_tenant_enabled();
  
  -- Super Admin sempre vê tudo
  IF v_is_admin THEN 
    RETURN true; 
  END IF;
  
  -- Modo SaaS padrão (sem multi-tenant)
  IF NOT v_multi_tenant THEN
    -- Global: todos veem
    IF _content_visibility = 'global' OR _content_visibility IS NULL THEN 
      RETURN true; 
    END IF;
    
    -- Private: só o criador vê
    IF _content_visibility = 'private' AND _content_created_by = _user_id THEN 
      RETURN true; 
    END IF;
    
    -- Academy: sem multi-tenant, trata como global se não tiver academy_id
    IF _content_visibility = 'academy' AND _content_academy_id IS NULL THEN
      RETURN true;
    END IF;
    
    RETURN false;
  END IF;
  
  -- Modo Multi-Tenant ativo
  v_user_academies := public.get_user_academy_ids(_user_id);
  
  -- Conteúdo da academia do usuário
  IF _content_visibility = 'academy' AND _content_academy_id = ANY(v_user_academies) THEN
    RETURN true;
  END IF;
  
  -- Conteúdo privado do próprio usuário
  IF _content_visibility = 'private' AND _content_created_by = _user_id THEN
    RETURN true;
  END IF;
  
  -- No modo multi-tenant, conteúdos globais NÃO aparecem automaticamente
  -- (decisão de design: evitar poluição de conteúdo)
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_content(TEXT, UUID, UUID, UUID) IS 'Verifica se usuário pode visualizar um conteúdo baseado em visibility e academy_id';

-- =====================================================
-- 5. FUNÇÕES DE VALIDAÇÃO DE LIMITES
-- =====================================================

-- Verificar se academia pode adicionar mais membros de um tipo
CREATE OR REPLACE FUNCTION public.can_add_academy_member(
  _academy_id UUID,
  _member_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INT;
  v_max_count INT;
  v_academy RECORD;
BEGIN
  -- Obter limites da academia
  SELECT 
    max_trainers,
    max_nutritionists,
    max_students,
    max_content_creators
  INTO v_academy
  FROM public.academies
  WHERE id = _academy_id
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Contar membros atuais do tipo
  SELECT COUNT(*) INTO v_current_count
  FROM public.academy_members
  WHERE academy_id = _academy_id
  AND role = _member_role
  AND status = 'active';
  
  -- Verificar limite baseado na role
  v_max_count := CASE _member_role
    WHEN 'trainer' THEN v_academy.max_trainers
    WHEN 'nutritionist' THEN v_academy.max_nutritionists
    WHEN 'student' THEN v_academy.max_students
    WHEN 'content_creator' THEN v_academy.max_content_creators
    ELSE 999999 -- owner/admin sem limite
  END;
  
  RETURN v_current_count < v_max_count;
END;
$$;

COMMENT ON FUNCTION public.can_add_academy_member(UUID, TEXT) IS 'Verifica se academia ainda pode adicionar membros do tipo especificado';

-- Obter estatísticas de uso da academia
CREATE OR REPLACE FUNCTION public.get_academy_usage_stats(_academy_id UUID)
RETURNS TABLE (
  total_trainers BIGINT,
  total_nutritionists BIGINT,
  total_students BIGINT,
  total_content_creators BIGINT,
  total_active_members BIGINT,
  max_trainers INT,
  max_nutritionists INT,
  max_students INT,
  max_content_creators INT,
  can_add_trainer BOOLEAN,
  can_add_nutritionist BOOLEAN,
  can_add_student BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academy RECORD;
BEGIN
  -- Obter dados da academia
  SELECT * INTO v_academy
  FROM public.academies
  WHERE id = _academy_id;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.academy_members WHERE academy_id = _academy_id AND role = 'trainer' AND status = 'active'),
    (SELECT COUNT(*) FROM public.academy_members WHERE academy_id = _academy_id AND role = 'nutritionist' AND status = 'active'),
    (SELECT COUNT(*) FROM public.academy_members WHERE academy_id = _academy_id AND role = 'student' AND status = 'active'),
    (SELECT COUNT(*) FROM public.academy_members WHERE academy_id = _academy_id AND role = 'content_creator' AND status = 'active'),
    (SELECT COUNT(*) FROM public.academy_members WHERE academy_id = _academy_id AND status = 'active'),
    v_academy.max_trainers,
    v_academy.max_nutritionists,
    v_academy.max_students,
    v_academy.max_content_creators,
    public.can_add_academy_member(_academy_id, 'trainer'),
    public.can_add_academy_member(_academy_id, 'nutritionist'),
    public.can_add_academy_member(_academy_id, 'student');
END;
$$;

-- =====================================================
-- 6. FUNÇÕES DE CONVITES
-- =====================================================

-- Verificar se convite é válido
CREATE OR REPLACE FUNCTION public.is_invite_valid(_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invites
    WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  );
$$;

-- Obter dados do convite
CREATE OR REPLACE FUNCTION public.get_invite_details(_token TEXT)
RETURNS TABLE (
  id UUID,
  invited_email TEXT,
  invite_type TEXT,
  target_role TEXT,
  academy_id UUID,
  academy_name TEXT,
  trainer_id UUID,
  trainer_name TEXT,
  invited_by_name TEXT,
  message TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.invited_email,
    i.invite_type,
    i.target_role,
    i.academy_id,
    a.name AS academy_name,
    i.trainer_id,
    pt.full_name AS trainer_name,
    ib.full_name AS invited_by_name,
    i.message,
    i.expires_at,
    i.status
  FROM public.invites i
  LEFT JOIN public.academies a ON a.id = i.academy_id
  LEFT JOIN public.profiles pt ON pt.id = i.trainer_id
  LEFT JOIN public.profiles ib ON ib.id = i.invited_by
  WHERE i.token = _token;
$$;

-- =====================================================
-- 7. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_multi_tenant_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_academy_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_academy_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_academy_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_academy_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_content(TEXT, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_academy_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_academy_usage_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_invite_valid(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_details(TEXT) TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

COMMENT ON SCHEMA public IS 'Multi-tenant helper functions created. Safe to use in both SaaS and multi-tenant modes.';
