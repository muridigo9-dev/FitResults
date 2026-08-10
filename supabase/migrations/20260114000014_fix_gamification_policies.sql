-- ============================================
-- FIX: Gamification System Policies
-- ============================================
-- Description: Adiciona DROP POLICY IF EXISTS para tornar idempotente
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Fixes: 20260114000006_advanced_gamification_system.sql

-- ============================================
-- ACHIEVEMENTS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view active achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

-- Recreate policies
CREATE POLICY "Everyone can view active achievements"
ON public.achievements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- BADGES POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view active badges" ON public.badges;
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;

-- Recreate policies
CREATE POLICY "Everyone can view active badges"
ON public.badges FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- USER ACHIEVEMENTS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Admins can view all achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can grant achievements" ON public.user_achievements;

-- Recreate policies
CREATE POLICY "Users can view own achievements"
ON public.user_achievements FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all achievements"
ON public.user_achievements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can grant achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (true);

-- ============================================
-- USER BADGES POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Admins can view all badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can toggle badge display" ON public.user_badges;

-- Recreate policies
CREATE POLICY "Users can view own badges"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all badges"
ON public.user_badges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can toggle badge display"
ON public.user_badges FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- LEADERBOARD POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "System can update leaderboard" ON public.leaderboard;

-- Recreate policies
CREATE POLICY "Everyone can view leaderboard"
ON public.leaderboard FOR SELECT
USING (true);

CREATE POLICY "System can update leaderboard"
ON public.leaderboard FOR ALL
WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Everyone can view active achievements" ON public.achievements IS 
'Allows all users to view active achievements for discovery';

COMMENT ON POLICY "Admins can manage achievements" ON public.achievements IS 
'Allows admins to create, update, and delete achievements';

COMMENT ON POLICY "Everyone can view active badges" ON public.badges IS 
'Allows all users to view active badges for discovery';

COMMENT ON POLICY "Admins can manage badges" ON public.badges IS 
'Allows admins to create, update, and delete badges';

COMMENT ON POLICY "Users can view own achievements" ON public.user_achievements IS 
'Allows users to view their own unlocked achievements';

COMMENT ON POLICY "Users can view own badges" ON public.user_badges IS 
'Allows users to view their own earned badges';

COMMENT ON POLICY "Everyone can view leaderboard" ON public.leaderboard IS 
'Allows all users to view the global leaderboard for competition';
