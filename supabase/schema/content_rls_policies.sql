-- ================================================
-- RLS POLICIES FOR CONTENT TABLES WITH FEATURE FLAG CHECKS
-- Ensures user content creation is only allowed when feature flags permit
-- ================================================

-- ==========================================
-- HELPER FUNCTION: Check if user can create content
-- ==========================================
CREATE OR REPLACE FUNCTION public.can_user_create_content(flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_admin() 
        OR (
            public.is_feature_enabled(flag_key) 
            AND public.is_user_content_allowed(flag_key)
        );
$$;

-- ==========================================
-- USER_DIETS TABLE POLICIES
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users read own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users insert own diets with flag check" ON public.user_diets;
DROP POLICY IF EXISTS "Users update own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users delete own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Admin manages all user diets" ON public.user_diets;

-- SELECT: Users can read their own diets
CREATE POLICY "Users read own diets"
ON public.user_diets
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

-- INSERT: Users can only insert if feature flag allows user content
CREATE POLICY "Users insert own diets with flag check"
ON public.user_diets
FOR INSERT
TO authenticated
WITH CHECK (
    (
        user_id = auth.uid()
        AND public.can_user_create_content('user_custom_diets')
    )
    OR public.is_admin()
);

-- UPDATE: Users can update their own diets (existing content remains editable)
CREATE POLICY "Users update own diets"
ON public.user_diets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: Users can delete their own diets
CREATE POLICY "Users delete own diets"
ON public.user_diets
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ==========================================
-- USER_WORKOUTS TABLE POLICIES
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users read own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users insert own workouts with flag check" ON public.user_workouts;
DROP POLICY IF EXISTS "Users update own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users delete own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Admin manages all user workouts" ON public.user_workouts;

-- SELECT: Users can read their own workouts
CREATE POLICY "Users read own workouts"
ON public.user_workouts
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

-- INSERT: Users can only insert if feature flag allows user content
CREATE POLICY "Users insert own workouts with flag check"
ON public.user_workouts
FOR INSERT
TO authenticated
WITH CHECK (
    (
        user_id = auth.uid()
        AND public.can_user_create_content('user_custom_workouts')
    )
    OR public.is_admin()
);

-- UPDATE: Users can update their own workouts (existing content remains editable)
CREATE POLICY "Users update own workouts"
ON public.user_workouts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: Users can delete their own workouts
CREATE POLICY "Users delete own workouts"
ON public.user_workouts
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ==========================================
-- DIETS TABLE POLICIES (System/Admin Content)
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone reads active diets" ON public.diets;
DROP POLICY IF EXISTS "Admin manages diets" ON public.diets;

-- SELECT: All authenticated users can read active diets
CREATE POLICY "Anyone reads active diets"
ON public.diets
FOR SELECT
TO authenticated
USING (
    is_active = true
    OR public.is_admin()
);

-- INSERT/UPDATE/DELETE: Only admin can manage system diets
CREATE POLICY "Admin manages diets"
ON public.diets
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==========================================
-- WORKOUTS TABLE POLICIES (System/Admin Content)
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone reads active workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admin manages workouts" ON public.workouts;

-- SELECT: All authenticated users can read active workouts
CREATE POLICY "Anyone reads active workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (
    is_active = true
    OR public.is_admin()
);

-- INSERT/UPDATE/DELETE: Only admin can manage system workouts
CREATE POLICY "Admin manages workouts"
ON public.workouts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==========================================
-- CHALLENGES TABLE POLICIES
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone reads active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admin manages challenges" ON public.challenges;

-- SELECT: All authenticated users can read active challenges (when feature is enabled)
CREATE POLICY "Anyone reads active challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING (
    (is_active = true AND public.is_feature_enabled('challenges_enabled'))
    OR public.is_admin()
);

-- INSERT/UPDATE/DELETE: Only admin can manage challenges
CREATE POLICY "Admin manages challenges"
ON public.challenges
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==========================================
-- ENABLE RLS ON ALL TABLES (if not already)
-- ==========================================
ALTER TABLE public.user_diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_user_diets_user_id ON public.user_diets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workouts_user_id ON public.user_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_diets_is_active ON public.diets(is_active);
CREATE INDEX IF NOT EXISTS idx_workouts_is_active ON public.workouts(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON public.challenges(is_active);
