-- =====================================================
-- CREATE TEST USER RPC FUNCTION (COMPLETE)
-- Permite admins criar usuários de teste via RPC
-- =====================================================

-- Função para criar usuário de teste diretamente
-- Esta função NÃO pode criar usuários em auth.users (requer service_role_key)
-- Porém, pode atualizar perfis de usuários existentes

-- Atualiza a função para ser mais robusta
DROP FUNCTION IF EXISTS public.create_test_user_profile(text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_test_user_profile(
    p_email text,
    p_full_name text,
    p_role text DEFAULT 'user',
    p_subscription_status text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_admin boolean;
    v_profile_exists boolean;
BEGIN
    -- Verificar se o usuário que está chamando é admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Apenas administradores podem criar usuários de teste'
        );
    END IF;

    -- Verificar se já existe um usuário em auth.users com esse email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        -- Usuário existe em auth.users, verificar/criar perfil
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_user_id
        ) INTO v_profile_exists;
        
        IF v_profile_exists THEN
            -- Atualizar perfil existente
            UPDATE public.profiles
            SET 
                full_name = p_full_name,
                subscription_status = p_subscription_status,
                account_status = 'active',
                updated_at = now()
            WHERE id = v_user_id;
        ELSE
            -- Criar novo perfil
            INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status, created_at, updated_at)
            VALUES (v_user_id, p_email, p_full_name, p_subscription_status, 'active', now(), now());
        END IF;
        
        -- Gerenciar roles
        IF p_role = 'admin' THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (v_user_id, 'admin')
            ON CONFLICT (user_id, role) DO NOTHING;
        ELSE
            -- Remover role admin se existir
            DELETE FROM public.user_roles
            WHERE user_id = v_user_id AND role = 'admin';
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Perfil atualizado com sucesso',
            'user_id', v_user_id
        );
    ELSE
        -- Verificar se existe perfil órfão (sem auth.users correspondente)
        SELECT id INTO v_user_id
        FROM public.profiles
        WHERE email = p_email;
        
        IF v_user_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Perfil órfão encontrado. O usuário precisa fazer signup via /auth primeiro.',
                'note', 'Este perfil existe mas não tem conta de autenticação associada.'
            );
        END IF;
        
        -- Nenhum usuário ou perfil encontrado
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado. O usuário precisa fazer signup primeiro via /auth',
            'instructions', 'Peça ao usuário para criar uma conta em /auth com o email: ' || p_email
        );
    END IF;
END;
$$;

-- Grant execute para usuários autenticados
GRANT EXECUTE ON FUNCTION public.create_test_user_profile TO authenticated;

-- =====================================================
-- FUNÇÃO ALTERNATIVA: Listar usuários pendentes de perfil
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_users_without_profile()
RETURNS TABLE (
    user_id uuid,
    email text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem listar usuários';
    END IF;
    
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::text,
        au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
    ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_users_without_profile TO authenticated;

-- =====================================================
-- FUNÇÃO: Provisionar perfil para usuário existente
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_user_profile(
    p_user_id uuid,
    p_full_name text,
    p_role text DEFAULT 'user',
    p_subscription_status text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
    v_is_admin boolean;
BEGIN
    -- Verificar se é admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Apenas administradores podem provisionar perfis'
        );
    END IF;

    -- Obter email do usuário
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado em auth.users'
        );
    END IF;

    -- Criar ou atualizar perfil
    INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status, created_at, updated_at)
    VALUES (p_user_id, v_email, p_full_name, p_subscription_status, 'active', now(), now())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        subscription_status = EXCLUDED.subscription_status,
        account_status = 'active',
        updated_at = now();
    
    -- Gerenciar roles
    IF p_role = 'admin' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Perfil provisionado com sucesso',
        'user_id', p_user_id,
        'email', v_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_user_profile TO authenticated;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION public.create_test_user_profile IS 'Atualiza perfil de usuário existente (user deve existir em auth.users)';
COMMENT ON FUNCTION public.list_users_without_profile IS 'Lista usuários em auth.users que não têm perfil';
COMMENT ON FUNCTION public.provision_user_profile IS 'Cria perfil para um user_id específico que existe em auth.users';
