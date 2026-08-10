CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_workout_id UUID,
  p_series_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_exercise RECORD;
  v_exercise_id UUID;
  v_order INTEGER := 0;
BEGIN
  -- Criar sessão
  INSERT INTO public.workout_sessions (
    user_id, workout_id, series_id, status, started_at
  )
  VALUES (
    auth.uid(), p_workout_id, p_series_id, 'in_progress', NOW()
  )
  RETURNING id INTO v_session_id;
  
  -- Se tem série, usar exercícios da série
  IF p_series_id IS NOT NULL THEN
    FOR v_exercise IN
      SELECT 
        se.exercise_id, 
        se.display_order, 
        se.id as series_exercise_id,
        se.sets,
        se.reps,
        se.rest_seconds,
        se.tempo,
        se.load_suggestion
      FROM public.series_exercises se
      WHERE se.series_id = p_series_id
      ORDER BY se.display_order
    LOOP
      INSERT INTO public.session_exercises (
        session_id, exercise_id, series_exercise_id, display_order, metadata
      )
      VALUES (
        v_session_id, 
        v_exercise.exercise_id, 
        v_exercise.series_exercise_id, 
        v_exercise.display_order,
        jsonb_build_object(
          'snapshot', jsonb_build_object(
            'sets', v_exercise.sets,
            'reps', v_exercise.reps,
            'rest_seconds', v_exercise.rest_seconds,
            'tempo', v_exercise.tempo,
            'load_suggestion', v_exercise.load_suggestion
          )
        )
      );
      v_order := v_order + 1;
    END LOOP;
  ELSE
    -- Usar exercícios do treino legado (workout_exercises)
    FOR v_exercise IN
      SELECT 
        we.id, 
        we.name,
        we.sets,
        we.reps,
        we.rest_seconds,
        we.exercise_order,
        we.superset_id,
        we.execution_type,
        we.duration_seconds,
        we.reps_mode,
        we.reps_list
      FROM public.workout_exercises we
      WHERE we.workout_id = p_workout_id
      ORDER BY we.exercise_order
    LOOP
      v_order := v_order + 1;
      
      -- Tentar encontrar exercício correspondente por nome
      SELECT id INTO v_exercise_id 
      FROM public.exercises 
      WHERE LOWER(name) = LOWER(v_exercise.name) 
      LIMIT 1;

      -- Se não encontrar, criar o exercício automaticamente
      IF v_exercise_id IS NULL THEN
        INSERT INTO public.exercises (
          name, 
          created_by_type, 
          is_active,
          equipment, 
          difficulty
        )
        VALUES (
          v_exercise.name, 
          'admin', 
          true,
          'none',
          'intermediate'
        )
        RETURNING id INTO v_exercise_id;
      END IF;

      -- Inserir na sessão
      INSERT INTO public.session_exercises (
        session_id, exercise_id, display_order, metadata
      )
      VALUES (
        v_session_id, 
        v_exercise_id, 
        v_order,
        jsonb_build_object(
          'snapshot', jsonb_build_object(
            'sets', v_exercise.sets,
            'reps', v_exercise.reps,
            'rest_seconds', v_exercise.rest_seconds,
            'tempo', NULL,
            'load_suggestion', NULL,
            'superset_id', v_exercise.superset_id,
            'execution_type', v_exercise.execution_type,
            'duration_seconds', v_exercise.duration_seconds,
            'reps_mode', v_exercise.reps_mode,
            'reps_list', v_exercise.reps_list
          )
        )
      );
    END LOOP;
  END IF;
  
  -- Atualizar contagem de exercícios
  UPDATE public.workout_sessions
  SET total_exercises = v_order
  WHERE id = v_session_id;
  
  RETURN v_session_id;
END;
$$;
