-- =====================================================
-- FIX: Global Content Visibility for Students
-- 
-- PROBLEMA: Conteúdos globais não aparecem para alunos
-- CAUSA: can_view_content() não retorna true para global em multi-tenant
-- SOLUÇÃO: Permitir conteúdos globais para todos os usuários
-- =====================================================

-- =====================================================
-- 1. CORRIGIR FUNÇÃO can_view_content
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
  v_multi_tenant BOOLEAN;
  v_user_academies UUID[];
BEGIN
  -- Verificar se modo multi-tenant está ativo
  v_multi_tenant := public.is_feature_enabled('academy_mode_enabled');
  
  -- ADMIN vê tudo
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- ✅ CORREÇÃO: Conteúdos GLOBAIS devem ser visíveis para TODOS
  -- Independente de modo SaaS ou Multi-tenant
  IF _content_visibility = 'global' OR _content_visibility IS NULL THEN
    RETURN true;
  END IF;
  
  -- Modo SaaS padrão (sem multi-tenant)
  IF NOT v_multi_tenant THEN
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
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_content(TEXT, UUID, UUID, UUID) IS 'Verifica se usuário pode visualizar um conteúdo. Conteúdos globais são sempre visíveis.';

-- =====================================================
-- 2. GARANTIR QUE CONTEÚDOS EXISTENTES SÃO GLOBAIS
-- =====================================================

-- Atualizar conteúdos sem visibility definida para 'global'
UPDATE public.diets
SET visibility = 'global'
WHERE visibility IS NULL;

UPDATE public.workouts
SET visibility = 'global'
WHERE visibility IS NULL;

UPDATE public.challenges
SET visibility = 'global'
WHERE visibility IS NULL;

UPDATE public.habits
SET visibility = 'global'
WHERE visibility IS NULL;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para queries de conteúdo global + ativo
CREATE INDEX IF NOT EXISTS idx_diets_global_active 
  ON public.diets(is_active, visibility) 
  WHERE visibility = 'global' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_workouts_global_active 
  ON public.workouts(is_active, visibility) 
  WHERE visibility = 'global' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_challenges_global_active 
  ON public.challenges(is_active, visibility) 
  WHERE visibility = 'global' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_habits_global_active 
  ON public.habits(is_active, visibility) 
  WHERE visibility = 'global' AND is_active = true;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration fixes:
-- ✅ Global content now visible to ALL users (including students)
-- ✅ Existing content without visibility set to 'global'
-- ✅ Performance indexes for global content queries
-- ✅ Maintains security for academy and private content
-- =====================================================
