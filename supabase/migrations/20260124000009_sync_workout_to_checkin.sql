CREATE OR REPLACE FUNCTION public.complete_workout_session(
  p_session_id UUID,
  p_overall_mood exercise_feedback_mood DEFAULT NULL,
  p_overall_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_duration_seconds INTEGER;
  v_xp_gained INTEGER := 50; -- XP base por treino completo
  v_streak_bonus INTEGER := 0;
  v_current_streak INTEGER;
  v_checkin_id UUID;
BEGIN
  -- Obter sessão
  SELECT * INTO v_session
  FROM public.workout_sessions
  WHERE id = p_session_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sessão não encontrada');
  END IF;
  
  -- Calcular duração
  v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_session.started_at))::INTEGER;
  
  -- Atualizar sessão
  UPDATE public.workout_sessions
  SET 
    status = 'completed',
    completed_at = NOW(),
    total_duration_seconds = v_duration_seconds,
    overall_mood = p_overall_mood,
    overall_rating = p_overall_rating,
    notes = p_notes
  WHERE id = p_session_id;
  
  -- Atualizar streak
  INSERT INTO public.workout_streaks (user_id, current_streak, longest_streak, last_workout_date, streak_started_date, total_workouts)
  VALUES (auth.uid(), 1, 1, CURRENT_DATE, CURRENT_DATE, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak = CASE 
      WHEN workout_streaks.last_workout_date = CURRENT_DATE - 1 THEN workout_streaks.current_streak + 1
      WHEN workout_streaks.last_workout_date = CURRENT_DATE THEN workout_streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      workout_streaks.longest_streak,
      CASE 
        WHEN workout_streaks.last_workout_date = CURRENT_DATE - 1 THEN workout_streaks.current_streak + 1
        WHEN workout_streaks.last_workout_date = CURRENT_DATE THEN workout_streaks.current_streak
        ELSE 1
      END
    ),
    last_workout_date = CURRENT_DATE,
    streak_started_date = CASE 
      WHEN workout_streaks.last_workout_date < CURRENT_DATE - 1 THEN CURRENT_DATE
      ELSE workout_streaks.streak_started_date
    END,
    total_workouts = workout_streaks.total_workouts + 1,
    updated_at = NOW()
  RETURNING current_streak INTO v_current_streak;
  
  -- Bônus de streak
  IF v_current_streak >= 7 THEN
    v_streak_bonus := 25;
  ELSIF v_current_streak >= 3 THEN
    v_streak_bonus := 10;
  END IF;
  
  -- Adicionar XP
  PERFORM public.add_xp_to_user(
    auth.uid(),
    v_xp_gained + v_streak_bonus,
    'workout_completed',
    jsonb_build_object(
      'session_id', p_session_id,
      'duration_seconds', v_duration_seconds,
      'streak', v_current_streak
    )
  );
  
  -- Verificar conquistas
  PERFORM public.check_achievement_progress(auth.uid(), 'workouts_completed', 1);
  PERFORM public.check_achievement_progress(auth.uid(), 'streak_days', 1);
  
  -- =========================================================================
  -- SYNC COM CHECKINS (Nova funcionalidade)
  -- Garante que o treino aparece na aba de Check-in automaticamente
  -- =========================================================================
  
  -- 1. Garantir que existe um check-in para hoje
  INSERT INTO public.daily_checkins (user_id, date, status, water_current, water_goal)
  VALUES (auth.uid(), CURRENT_DATE, 'not_started', 0, 2000)
  ON CONFLICT (user_id, date) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_checkin_id;
  
  -- 2. Registrar o treino no check-in
  -- Verifica se já não foi registrado para evitar duplicatas do mesmo session_id (opcional, mas bom pra robustez)
  -- Como checkin_workouts não tem session_id, assume-se insert sempre.
  -- Mas idealmente não duplicar o "mesmo" workout ID do catálogo.
  -- A UI mostra "completed" se existir.
  INSERT INTO public.checkin_workouts (checkin_id, workout_id, workout_source, completed, duration_minutes)
  VALUES (v_checkin_id, v_session.workout_id, 'system', true, v_duration_seconds / 60);
  
  -- =========================================================================
  
  -- Registrar no diário (se existir a tabela)
  BEGIN
    INSERT INTO public.diary_entries (
      user_id, date, entry_type, source, reference_id, title, duration_minutes
    )
    VALUES (
      auth.uid(), CURRENT_DATE, 'workout', 'session', p_session_id,
      (SELECT w.title FROM public.workouts w WHERE w.id = v_session.workout_id),
      v_duration_seconds / 60
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora se não conseguir registrar
    NULL;
  END;
  
  -- RETURNING WITH CAMELCASE KEYS
  RETURN jsonb_build_object(
    'success', true,
    'durationSeconds', v_duration_seconds,
    'xpGained', v_xp_gained + v_streak_bonus,
    'streak', v_current_streak,
    'streakBonus', v_streak_bonus
  );
END;
$$;
