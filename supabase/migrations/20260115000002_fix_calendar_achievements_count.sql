-- =====================================================
-- FIX: Update Progress Calendar View with Achievements
-- =====================================================
-- Description: Updates daily_checkin_summary view to include achievements count
--              This migration runs AFTER 20260114000017_fix_achievements_schema.sql
--              which ensures unlocked_at column exists
-- Created: 2026-01-15
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260114000017_fix_achievements_schema.sql (unlocked_at column must exist)

-- =====================================================
-- 1. DROP AND RECREATE MATERIALIZED VIEW
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.daily_checkin_summary CASCADE;

CREATE MATERIALIZED VIEW public.daily_checkin_summary AS
SELECT 
  c.user_id,
  c.date,
  -- Check-in completion
  CASE 
    WHEN c.status = 'complete' THEN 'complete'
    WHEN c.water_current > 0 OR c.weight IS NOT NULL OR c.mood IS NOT NULL THEN 'partial'
    ELSE 'empty'
  END as completion_status,
  
  -- Water
  c.water_current as water_ml,
  c.water_goal as water_goal_ml,
  CASE WHEN c.water_current >= c.water_goal THEN true ELSE false END as water_completed,
  
  -- Weight
  c.weight as weight_kg,
  
  -- Mood
  c.mood::text as mood,
  
  -- Meals count
  (SELECT COUNT(*) FROM public.checkin_meals cm WHERE cm.checkin_id = c.id) as meals_count,
  
  -- Workouts count
  (SELECT COUNT(*) FROM public.checkin_workouts cw WHERE cw.checkin_id = c.id) as workouts_count,
  
  -- Habits count
  0 as habits_count, -- No habits table yet
  
  -- Challenge tasks count
  (SELECT COUNT(*) FROM public.checkin_challenge_tasks cct WHERE cct.checkin_id = c.id) as challenge_tasks_count,
  
  -- Total XP earned
  COALESCE(
    (SELECT SUM(xp_gained) 
     FROM public.gamification_events ge 
     WHERE ge.user_id = c.user_id 
     AND ge.created_at::date = c.date),
    0
  ) as xp_earned,
  
  -- Achievements unlocked (now using unlocked_at column)
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.user_achievements ua 
     WHERE ua.user_id = c.user_id 
     AND ua.unlocked_at IS NOT NULL
     AND ua.unlocked_at::date = c.date),
    0
  ) as achievements_count,
  
  -- Timestamps
  c.created_at,
  c.updated_at
FROM 
  public.daily_checkins c
WHERE 
  c.date >= CURRENT_DATE - INTERVAL '2 years' -- Limit to last 2 years for performance
ORDER BY 
  c.user_id, c.date DESC;

-- =====================================================
-- 2. RECREATE INDEXES
-- =====================================================

-- Create unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_checkin_summary_unique 
ON public.daily_checkin_summary(user_id, date);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_daily_checkin_summary_user_date 
ON public.daily_checkin_summary(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_summary_completion 
ON public.daily_checkin_summary(user_id, completion_status);

-- =====================================================
-- 3. REFRESH VIEW
-- =====================================================

-- Refresh the materialized view with data
DO $$
BEGIN
  REFRESH MATERIALIZED VIEW public.daily_checkin_summary;
EXCEPTION
  WHEN OTHERS THEN
    -- If refresh fails (e.g., no data yet), just skip
    RAISE NOTICE 'Could not refresh materialized view: %', SQLERRM;
END $$;

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON MATERIALIZED VIEW public.daily_checkin_summary IS 
'Agregação diária de todos os check-ins do usuário para visualização em calendário. Security enforced via SECURITY DEFINER functions. Updated to include achievements count using unlocked_at column.';
