-- =====================================================
-- FEATURE FLAGS PUBLIC ACCESS & AUTH FIX
-- Arquivo: 20260205000005_feature_flags_public_access.sql
-- Objetivo: Permitir que certas flags (como as de Auth) 
-- sejam visíveis para usuários deslogados (anon).
-- =====================================================

-- 1. Adicionar coluna public_access
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS public_access BOOLEAN DEFAULT FALSE;

-- 2. Marcar flags de autenticação como públicas
UPDATE public.feature_flags 
SET public_access = TRUE 
WHERE key IN ('google_auth_enabled', 'facebook_auth_enabled', 'magic_link_enabled');

-- 3. Atualizar RLS para permitir leitura pública das flags
DROP POLICY IF EXISTS "Anyone reads feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Users read feature flags" ON public.feature_flags;

CREATE POLICY "Anyone reads feature flags"
ON public.feature_flags FOR SELECT TO anon, authenticated
USING (true);

-- 4. Atualizar a função de gating hierárquico para suportar acesso público
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
    -- Certas features (como botões de login) devem ser visíveis para visitantes
    IF v_public_access = true THEN
        RETURN true;
    END IF;
    
    -- Se não houver usuário logado e a flag não for pública, nega acesso
    IF user_id_param IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Super Admin Bypass (Level 0.5)
    -- Admins ignoram limites de plano, mas respeitam o Kill Switch Global (já checado)
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

    -- 5. Verificação de Entitlement por Plano
    -- Se não encontrar nenhum plano, acesso negado
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

-- 5. Garantir permissões de execução para o papel anon
GRANT EXECUTE ON FUNCTION public.get_active_features() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_active_for_user(TEXT, UUID) TO anon, authenticated;
