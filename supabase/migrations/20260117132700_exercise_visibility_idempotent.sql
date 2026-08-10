-- ============================================
-- EXERCISE VISIBILITY SYSTEM (IDEMPOTENT)
-- ============================================
-- Description: Implementa tabelas para gerenciar visibilidade de exercícios por planos e academias.
-- Created: 2026-01-17
-- Idempotent: Safe to run multiple times
-- Dependencies: Requires public.exercises, public.plans, public.academies

-- 1. CREATE TABLES (IF NOT EXISTS)

-- Tabela: exercise_plans (Muitos-para-Muitos entre Exercícios e Planos)
CREATE TABLE IF NOT EXISTS public.exercise_plans (
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (exercise_id, plan_id)
);

-- Tabela: plan_academies (Muitos-para-Muitos entre Planos e Academias)
CREATE TABLE IF NOT EXISTS public.plan_academies (
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (plan_id, academy_id)
);

-- 2. ENABLE RLS
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_academies ENABLE ROW LEVEL SECURITY;

-- 3. DROP OLD POLICIES (IF ANY)
DROP POLICY IF EXISTS "Allow public read for exercise_plans" ON public.exercise_plans;
DROP POLICY IF EXISTS "Admin manages exercise_plans" ON public.exercise_plans;
DROP POLICY IF EXISTS "Allow public read for plan_academies" ON public.plan_academies;
DROP POLICY IF EXISTS "Admin manages plan_academies" ON public.plan_academies;

-- 4. CREATE NEW POLICIES

-- Policies para exercise_plans
CREATE POLICY "Allow public read for exercise_plans" 
ON public.exercise_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages exercise_plans" 
ON public.exercise_plans FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para plan_academies
CREATE POLICY "Allow public read for plan_academies" 
ON public.plan_academies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages plan_academies" 
ON public.plan_academies FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. CREATE INDEXES (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_exercise_plans_exercise_id ON public.exercise_plans(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_plans_plan_id ON public.exercise_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_academies_plan_id ON public.plan_academies(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_academies_academy_id ON public.plan_academies(academy_id);

-- 6. COMMENTS
COMMENT ON TABLE public.exercise_plans IS 'Relaciona exercícios aos planos de assinatura (Modo Normal/B2C)';
COMMENT ON TABLE public.plan_academies IS 'Relaciona planos às academias permitidas (Modo Academias/B2B)';
