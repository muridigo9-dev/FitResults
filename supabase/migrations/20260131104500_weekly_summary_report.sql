-- Migration: 20260131104500_weekly_summary_report.sql
-- Description: Create get_weekly_summary RPC for advanced weekly analytics and comparison
-- Created: 2026-01-31

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
BEGIN
    -- 1. Calculate boundaries (Monday to Sunday)
    v_start_current := date_trunc('week', p_date::timestamp)::date;
    v_end_current := v_start_current + 6;
    
    v_start_prev := v_start_current - 7;
    v_end_prev := v_start_prev + 6;

    -- 2. Build the result
    SELECT jsonb_build_object(
        'current_week', jsonb_build_object(
            'totals', (
                SELECT jsonb_build_object(
                    'calories', COALESCE(SUM(calories), 0),
                    'protein', COALESCE(SUM(protein), 0),
                    'carbs', COALESCE(SUM(carbs), 0),
                    'fat', COALESCE(SUM(fat), 0),
                    'water_ml', (SELECT COALESCE(SUM(water_current), 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current),
                    'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) BETWEEN v_start_current AND v_end_current),
                    'avg_weight', (SELECT AVG(weight) FROM public.weight_logs WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current)
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
                        'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) = gen_date)
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
    ) INTO v_result;

    -- Final cleanup of double nesting if any query returns null
    IF (v_result->'current_week'->'totals' IS NULL) THEN
        v_result = jsonb_set(v_result, '{current_week,totals}', '{"calories":0,"protein":0,"carbs":0,"fat":0,"water_ml":0,"workouts":0,"avg_weight":null}'::jsonb);
    END IF;
    IF (v_result->'previous_week'->'totals' IS NULL) THEN
        v_result = jsonb_set(v_result, '{previous_week,totals}', '{"calories":0,"water_ml":0,"workouts":0,"avg_weight":null}'::jsonb);
    END IF;

    RETURN v_result;
END;
$$;
