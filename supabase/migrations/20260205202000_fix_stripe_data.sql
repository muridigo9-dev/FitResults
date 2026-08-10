-- Migration: Sanitização de Dados do Stripe
-- Objetivo: Remover espaços em branco e garantir fallbacks para o fluxo de checkout

-- 1. Limpar espaços em branco nos IDs de Preço (evita erros no Stripe)
UPDATE public.plan_prices
SET price_id = TRIM(price_id)
WHERE price_id IS NOT NULL;

-- 2. Limpar IDs de clientes Stripe nos perfis
UPDATE public.profiles
SET stripe_customer_id = TRIM(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- 3. Garantir que a tabela de configurações exista e tenha a estrutura correta (Idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_settings') THEN
        CREATE TABLE public.stripe_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stripe_mode TEXT DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
            is_connected BOOLEAN DEFAULT false,
            trial_days INTEGER DEFAULT 7,
            trial_enabled BOOLEAN DEFAULT true,
            trial_message TEXT,
            secret_key TEXT,
            webhook_secret TEXT,
            publishable_key TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Inserir registro inicial se estiver vazio
        INSERT INTO public.stripe_settings (stripe_mode, is_connected)
        VALUES ('test', false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 4. Criar índice para performance de busca por customer_id se não existir
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- 5. Garantir que os planos básicos globais existam (Fallbacks)
INSERT INTO public.plans (id, name, description, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Free', 'Plano gratuito básico', true),
    ('00000000-0000-0000-0000-000000000002', 'Pro', 'Acesso completo a todos os recursos', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = true;
