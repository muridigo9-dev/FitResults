-- Migration: 20260218170000_fix_feature_flag_logic.sql
-- Description: Melhora a robustez da verificação de features e adiciona ferramentas de debug.
-- Author: Antigravity Agent

-- 1. Adicionar conceito de Plano Padrão (Default Plan)
-- Isso evita que usuários sem plano fiquem num limbo sem features
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 2. Garantir que existam pelo menos um plano padrão (fallback)
DO $$
BEGIN
    -- Se não houver nenhum plano padrão, define o primeiro plano criado como padrão
    IF NOT EXISTS (SELECT 1 FROM public.plans WHERE is_default = true) THEN
        UPDATE public.plans 
        SET is_default = true 
        WHERE id = (SELECT id FROM public.plans ORDER BY created_at ASC LIMIT 1);
    END IF;
END $$;

-- 3. Atualizar função de verificação de permissão (is_feature_active_for_user)
-- Agora com fallback para o plano padrão se o usuário/academia não tiver plano
CREATE OR REPLACE FUNCTION public.is_feature_active_for_user(
    feature_key_param TEXT,
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_global_enabled BOOLEAN;
    v_public_access BOOLEAN;
    v_is_admin BOOLEAN;
    v_plan_id UUID;
    v_academy_plan_id UUID;
    v_user_plan_id UUID;
    v_default_plan_id UUID;
BEGIN
    -- 1. Global Definitions (Level 0)
    SELECT enabled, public_access INTO v_global_enabled, v_public_access
    FROM public.feature_flags
    WHERE key = feature_key_param;

    -- Se a flag não existe ou está desligada globalmente, ninguém acessa
    IF v_global_enabled IS NULL OR v_global_enabled = false THEN
        RETURN false;
    END IF;

    -- 2. Bypass para Acesso Público (Level 0.2)
    IF v_public_access = true THEN
        RETURN true;
    END IF;
    
    -- Se não houver usuário logado e a flag não for pública, nega acesso
    IF user_id_param IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Super Admin Bypass (Level 0.5)
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_id_param AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
        RETURN true;
    END IF;

    -- 4. Determinar Plano Efetivo (Level 1)
    
    -- A. Verificar se o usuário é membro ativo de uma Academia
    SELECT a.plan_id INTO v_academy_plan_id
    FROM public.academy_members am
    JOIN public.academies a ON am.academy_id = a.id
    WHERE am.user_id = user_id_param
      AND am.status = 'active'
      AND a.status = 'active'
    LIMIT 1;

    IF v_academy_plan_id IS NOT NULL THEN
        v_plan_id := v_academy_plan_id;
    ELSE
        -- B. Fallback para Plano Pessoal do Usuário
        SELECT current_plan_id INTO v_user_plan_id
        FROM public.profiles
        WHERE id = user_id_param;
        
        v_plan_id := v_user_plan_id;
    END IF;

    -- C. Fallback para Plano Padrão (Safety Net)
    -- Se o usuário não tem plano e a academia não tem plano, usa o plano default do sistema
    IF v_plan_id IS NULL THEN
        SELECT id INTO v_default_plan_id FROM public.plans WHERE is_default = true LIMIT 1;
        v_plan_id := v_default_plan_id;
    END IF;

    -- 5. Verificação de Entitlement por Plano
    -- Se ainda assim não tiver plano, acesso negado
    IF v_plan_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verifica se o plano tem a feature habilitada
    RETURN EXISTS (
        SELECT 1 
        FROM public.plan_features
        WHERE plan_id = v_plan_id
          AND feature_key = feature_key_param
          AND enabled = true
    );
END;
$$;

-- 4. Função de Debug para Diagnóstico (Crucial para o usuário entender o erro)
CREATE OR REPLACE FUNCTION public.debug_feature_access(
    p_user_id UUID,
    p_feature_key TEXT DEFAULT NULL 
)
RETURNS TABLE (
    feature_key TEXT,
    is_global_enabled BOOLEAN,
    is_admin BOOLEAN,
    plan_source TEXT,
    plan_id UUID,
    plan_name TEXT,
    is_plan_enabled BOOLEAN,
    final_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_academy_plan_id UUID;
    v_user_plan_id UUID;
    v_default_plan_id UUID;
    v_final_plan_id UUID;
    v_plan_source TEXT;
BEGIN
    -- Check Admin
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin') INTO v_is_admin;

    -- Determine Plan Logic (Replicating logic for debug)
    SELECT a.plan_id INTO v_academy_plan_id
    FROM public.academy_members am
    JOIN public.academies a ON am.academy_id = a.id
    WHERE am.user_id = p_user_id AND am.status = 'active' AND a.status = 'active' LIMIT 1;

    SELECT current_plan_id INTO v_user_plan_id FROM public.profiles WHERE id = p_user_id;

    SELECT id INTO v_default_plan_id FROM public.plans WHERE is_default = true LIMIT 1;

    IF v_academy_plan_id IS NOT NULL THEN
        v_final_plan_id := v_academy_plan_id;
        v_plan_source := 'Academy Plan';
    ELSIF v_user_plan_id IS NOT NULL THEN
        v_final_plan_id := v_user_plan_id;
        v_plan_source := 'User Personal Plan';
    ELSIF v_default_plan_id IS NOT NULL THEN
        v_final_plan_id := v_default_plan_id;
        v_plan_source := 'System Default Plan';
    ELSE
        v_final_plan_id := NULL;
        v_plan_source := 'None';
    END IF;

    RETURN QUERY
    SELECT 
        ff.key as feature_key,
        ff.enabled as is_global_enabled,
        v_is_admin as is_admin,
        v_plan_source as plan_source,
        v_final_plan_id as plan_id,
        p.name as plan_name,
        COALESCE(pf.enabled, false) as is_plan_enabled,
        public.is_feature_active_for_user(ff.key, p_user_id) as final_access
    FROM public.feature_flags ff
    LEFT JOIN public.plans p ON p.id = v_final_plan_id
    LEFT JOIN public.plan_features pf ON pf.plan_id = v_final_plan_id AND pf.feature_key = ff.key
    WHERE (p_feature_key IS NULL OR ff.key = p_feature_key);
END;
$$;

-- Grant permissions for debug function
GRANT EXECUTE ON FUNCTION public.debug_feature_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_feature_access(UUID, TEXT) TO service_role;
