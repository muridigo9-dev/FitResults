-- ==============================================================================
-- MIGRATION: Emergency Admin Permissions & Persistence Fix (CORRECTED)
-- ==============================================================================
-- 1. Ensures 'visibility' column exists and 'visibility_type' is gone.
-- 2. Grants FULL CRUD permissions to Admins on all content tables.
-- 3. Removed invalid 'super_admin' references (ContentCreatorType Enum is strict).
-- ==============================================================================

-- 1. SCHEMA CLEANUP (Idempotent)
DO $$ 
BEGIN
    -- Exercises
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'visibility_type') THEN
        ALTER TABLE public.exercises DROP COLUMN visibility_type;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'visibility') THEN
        ALTER TABLE public.exercises ADD COLUMN visibility text DEFAULT 'global';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'plan_ids') THEN
        ALTER TABLE public.exercises ADD COLUMN plan_ids text[] DEFAULT '{}';
    END IF;

    -- Update NULLs
    UPDATE public.exercises SET visibility = 'global' WHERE visibility IS NULL;
END $$;

-- 2. DATA CLEANUP - SKIPPED
-- Since 'created_by_type' is a native ENUM, it cannot contain 'super_admin'.
-- No manual update needed.

-- 3. ADMIN POLICIES (FULL ACCESS)
-- Using only valid 'admin' role.

-- EXERCISES
DROP POLICY IF EXISTS "Admins have full control exercises" ON public.exercises;
CREATE POLICY "Admins have full control exercises" ON public.exercises
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- WORKOUTS
DROP POLICY IF EXISTS "Admins have full control workouts" ON public.workouts;
CREATE POLICY "Admins have full control workouts" ON public.workouts
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- DISHES
DROP POLICY IF EXISTS "Admins have full control dishes" ON public.dishes;
CREATE POLICY "Admins have full control dishes" ON public.dishes
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- DIET PLANS
DROP POLICY IF EXISTS "Admins have full control diet_plans" ON public.diet_plans;
CREATE POLICY "Admins have full control diet_plans" ON public.diet_plans
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- CHALLENGES
DROP POLICY IF EXISTS "Admins have full control challenges" ON public.challenges;
CREATE POLICY "Admins have full control challenges" ON public.challenges
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. ENSURE INDEXES
CREATE INDEX IF NOT EXISTS idx_exercises_visibility_2 ON public.exercises(visibility);
