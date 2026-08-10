-- Yearly Summary RPC
CREATE OR REPLACE FUNCTION public.get_yearly_summary(
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
    v_days_in_year INTEGER;
    v_result JSONB;
    v_daily_cal_goal INTEGER := 2000;
    v_daily_water_goal INTEGER := 2500;
    v_weekly_workout_goal INTEGER := 3;
    v_yearly_workout_goal INTEGER;
    v_macro_p_pct INTEGER := 30;
    v_macro_c_pct INTEGER := 40;
    v_macro_f_pct INTEGER := 30;
    v_target_weight DECIMAL;
    v_initial_weight_year DECIMAL;
    v_current_weight_year DECIMAL;
BEGIN
    -- boundaries (Year start to Year end)
    v_start_current := date_trunc('year', p_date::timestamp)::date;
    v_end_current := (v_start_current + interval '1 year' - interval '1 day')::date;
    v_days_in_year := (v_end_current - v_start_current) + 1;
    
    v_start_prev := (v_start_current - interval '1 year')::date;
    v_end_prev := (v_start_prev + interval '1 year' - interval '1 day')::date;

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

    -- defaults
    v_yearly_workout_goal := (v_weekly_workout_goal * v_days_in_year / 7);

    SELECT goal_weight INTO v_target_weight
    FROM public.user_body_profiles
    WHERE user_id = p_user_id;

    -- Weight variation tracking
    SELECT weight INTO v_initial_weight_year
    FROM public.weight_logs
    WHERE user_id = p_user_id AND date <= v_start_current
    ORDER BY date DESC
    LIMIT 1;

    SELECT weight INTO v_current_weight_year
    FROM public.weight_logs
    WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current
    ORDER BY date DESC
    LIMIT 1;

    -- Build the result
    v_result := jsonb_build_object(
        'targets', jsonb_build_object(
            'calories', v_daily_cal_goal * v_days_in_year,
            'water_ml', v_daily_water_goal * v_days_in_year,
            'workouts', v_yearly_workout_goal,
            'weight_goal', v_target_weight,
            'macro_protein_pct', v_macro_p_pct,
            'macro_carbs_pct', v_macro_c_pct,
            'macro_fat_pct', v_macro_f_pct
        ),
        'current_year', jsonb_build_object(
            'totals', (
                SELECT jsonb_build_object(
                    'calories', COALESCE(SUM(calories), 0),
                    'protein', COALESCE(SUM(protein), 0),
                    'carbs', COALESCE(SUM(carbs), 0),
                    'fat', COALESCE(SUM(fat), 0),
                    'water_ml', (SELECT COALESCE(SUM(water_current), 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current),
                    'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND DATE(started_at) BETWEEN v_start_current AND v_end_current),
                    'avg_weight', (SELECT AVG(weight) FROM public.weight_logs WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current),
                    'initial_weight', v_initial_weight_year,
                    'current_weight', COALESCE(v_current_weight_year, v_initial_weight_year)
                )
                FROM public.diary_entries 
                WHERE user_id = p_user_id AND date BETWEEN v_start_current AND v_end_current AND entry_type = 'meal'
            ),
            'monthly_breakdown', (
                SELECT jsonb_agg(m.monthly_record)
                FROM (
                    -- Aggregating by month for yearly view
                    SELECT jsonb_build_object(
                        'date', date_trunc('month', gen_month)::date,
                        'calories', (SELECT COALESCE(SUM(calories), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date_trunc('month', date) = date_trunc('month', gen_month) AND entry_type = 'meal'),
                        'water', (SELECT COALESCE(SUM(water_current), 0) FROM public.daily_checkins WHERE user_id = p_user_id AND date_trunc('month', date) = date_trunc('month', gen_month)),
                        'workouts', (SELECT COUNT(*) FROM public.workout_sessions WHERE user_id = p_user_id AND status = 'completed' AND date_trunc('month', started_at) = date_trunc('month', gen_month)),
                        'weight', (SELECT AVG(weight) FROM public.weight_logs WHERE user_id = p_user_id AND date_trunc('month', date) = date_trunc('month', gen_month))
                    ) as monthly_record
                    FROM generate_series(v_start_current, v_end_current, '1 month'::interval) gen_month
                ) m
            )
        ),
        'previous_year', jsonb_build_object(
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
