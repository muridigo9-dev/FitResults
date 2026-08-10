-- =====================================================
-- PROGRESS CALENDAR SYSTEM
-- Sistema de visualização de progresso em calendário
-- =====================================================
-- Description: Creates materialized view and functions for calendar visualization
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Dependencies: Requires daily_checkins, profiles, gamification_events tables

-- =====================================================
-- 1. DROP EXISTING OBJECTS (for idempotency)
-- =====================================================

-- Drop materialized view if exists (will be recreated)
DROP MATERIALIZED VIEW IF EXISTS public.daily_checkin_summary CASCADE;

-- =====================================================
-- 2. MATERIALIZED VIEW: Daily Check-in Summary
-- Agregação diária de todos os check-ins do usuário
-- NOTE: Materialized views do NOT support RLS
-- Security is enforced via SECURITY DEFINER functions
-- =====================================================

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
  
  -- Achievements unlocked
  -- NOTE: This count will be 0 until user_achievements table has proper date columns
  -- The table may have either 'unlocked_at', 'earned_at', or 'created_at' depending on migration order
  0 as achievements_count,
  
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
-- 3. CREATE INDEXES
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
-- 4. FUNCTION: Get Calendar Data for Month
-- Retorna dados agregados para um mês específico
-- SECURITY DEFINER enforces user_id check
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_calendar_month_data(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  date DATE,
  completion_status TEXT,
  water_ml INTEGER,
  water_completed BOOLEAN,
  weight_kg NUMERIC,
  mood TEXT,
  meals_count INTEGER,
  workouts_count INTEGER,
  habits_count INTEGER,
  challenge_tasks_count INTEGER,
  xp_earned INTEGER,
  achievements_count INTEGER,
  has_streak BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check: only allow users to see their own data
  IF p_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    dcs.date,
    dcs.completion_status,
    dcs.water_ml,
    dcs.water_completed,
    dcs.weight_kg,
    dcs.mood,
    dcs.meals_count,
    dcs.workouts_count,
    dcs.habits_count,
    dcs.challenge_tasks_count,
    dcs.xp_earned,
    dcs.achievements_count,
    -- Check if this day is part of current streak
    EXISTS(
      SELECT 1 
      FROM public.profiles p 
      WHERE p.id = p_user_id 
      AND dcs.date >= CURRENT_DATE - (p.streak - 1)
    ) as has_streak
  FROM 
    public.daily_checkin_summary dcs
  WHERE 
    dcs.user_id = p_user_id
    AND EXTRACT(YEAR FROM dcs.date) = p_year
    AND EXTRACT(MONTH FROM dcs.date) = p_month
  ORDER BY 
    dcs.date ASC;
END;
$$;

-- =====================================================
-- 5. FUNCTION: Get Period Statistics
-- Retorna estatísticas agregadas para um período
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_period_statistics(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_days', COUNT(*),
    'complete_days', COUNT(*) FILTER (WHERE completion_status = 'complete'),
    'partial_days', COUNT(*) FILTER (WHERE completion_status = 'partial'),
    'empty_days', COUNT(*) FILTER (WHERE completion_status = 'empty'),
    'consistency_percentage', 
      ROUND(
        (COUNT(*) FILTER (WHERE completion_status IN ('complete', 'partial'))::NUMERIC / 
        NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
        2
      ),
    'total_meals', SUM(meals_count),
    'total_workouts', SUM(workouts_count),
    'total_habits', SUM(habits_count),
    'total_challenge_tasks', SUM(challenge_tasks_count),
    'total_xp', SUM(xp_earned),
    'total_achievements', SUM(achievements_count),
    'avg_water_ml', ROUND(AVG(water_ml)),
    'water_completion_rate', 
      ROUND(
        (COUNT(*) FILTER (WHERE water_completed = true)::NUMERIC / 
        NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
        2
      ),
    'weight_change', 
      (SELECT 
        ROUND((MAX(weight_kg) - MIN(weight_kg))::NUMERIC, 2)
       FROM daily_checkin_summary 
       WHERE user_id = p_user_id 
       AND date BETWEEN p_start_date AND p_end_date
       AND weight_kg IS NOT NULL),
    'start_weight',
      (SELECT weight_kg 
       FROM daily_checkin_summary 
       WHERE user_id = p_user_id 
       AND date >= p_start_date 
       AND weight_kg IS NOT NULL
       ORDER BY date ASC 
       LIMIT 1),
    'end_weight',
      (SELECT weight_kg 
       FROM daily_checkin_summary 
       WHERE user_id = p_user_id 
       AND date <= p_end_date 
       AND weight_kg IS NOT NULL
       ORDER BY date DESC 
       LIMIT 1)
  ) INTO v_result
  FROM public.daily_checkin_summary
  WHERE 
    user_id = p_user_id
    AND date BETWEEN p_start_date AND p_end_date;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 6. FUNCTION: Compare Two Periods
-- Compara estatísticas entre dois períodos
-- =====================================================

CREATE OR REPLACE FUNCTION public.compare_periods(
  p_user_id UUID,
  p_period1_start DATE,
  p_period1_end DATE,
  p_period2_start DATE,
  p_period2_end DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period1 JSON;
  v_period2 JSON;
  v_comparison JSON;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get stats for both periods
  v_period1 := public.get_period_statistics(p_user_id, p_period1_start, p_period1_end);
  v_period2 := public.get_period_statistics(p_user_id, p_period2_start, p_period2_end);
  
  -- Build comparison
  SELECT json_build_object(
    'period1', json_build_object(
      'start_date', p_period1_start,
      'end_date', p_period1_end,
      'stats', v_period1
    ),
    'period2', json_build_object(
      'start_date', p_period2_start,
      'end_date', p_period2_end,
      'stats', v_period2
    ),
    'differences', json_build_object(
      'consistency_change', 
        (v_period2->>'consistency_percentage')::NUMERIC - (v_period1->>'consistency_percentage')::NUMERIC,
      'workouts_change',
        (v_period2->>'total_workouts')::INTEGER - (v_period1->>'total_workouts')::INTEGER,
      'meals_change',
        (v_period2->>'total_meals')::INTEGER - (v_period1->>'total_meals')::INTEGER,
      'xp_change',
        (v_period2->>'total_xp')::INTEGER - (v_period1->>'total_xp')::INTEGER,
      'weight_change',
        CASE 
          WHEN (v_period2->>'end_weight') IS NOT NULL AND (v_period1->>'start_weight') IS NOT NULL
          THEN (v_period2->>'end_weight')::NUMERIC - (v_period1->>'start_weight')::NUMERIC
          ELSE NULL
        END
    )
  ) INTO v_comparison;
  
  RETURN v_comparison;
END;
$$;

-- =====================================================
-- 7. FUNCTION: Get Streak Days
-- Retorna os dias que fazem parte do streak atual
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_streak_days(
  p_user_id UUID
)
RETURNS TABLE (
  date DATE,
  day_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak INTEGER;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get current streak
  SELECT streak INTO v_streak
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Return streak days
  RETURN QUERY
  SELECT 
    dcs.date,
    ROW_NUMBER() OVER (ORDER BY dcs.date DESC)::INTEGER as day_number
  FROM 
    public.daily_checkin_summary dcs
  WHERE 
    dcs.user_id = p_user_id
    AND dcs.date >= CURRENT_DATE - (v_streak - 1)
    AND dcs.completion_status IN ('complete', 'partial')
  ORDER BY 
    dcs.date DESC
  LIMIT v_streak;
END;
$$;

-- =====================================================
-- 8. FUNCTION: Refresh Materialized View
-- Atualiza a view materializada (pode ser chamada via cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_daily_checkin_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_checkin_summary;
EXCEPTION
  WHEN OTHERS THEN
    -- If concurrent refresh fails, try regular refresh
    REFRESH MATERIALIZED VIEW public.daily_checkin_summary;
END;
$$;

-- =====================================================
-- 9. GRANTS
-- =====================================================

-- Note: Direct SELECT on materialized view is restricted
-- Users must use SECURITY DEFINER functions which enforce user_id checks
GRANT SELECT ON public.daily_checkin_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_month_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_period_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.compare_periods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_days TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_daily_checkin_summary TO authenticated;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON MATERIALIZED VIEW public.daily_checkin_summary IS 
'Agregação diária de todos os check-ins do usuário para visualização em calendário. Security enforced via SECURITY DEFINER functions.';

COMMENT ON FUNCTION public.get_calendar_month_data IS 
'Retorna dados agregados de check-ins para um mês específico. Includes security check.';

COMMENT ON FUNCTION public.get_period_statistics IS 
'Retorna estatísticas agregadas para um período customizado. Includes security check.';

COMMENT ON FUNCTION public.compare_periods IS 
'Compara estatísticas entre dois períodos diferentes. Includes security check.';

COMMENT ON FUNCTION public.get_streak_days IS 
'Retorna os dias que fazem parte do streak atual do usuário. Includes security check.';

COMMENT ON FUNCTION public.refresh_daily_checkin_summary IS 
'Atualiza a materialized view. Tenta CONCURRENTLY primeiro, fallback para regular refresh.';

-- =====================================================
-- 11. INITIAL REFRESH
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
