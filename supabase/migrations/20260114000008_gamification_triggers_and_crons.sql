-- =====================================================
-- 0. ENABLE EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 1. TRIGGER: Auto-check achievements on checkin
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check achievements for checkin_completed event
  PERFORM public.check_achievement_progress(NEW.user_id, 'checkin_completed');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_achievements_after_checkin ON public.daily_checkins;

CREATE TRIGGER check_achievements_after_checkin
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW
WHEN (NEW.status = 'complete')
EXECUTE FUNCTION public.trigger_check_achievements_on_checkin();

-- =====================================================
-- 2. TRIGGER: Auto-check achievements on workout
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_workout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check achievements for workout_completed event
  PERFORM public.check_achievement_progress(NEW.user_id, 'workout_completed');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_achievements_after_workout ON public.checkin_workouts;

CREATE TRIGGER check_achievements_after_workout
AFTER INSERT ON public.checkin_workouts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_achievements_on_workout();

-- =====================================================
-- 3. TRIGGER: Auto-check achievements on challenge
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check achievements for challenge_completed event
  IF NEW.status = 'completed' THEN
    PERFORM public.check_achievement_progress(NEW.user_id, 'challenge_completed');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_achievements_after_challenge ON public.user_challenge_progress;

CREATE TRIGGER check_achievements_after_challenge
AFTER UPDATE ON public.user_challenge_progress
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION public.trigger_check_achievements_on_challenge();

-- =====================================================
-- 4. TRIGGER: Auto-check achievements on weight loss
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_weight()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_weight NUMERIC;
  v_weight_lost NUMERIC;
BEGIN
  -- Only check if weight is provided
  IF NEW.weight IS NOT NULL THEN
    -- Get first weight recorded
    SELECT weight INTO v_first_weight
    FROM public.daily_checkins
    WHERE user_id = NEW.user_id
    AND weight IS NOT NULL
    ORDER BY date ASC
    LIMIT 1;
    
    -- Calculate weight lost
    IF v_first_weight IS NOT NULL THEN
      v_weight_lost := v_first_weight - NEW.weight;
      
      -- Check achievements based on weight lost
      IF v_weight_lost >= 1 THEN
        PERFORM public.check_achievement_progress(NEW.user_id, 'weight_loss_1kg');
      END IF;
      
      IF v_weight_lost >= 5 THEN
        PERFORM public.check_achievement_progress(NEW.user_id, 'weight_loss_5kg');
      END IF;
      
      IF v_weight_lost >= 10 THEN
        PERFORM public.check_achievement_progress(NEW.user_id, 'weight_loss_10kg');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_achievements_after_weight ON public.daily_checkins;

CREATE TRIGGER check_achievements_after_weight
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW
WHEN (NEW.weight IS NOT NULL)
EXECUTE FUNCTION public.trigger_check_achievements_on_weight();

-- =====================================================
-- 5. TRIGGER: Auto-refresh leaderboard on XP change
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_refresh_leaderboard_on_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh leaderboard ranks for affected user
  PERFORM public.refresh_leaderboard_ranks();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_leaderboard_after_xp ON public.gamification_events;

CREATE TRIGGER refresh_leaderboard_after_xp
AFTER INSERT OR UPDATE ON public.gamification_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_refresh_leaderboard_on_xp();

-- =====================================================
-- 6. CRON JOBS: Safe Scheduling
-- =====================================================

DO $$
BEGIN
  -- 6.1 Refresh leaderboard ranks (every 5 minutes)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-leaderboard-ranks';
  PERFORM cron.schedule(
    'refresh-leaderboard-ranks',
    '*/5 * * * *',
    'SELECT public.refresh_leaderboard_ranks()'
  );

  -- 6.2 Reset daily XP (every day at midnight)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reset-daily-xp';
  PERFORM cron.schedule(
    'reset-daily-xp',
    '0 0 * * *',
    'SELECT public.reset_daily_xp()'
  );

  -- 6.3 Reset weekly XP (every Monday at midnight)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reset-weekly-xp';
  PERFORM cron.schedule(
    'reset-weekly-xp',
    '0 0 * * 1',
    'SELECT public.reset_weekly_xp()'
  );

  -- 6.4 Reset monthly XP (first day of month at midnight)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reset-monthly-xp';
  PERFORM cron.schedule(
    'reset-monthly-xp',
    '0 0 1 * *',
    'SELECT public.reset_monthly_xp()'
  );

  -- 6.5 Refresh daily checkin summary (every hour)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-daily-checkin-summary';
  PERFORM cron.schedule(
    'refresh-daily-checkin-summary',
    '0 * * * *',
    'SELECT public.refresh_daily_checkin_summary()'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting up cron jobs: %', SQLERRM;
END $$;

-- =====================================================
-- 11. FUNCTION: Manual trigger for all achievements
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check all achievement types
  PERFORM public.check_achievement_progress(p_user_id, 'checkin_completed');
  PERFORM public.check_achievement_progress(p_user_id, 'workout_completed');
  PERFORM public.check_achievement_progress(p_user_id, 'challenge_completed');
  PERFORM public.check_achievement_progress(p_user_id, 'weight_loss_1kg');
  PERFORM public.check_achievement_progress(p_user_id, 'weight_loss_5kg');
  PERFORM public.check_achievement_progress(p_user_id, 'weight_loss_10kg');
END;
$$;

-- =====================================================
-- 12. FUNCTION: Get cron job status
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_cron_jobs_status()
RETURNS TABLE (
  jobname TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    jobname,
    schedule,
    active,
    NULL::TIMESTAMPTZ as last_run
  FROM cron.job
  WHERE jobname LIKE '%gamification%' 
     OR jobname LIKE '%leaderboard%'
     OR jobname LIKE '%xp%'
     OR jobname LIKE '%checkin-summary%'
  ORDER BY jobname;
$$;

-- =====================================================
-- 13. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.recalculate_all_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs_status TO authenticated;

-- =====================================================
-- 14. COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.trigger_check_achievements_on_checkin IS 
'Trigger que verifica conquistas após check-in completo';

COMMENT ON FUNCTION public.trigger_check_achievements_on_workout IS 
'Trigger que verifica conquistas após treino completado';

COMMENT ON FUNCTION public.trigger_check_achievements_on_challenge IS 
'Trigger que verifica conquistas após desafio completado';

COMMENT ON FUNCTION public.trigger_check_achievements_on_weight IS 
'Trigger que verifica conquistas baseadas em perda de peso';

COMMENT ON FUNCTION public.trigger_refresh_leaderboard_on_xp IS 
'Trigger que atualiza leaderboard após mudança de XP';

COMMENT ON FUNCTION public.recalculate_all_achievements IS 
'Recalcula todas as conquistas para um usuário específico';

COMMENT ON FUNCTION public.get_cron_jobs_status IS 
'Retorna o status de todos os cron jobs de gamificação';

-- =====================================================
-- 15. INITIAL LEADERBOARD REFRESH
-- =====================================================

SELECT public.refresh_leaderboard_ranks();
