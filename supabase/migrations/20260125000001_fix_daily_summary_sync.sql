-- ============================================================
-- Migration: Revert Daily Summary to Use Standard Tables
-- Description: Reverting to use diary_entries and workout_sessions
--              as the source of truth for daily summary data
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_daily_summary(
    p_user_id UUID,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_show_workouts BOOLEAN;
    v_show_exercises BOOLEAN;
    v_show_nutrition BOOLEAN;
    v_show_challenges BOOLEAN;
    v_show_habits BOOLEAN;
    v_show_gamification BOOLEAN;
BEGIN
    -- 1. Get visibility flags for the user and day
    v_show_workouts := public.is_feature_active_for_user('training_mode_enabled', p_user_id);
    v_show_exercises := public.is_feature_active_for_user('exercises_enabled', p_user_id);
    v_show_nutrition := public.is_feature_active_for_user('diets_enabled', p_user_id);
    v_show_challenges := public.is_feature_active_for_user('challenges_enabled', p_user_id);
    v_show_habits := public.is_feature_active_for_user('habits_enabled', p_user_id);
    v_show_gamification := public.is_feature_active_for_user('gamification_enabled', p_user_id);

    -- 2. Build final object
    SELECT jsonb_build_object(
        'date', p_date,
        'visibility', jsonb_build_object(
            'showWorkouts', v_show_workouts,
            'showExercises', v_show_exercises,
            'showNutrition', v_show_nutrition,
            'showChallenges', v_show_challenges,
            'showHabits', v_show_habits,
            'showGamification', v_show_gamification
        ),
        'checkin', (
            SELECT row_to_json(c.*) 
            FROM public.daily_checkins c 
            WHERE c.user_id = p_user_id AND c.date = p_date
        ),
        'gamification', CASE WHEN v_show_gamification THEN (
            SELECT jsonb_build_object(
                'streak', COALESCE(x.current_streak, 0),
                'level', COALESCE(l.level_number, 1),
                'levelName', COALESCE(l.name, 'Iniciante'),
                'totalXP', COALESCE(x.total_xp, 0),
                'minXP', COALESCE(l.min_xp, 0),
                'maxXP', COALESCE(l.max_xp, 100),
                'pointsToday', COALESCE((
                    SELECT SUM(xp_gained) 
                    FROM public.gamification_events 
                    WHERE user_id = p_user_id AND DATE(created_at) = p_date
                ), 0)
            )
            FROM public.user_xp x
            LEFT JOIN public.levels l ON l.id = x.current_level_id
            WHERE x.user_id = p_user_id
        ) ELSE NULL END,
        -- Fetch workouts from workout_sessions (completed on this date)
        'workouts', CASE WHEN v_show_workouts THEN (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', ws.id,
                    'title', COALESCE(
                        w.title, 
                        (SELECT e.name FROM public.session_exercises se JOIN public.exercises e ON e.id = se.exercise_id WHERE se.session_id = ws.id ORDER BY se.display_order LIMIT 1),
                        'Treino'
                    ),
                    'status', ws.status,
                    'duration', COALESCE(ws.total_duration_seconds / 60, 0),
                    'calories', ws.estimated_calories,
                    'started_at', ws.started_at,
                    'completed_at', ws.completed_at,
                    'isAdhoc', (ws.workout_id IS NULL),
                    'exercises', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', e.id,
                                'name', e.name,
                                'sets', (SELECT COUNT(*) FROM public.session_sets ss WHERE ss.session_exercise_id = se.id),
                                'completed', se.is_completed
                            )
                        ), '[]'::jsonb)
                        FROM public.session_exercises se
                        JOIN public.exercises e ON e.id = se.exercise_id
                        WHERE se.session_id = ws.id
                        ORDER BY se.display_order
                    )
                )
            ), '[]'::jsonb)
            FROM public.workout_sessions ws
            LEFT JOIN public.workouts w ON w.id = ws.workout_id
            WHERE ws.user_id = p_user_id AND DATE(ws.started_at) = p_date
        ) ELSE '[]'::jsonb END,
        -- Fetch nutrition from diary_entries with type 'meal'
        'nutrition', CASE WHEN v_show_nutrition THEN (
            SELECT jsonb_build_object(
                'caloriesConsumed', COALESCE(SUM(de.calories), 0),
                'proteinConsumed', COALESCE(SUM(de.protein), 0),
                'carbsConsumed', COALESCE(SUM(de.carbs), 0),
                'fatConsumed', COALESCE(SUM(de.fat), 0),
                'mealsLogged', COUNT(de.id),
                'entries', COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', de.id,
                        'title', de.title,
                        'calories', de.calories,
                        'protein', de.protein,
                        'carbs', de.carbs,
                        'fat', de.fat,
                        'ingredients', de.ingredients,
                        'category', de.category,
                        'created_at', de.created_at
                    ) ORDER BY de.created_at
                ), '[]'::jsonb)
            )
            FROM public.diary_entries de
            WHERE de.user_id = p_user_id 
              AND de.date = p_date 
              AND de.entry_type = 'meal'
        ) ELSE jsonb_build_object(
            'caloriesConsumed', 0,
            'proteinConsumed', 0,
            'carbsConsumed', 0,
            'fatConsumed', 0,
            'mealsLogged', 0,
            'entries', '[]'::jsonb
        ) END,
        'habits', CASE WHEN v_show_habits THEN (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', h.id,
                    'name', h.name,
                    'icon', h.icon,
                    'color', h.color,
                    'completed', EXISTS (
                        SELECT 1 FROM public.habit_logs hl 
                        WHERE hl.habit_id = h.id AND hl.user_id = p_user_id AND hl.date = p_date AND hl.value >= hl.goal
                    )
                )
            ), '[]'::jsonb)
            FROM public.habits h
            WHERE h.is_active = true
              AND (h.visibility = 'global' OR h.created_by = p_user_id OR (h.visibility = 'academy' AND h.academy_id = ANY(SELECT academy_id FROM public.academy_members WHERE user_id = p_user_id AND status = 'active')))
        ) ELSE '[]'::jsonb END,
        'challenges', CASE WHEN v_show_challenges THEN (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'currentDay', up.current_day,
                    'totalDays', c.duration_days,
                    'status', up.status
                )
            ), '[]'::jsonb)
            FROM public.user_challenge_participations up
            JOIN public.challenges c ON c.id = up.challenge_id
            WHERE up.user_id = p_user_id AND up.status = 'active'
        ) ELSE '[]'::jsonb END
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_daily_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_summary(UUID, DATE) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_daily_summary(UUID, DATE) IS 
'Returns daily summary for a user on a specific date. Uses diary_entries for meals and workout_sessions for workouts as the source of truth.';
