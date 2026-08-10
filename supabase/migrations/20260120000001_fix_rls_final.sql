-- ==============================================================================
-- MIGRATION: Final RLS Fix for Admin Persistence
-- ==============================================================================
-- Description: Explicitly grants FULL CRUD (Select, Insert, Update, Delete)
-- permissions to Admins for all content tables.
-- Logic: Uses efficient policies checking for 'admin' role in public.user_roles.
-- ==============================================================================

-- 1. Exercises
DROP POLICY IF EXISTS "Admins have full control exercises" ON public.exercises;
CREATE POLICY "Admins have full control exercises" ON public.exercises
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Workouts
DROP POLICY IF EXISTS "Admins have full control workouts" ON public.workouts;
CREATE POLICY "Admins have full control workouts" ON public.workouts
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Dishes
DROP POLICY IF EXISTS "Admins have full control dishes" ON public.dishes;
CREATE POLICY "Admins have full control dishes" ON public.dishes
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. Diet Plans
DROP POLICY IF EXISTS "Admins have full control diet_plans" ON public.diet_plans;
CREATE POLICY "Admins have full control diet_plans" ON public.diet_plans
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. Challenges
DROP POLICY IF EXISTS "Admins have full control challenges" ON public.challenges;
CREATE POLICY "Admins have full control challenges" ON public.challenges
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
