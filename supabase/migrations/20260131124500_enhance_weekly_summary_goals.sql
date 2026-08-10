-- Migration: 20260131124500_enhance_weekly_summary_goals.sql
-- Description: Add workout goal to preferences and enhance weekly summary with target comparison
-- Created: 2026-01-31

-- 1. Add workouts_goal_count to user_preferences
ALTER TABLE IF EXISTS public.user_preferences 
ADD COLUMN IF NOT EXISTS workouts_goal_count INTEGER DEFAULT 3;

-- 2. Update get_weekly_summary to include targets and better metrics
CREATE OR REPLACE FUNCTION public.get_weekly_summary(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_start_current DATE;
    v_end_current DATE;
    v_start_prev DATE;
    v_end_prev DATE;
    v_result JSONB;
    v_daily_cal_goal INTEGER := 2000;
    v_daily_water_goal INTEGER := 2500;
    v_weekly_workout_goal INTEGER := 3;
    v_macro_p_pct INTEGER := 30;
    v_macro_c_pct INTEGER := 40;
    v_macro_f_pct INTEGER := 30;
    v_target_weight DECIMAL;
    v_initial_weight_week DECIMAL;
    v_current_weight_week DECIMAL;
BEGIN
    -- boundaries (Monday to Sunday)
    v_start_current := date_trunc('week', p_date::timestamp)::date;
    v_end_current := v_start_current + 6;
    
    v_start_prev := v_start_current - 7;
    v_end_prev := v_start_prev + 6;

    -- Fetch Goals
    SELECT 
        COALESCE(calorie_target, 2000), 
        COALESCE(water_goal_ml, 2500),
        COALESCE(workouts_goal_count, 3),
        COALESCE(macro_protein_pct, 30),
        COALESCE(macro_carbs_pct, 40),
        COALESCE(macro_fat_pct, 30)
    INTO v_daily_cal_goal, v_daily_water_goal, v_weekly_workout_goal, v_macro_p_pct, v_macro_c_pct, v_macro_f_pct
    FROM public.user_preferences 
    WHERE user_id = p_user_id;

    -- Ensure we have values even if no row was found or certain fields are null
    v_daily_cal_goal := COALESCE(v_daily_cal_goal, 2000);
    v_daily_water_goal := COALESCE(v_daily_water_goal, 2500);
    v_weekly_workout_goal := COALESCE(v_weekly_workout_goal, 3);
    v_macro_p_pct := COALESCE(v_macro_p_pct, 30);
    v_macro_c_pct := COALESCE(v_macro_c_pct, 40);
    v_macro_f_pct := COALESCE(v_macro_f_pct, 30);

    SELECT goal_weight INTO v_target_weight
    FROM public.user_body_profiles
    WHERE user_id = p_user_id;

    -- Weight variation tracking
    SELECT weight INTO v_initial_weight_week
    FROM public.weight_logs
    WHERE user_id = p_user_id AND date <= v_start_current
    ORDER BY date DESC
    LIMIT 1;

    SELECT weight INTO v_current_weight_week
    FROM public.weight_logs
    WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current
    ORDER BY date DESC
    LIMIT 1;

    -- Build the result
    v_result := jsonb_build_object(
        'targets', jsonb_build_object(
            'calories', v_daily_cal_goal * 7,
            'water_ml', v_daily_water_goal * 7,
            'workouts', v_weekly_workout_goal,
            'weight_goal', v_target_weight,
            'macro_protein_pct', v_macro_p_pct,
            'macro_carbs_pct', v_macro_c_pct,
            'macro_fat_pct', v_macro_f_pct
        ),
        'current_week', jsonb_build_object(
            'totals', (
                SELECT jsonb_build_object(
                    'calories', COALESCE(SUM(calories), 0),
                    'protein', COALESCE(SUM(protein), 0),
                    'carbs', COALESCE(SUM(carbs), 0),
                    'fat', COALESCE(SUM(fat), 0),
                    'water_ml', (SELECT COALESCE(SUM(water_current), 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current),
                    'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) BETWEEN v_start_current AND v_end_current),
                    'avg_weight', (SELECT AVG(weight) FROM public.weight_logs WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current),
                    'initial_weight', v_initial_weight_week,
                    'current_weight', COALESCE(v_current_weight_week, v_initial_weight_week)
                )
                FROM public.diary_entries 
                WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current AND entry_type = 'meal'
            ),
            'daily', (
                SELECT jsonb_agg(d.daily_record)
                FROM (
                    SELECT jsonb_build_object(
                        'date', gen_date,
                        'calories', (SELECT COALESCE(SUM(calories), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date = gen_date AND entry_type = 'meal'),
                        'water', (SELECT COALESCE(water_current, 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date = gen_date),
                        'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) = gen_date),
                        'weight', (SELECT weight FROM public.weight_logs WHERE user_id = p_user_id AND date = gen_date ORDER BY created_at DESC LIMIT 1)
                    ) as daily_record
                    FROM generate_series(v_start_current, v_end_current, '1 day'::interval) gen_date
                ) d
            )
        ),
        'previous_week', jsonb_build_object(
            'totals', (
                SELECT jsonb_build_object(
                    'calories', COALESCE(SUM(calories), 0),
                    'water_ml', (SELECT COALESCE(SUM(water_current), 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date BETWEEN v_start_prev AND v_end_prev),
                    'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) BETWEEN v_start_prev AND v_end_prev),
                    'avg_weight', (SELECT AVG(weight) FROM public.weight_logs WHERE user_id = p_user_id AND date BETWEEN v_start_prev AND v_end_prev)
                )
                FROM public.diary_entries 
                WHERE user_id = p_user_id AND date BETWEEN v_start_prev AND v_end_prev AND entry_type = 'meal'
            )
        )
    );

    RETURN v_result;
END;
$$;
