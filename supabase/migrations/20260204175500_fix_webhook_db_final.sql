-- MIGRATION: REPARO ULTRA-ROBUSTO STRIPE WEBHOOK
-- TIMESTAMP: 20260204175500
-- Segue PRINCÍPIO Nº 6 — MIGRATIONS INQUEBRÁVEIS

-- 1. Garantir que as permissões de administrador (Service Role) ignorem RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICA CRÍTICA: Usuário precisa conseguir LER seu próprio status!
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    -- Permitir que a service_role faça TUDO nas tabelas do sistema
    GRANT ALL ON public.profiles TO service_role;
    GRANT ALL ON public.user_roles TO service_role;
    GRANT ALL ON public.plan_prices TO service_role;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can manage all profiles') THEN
        CREATE POLICY "System can manage all profiles" ON public.profiles
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Limpar qualquer lixo de ID que possa causar erro no Stripe
UPDATE public.profiles 
SET stripe_customer_id = TRIM(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- 3. Garantir tabela de diagnóstico
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE,
    event_type TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Função Segura para o Webhook (SECURITY DEFINER ignora RLS)
-- Remove assinaturas antigas para evitar conflito de tipos
DROP FUNCTION IF EXISTS public.handle_stripe_subscription_update(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.handle_stripe_subscription_update(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.handle_stripe_subscription_update(
    p_email TEXT,
    p_customer_id TEXT,
    p_subscription_id TEXT,
    p_plan_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_valid_plan_id UUID;
BEGIN
    -- Tentar converter o plan_id com segurança (Try-Catch safe-casting)
    BEGIN
        IF p_plan_id IS NOT NULL AND p_plan_id <> '' THEN
            v_valid_plan_id := p_plan_id::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_valid_plan_id := NULL; -- Se o ID for inválido, ignora o plano mas segue a ativação
    END;

    -- Localizar usuário pelo email (MAIS ROBUSTO - ignorando espaços e case)
    SELECT id INTO v_user_id 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email)) 
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- ATIVAÇÃO CRÍTICA DO PERFIL (FORÇA BRUTA)
    UPDATE public.profiles
    SET 
        stripe_customer_id = p_customer_id,
        stripe_subscription_id = p_subscription_id,
        subscription_status = 'active', -- Garantido em minúsculo
        account_status = 'active',      -- Garantido em minúsculo
        current_plan_id = COALESCE(v_valid_plan_id, current_plan_id),
        updated_at = now()
    WHERE id = v_user_id;

    -- Garantir que o usuário tenha a role 'aluno' (Fundamental para acesso)
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'aluno') THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'aluno');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_stripe_subscription_update TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_stripe_subscription_update TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_stripe_subscription_update TO anon;
GRANT EXECUTE ON FUNCTION public.handle_stripe_subscription_update TO authenticated;

-- 5. Diagnóstico de Saúde do Stripe (Rode isso no SQL Editor para testar)
-- SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT 5;
