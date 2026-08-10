-- ================================================
-- RLS POLICIES WITH FEATURE FLAG CHECKS
-- ================================================

-- 1. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.can_user_create_content(flag_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.is_admin() OR (
        public.is_feature_enabled(flag_key) 
        AND public.is_user_content_allowed(flag_key)
    );
$$;

-- 2. UPDATE USER_DIETS POLICIES
DROP POLICY IF EXISTS "User owns diets or admin" ON public.user_diets;
DROP POLICY IF EXISTS "Users read own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users insert own diets with flag check" ON public.user_diets;
DROP POLICY IF EXISTS "Users update own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users delete own diets" ON public.user_diets;

CREATE POLICY "Users read own diets"
ON public.user_diets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own diets with flag check"
ON public.user_diets FOR INSERT TO authenticated
WITH CHECK (
    (user_id = auth.uid() AND public.can_user_create_content('user_custom_diets'))
    OR public.is_admin()
);

CREATE POLICY "Users update own diets"
ON public.user_diets FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users delete own diets"
ON public.user_diets FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- 3. UPDATE USER_WORKOUTS POLICIES
DROP POLICY IF EXISTS "User owns workouts or admin" ON public.user_workouts;
DROP POLICY IF EXISTS "Users read own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users insert own workouts with flag check" ON public.user_workouts;
DROP POLICY IF EXISTS "Users update own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users delete own workouts" ON public.user_workouts;

CREATE POLICY "Users read own workouts"
ON public.user_workouts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own workouts with flag check"
ON public.user_workouts FOR INSERT TO authenticated
WITH CHECK (
    (user_id = auth.uid() AND public.can_user_create_content('user_custom_workouts'))
    OR public.is_admin()
);

CREATE POLICY "Users update own workouts"
ON public.user_workouts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users delete own workouts"
ON public.user_workouts FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- 4. EXTRA INDEXES
CREATE INDEX IF NOT EXISTS idx_user_diets_user_id ON public.user_diets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workouts_user_id ON public.user_workouts(user_id);
