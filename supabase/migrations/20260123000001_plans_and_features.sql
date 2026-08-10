-- ============================================================
-- PLANOS FREE E PRO COM FEATURES ASSOCIADAS
-- Migration: 20260123000001_plans_and_features.sql
-- ============================================================
-- Cria planos Free e Pro com features diferenciadas
-- Atribui plano Free a usuários sem plano
-- Sincroniza current_plan_id com user_subscriptions
-- ============================================================

-- IDs fixos para referência consistente
-- Free: 00000000-0000-0000-0000-000000000001
-- Pro:  00000000-0000-0000-0000-000000000002

-- ============================================
-- PART 0: ENSURE REQUIRED TABLES EXIST
-- ============================================

-- Ensure current_plan_id column exists on profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- Create plan_features table if not exists (may be created later by RBAC migration, but we need it now)
CREATE TABLE IF NOT EXISTS public.plan_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(plan_id, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- RLS policies for plan_features (idempotent)
DROP POLICY IF EXISTS "Admin manages plan features" ON public.plan_features;
CREATE POLICY "Admin manages plan features"
ON public.plan_features FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read plan features" ON public.plan_features;
CREATE POLICY "Users read plan features"
ON public.plan_features FOR SELECT TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);

-- Create user_subscriptions table if not exists
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active',
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, plan_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users read own subscriptions"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admin manages subscriptions"
ON public.user_subscriptions FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- ============================================
-- PART 1: CRIAR PLANOS
-- ============================================

INSERT INTO public.plans (id, name, description, is_active, display_order, features)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Free', 'Plano gratuito com funcionalidades básicas', true, 0, 
   '["Ver treinos", "Ver exercícios", "Ver dietas"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'Pro', 'Plano completo com todas as funcionalidades', true, 1,
   '["Tudo do Free", "Criar treinos", "Criar dietas", "Desafios", "Hábitos", "Suporte prioritário"]'::jsonb)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = now();

-- ============================================
-- PART 2: FEATURES DO PLANO FREE
-- ============================================
-- Apenas visualização de conteúdo básico

INSERT INTO public.plan_features (plan_id, feature_key, enabled)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'exercises_enabled', true),
  ('00000000-0000-0000-0000-000000000001', 'training_mode_enabled', true),
  ('00000000-0000-0000-0000-000000000001', 'diets_enabled', true)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ============================================
-- PART 3: FEATURES DO PLANO PRO
-- ============================================
-- Todas as features habilitadas

INSERT INTO public.plan_features (plan_id, feature_key, enabled)
VALUES 
  -- Core features
  ('00000000-0000-0000-0000-000000000002', 'exercises_enabled', true),
  ('00000000-0000-0000-0000-000000000002', 'training_mode_enabled', true),
  ('00000000-0000-0000-0000-000000000002', 'diets_enabled', true),
  -- Premium features
  ('00000000-0000-0000-0000-000000000002', 'challenges_enabled', true),
  ('00000000-0000-0000-0000-000000000002', 'habits_enabled', true),
  -- User content creation
  ('00000000-0000-0000-0000-000000000002', 'user_custom_workouts', true),
  ('00000000-0000-0000-0000-000000000002', 'user_custom_diets', true),
  ('00000000-0000-0000-0000-000000000002', 'student_custom_meals_enabled', true)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ============================================
-- PART 4: ATRIBUIR PLANO FREE A USUÁRIOS SEM PLANO
-- ============================================

UPDATE public.profiles
SET current_plan_id = '00000000-0000-0000-0000-000000000001'
WHERE current_plan_id IS NULL;

-- ============================================
-- PART 5: TRIGGER PARA NOVOS USUÁRIOS
-- ============================================
-- Atribui plano Free automaticamente a novos usuários

CREATE OR REPLACE FUNCTION public.assign_default_plan()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Se não tem plano, atribui Free
  IF NEW.current_plan_id IS NULL THEN
    NEW.current_plan_id := '00000000-0000-0000-0000-000000000001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_default_plan_trigger ON public.profiles;
CREATE TRIGGER assign_default_plan_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_default_plan();

-- ============================================
-- PART 6: SINCRONIZAR COM USER_SUBSCRIPTIONS
-- ============================================
-- Mantém user_subscriptions em sync para can_view_content funcionar

CREATE OR REPLACE FUNCTION public.sync_plan_to_subscriptions()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Só sincroniza se current_plan_id mudou
  IF NEW.current_plan_id IS DISTINCT FROM OLD.current_plan_id AND NEW.current_plan_id IS NOT NULL THEN
    
    -- Desativar assinaturas anteriores
    UPDATE public.user_subscriptions 
    SET status = 'cancelled', updated_at = now()
    WHERE user_id = NEW.id AND status = 'active';
    
    -- Criar/atualizar nova assinatura
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, created_at)
    VALUES (NEW.id, NEW.current_plan_id, 'active', now())
    ON CONFLICT (user_id, plan_id) DO UPDATE 
    SET status = 'active', updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_plan_subscriptions ON public.profiles;
CREATE TRIGGER sync_plan_subscriptions
AFTER INSERT OR UPDATE OF current_plan_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_plan_to_subscriptions();

-- ============================================
-- PART 7: SINCRONIZAR USUÁRIOS EXISTENTES
-- ============================================
-- Cria entradas em user_subscriptions para usuários que já têm plano

INSERT INTO public.user_subscriptions (user_id, plan_id, status, created_at)
SELECT p.id, p.current_plan_id, 'active', now()
FROM public.profiles p
WHERE p.current_plan_id IS NOT NULL
ON CONFLICT (user_id, plan_id) DO UPDATE 
SET status = 'active', updated_at = now();

-- ============================================
-- DONE
-- ============================================
DO $$ BEGIN 
  RAISE NOTICE 'Plans and features migration completed successfully';
  RAISE NOTICE 'Free Plan ID: 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Pro Plan ID: 00000000-0000-0000-0000-000000000002';
END $$;
