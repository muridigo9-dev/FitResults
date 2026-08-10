-- ============================================================
-- CONSOLIDATED MIGRATION: Daily Summary + Schema Fixes
-- Replaces/Ensures: 
--   - Habits Schema (content_origin, created_by)
--   - Academies Schema (owner_id)
--   - Corrected get_daily_summary RPC
-- ============================================================

DO $$
BEGIN
    -- 1. FIX HABITS SCHEMA
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'content_origin') THEN
        ALTER TABLE public.habits ADD COLUMN content_origin public.content_origin DEFAULT 'system';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'created_by') THEN
        ALTER TABLE public.habits ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    UPDATE public.habits SET content_origin = 'system' WHERE content_origin IS NULL;

    -- 2. FIX ACADEMIES SCHEMA
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academies' AND column_name = 'owner_id') THEN
        ALTER TABLE public.academies ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
    END IF;

    -- Map owner_id from academy_members if possible
    UPDATE public.academies a
    SET owner_id = m.user_id
    FROM public.academy_members m
    WHERE m.academy_id = a.id AND m.role = 'owner' AND a.owner_id IS NULL;

END $$;

-- 3. FINAL RPC: get_daily_summary
-- Compatible with Refactored Challenges and Multi-tenant workouts
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
        'workouts', CASE WHEN v_show_workouts THEN (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', ws.id,
                    'title', COALESCE(w.title, 'Treino'),
                    'status', ws.status,
                    'duration', ws.total_duration_seconds,
                    'calories', ws.estimated_calories,
                    'started_at', ws.started_at,
                    'completed_at', ws.completed_at
                )
            ), '[]'::jsonb)
            FROM public.workout_sessions ws
            LEFT JOIN public.workouts w ON w.id = ws.workout_id
            WHERE ws.user_id = p_user_id AND DATE(ws.started_at) = p_date
        ) ELSE '[]'::jsonb END,
        'nutrition', CASE WHEN v_show_nutrition THEN (
            SELECT jsonb_build_object(
                'caloriesConsumed', (SELECT COALESCE(SUM(calories), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date = p_date),
                'proteinConsumed', (SELECT COALESCE(SUM(protein), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date = p_date),
                'carbsConsumed', (SELECT COALESCE(SUM(carbs), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date = p_date),
                'fatConsumed', (SELECT COALESCE(SUM(fat), 0) FROM public.diary_entries WHERE user_id = p_user_id AND date = p_date),
                'mealsLogged', (SELECT COUNT(*) FROM public.diary_entries WHERE user_id = p_user_id AND date = p_date),
                'entries', (
                    SELECT COALESCE(jsonb_agg(row_to_json(d.*)), '[]'::jsonb)
                    FROM public.diary_entries d 
                    WHERE d.user_id = p_user_id AND d.date = p_date
                )
            )
        ) ELSE NULL END,
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

-- 4. GRANTS
GRANT EXECUTE ON FUNCTION public.get_daily_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_summary(UUID, DATE) TO service_role;

-- 5. ENSURE FEATURE FLAG
INSERT INTO public.feature_flags (key, description, enabled)
VALUES ('daily_summary_enabled', 'Ativa a tela de resumo diário agregada', true)
ON CONFLICT (key) DO UPDATE SET enabled = true;

-- 6. ENABLE FOR PLANS
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
SELECT id, 'daily_summary_enabled', true
FROM public.plans
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = true;
