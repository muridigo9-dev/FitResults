-- =============================================
-- SISTEMA INTEGRADO DE TREINOS E PLANEJAMENTO
-- =============================================

-- 1. Extensão de workout_exercises para Supersets e Biblioteca
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS superset_id UUID,
ADD COLUMN IF NOT EXISTS rest_type TEXT DEFAULT 'individual' CHECK (rest_type IN ('individual', 'group')),
ADD COLUMN IF NOT EXISTS order_in_group INTEGER DEFAULT 0;

-- 2. Motor de Disponibilidade (Atribuições)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

DO $$ BEGIN
  CREATE TYPE visibility_scope AS ENUM ('plan', 'group', 'user', 'global');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.workout_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    scope visibility_scope NOT NULL,
    target_id UUID, -- ID do Plano, Grupo ou Aluno
    assigned_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workout_id, scope, target_id)
);

-- 3. Planejamento Individual (Agenda Semanal)
CREATE TABLE IF NOT EXISTS public.user_training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_training_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.user_training_plans(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    UNIQUE(plan_id, day_of_week, workout_id, display_order)
);

-- 4. Extensões para Session Exercises (Sentiment & Execution)
ALTER TABLE public.session_exercises
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('like', 'dislike', 'neutral')),
ADD COLUMN IF NOT EXISTS execution_order INTEGER;

-- 5. RLS Policies
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_plan_days ENABLE ROW LEVEL SECURITY;

-- Assignments: Admins manage, Users view
CREATE POLICY "Users can view own assignments" ON public.workout_assignments
FOR SELECT USING (
    scope = 'global' OR 
    (scope = 'user' AND target_id = auth.uid()) OR
    (scope = 'plan' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.plan_id = target_id)) OR
    (scope = 'group' AND EXISTS (SELECT 1 FROM public.user_group_members m WHERE m.user_id = auth.uid() AND m.group_id = target_id))
);

CREATE POLICY "Admins can manage assignments" ON public.workout_assignments
FOR ALL USING (public.is_admin());

-- Plans: Admins manage, Users view own
CREATE POLICY "Users can view own training plans" ON public.user_training_plans
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage training plans" ON public.user_training_plans
FOR ALL USING (public.is_admin() OR created_by = auth.uid());

-- Plan Days: Inherit from plans
CREATE POLICY "Users can view own training plan days" ON public.user_training_plan_days
FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_training_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins can manage training plan days" ON public.user_training_plan_days
FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.user_training_plans p WHERE p.id = plan_id AND p.created_by = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_assignments_target ON public.workout_assignments(target_id);
CREATE INDEX IF NOT EXISTS idx_user_training_plans_user ON public.user_training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_plan_days_plan ON public.user_training_plan_days(plan_id);
