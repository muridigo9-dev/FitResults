-- ============================================================
-- SUPPORT USER WORKOUTS IN SESSIONS
-- ============================================================

-- 1. Alterar tabela workout_sessions para suportar treinos de usuário
ALTER TABLE public.workout_sessions
ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS user_workout_id UUID REFERENCES public.user_workouts(id) ON DELETE SET NULL;

-- 2. Atualizar a função RPC start_workout_session
CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_workout_id UUID,
  p_series_id UUID DEFAULT NULL,
  p_is_user_workout BOOLEAN DEFAULT FALSE
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
  v_count INTEGER;
BEGIN
  -- Verificar se o treino existe na tabela correta para evitar erros silenciosos
  if p_is_user_workout THEN
    SELECT count(*) INTO v_count FROM public.user_workouts WHERE id = p_workout_id;
    IF v_count = 0 THEN
      RAISE EXCEPTION 'User workout not found';
    END IF;
    
    -- Criar sessão vinculada a user_workout
    INSERT INTO public.workout_sessions (
      user_id, workout_id, user_workout_id, series_id, status, started_at
    )
    VALUES (
      auth.uid(), NULL, p_workout_id, p_series_id, 'in_progress', NOW()
    )
    RETURNING id INTO v_session_id;
    
  ELSE
    -- Comportamento padrão (System Workout)
    -- Verificar se existe (opcional, mas bom pra debug)
    SELECT count(*) INTO v_count FROM public.workouts WHERE id = p_workout_id;
    IF v_count = 0 THEN
      RAISE EXCEPTION 'System workout not found';
    END IF;

    -- Criar sessão vinculada a workout (sistema)
    INSERT INTO public.workout_sessions (
      user_id, workout_id, user_workout_id, series_id, status, started_at
    )
    VALUES (
      auth.uid(), p_workout_id, NULL, p_series_id, 'in_progress', NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  -- LÓGICA DE EXERCÍCIOS
  -- Se for User Workout, pegamos a lista de exercícios do JSONB
  IF p_is_user_workout THEN
    FOR v_exercise IN
      SELECT 
        value->>'id' as id,
        value->>'name' as name,
        (value->>'sets')::int as sets,
        value->>'reps' as reps,
        (value->>'restSeconds')::int as rest_seconds,
        (value->>'order')::int as order_idx,
        value->>'supersetId' as superset_id,
        value->>'executionType' as execution_type,
        (value->>'durationSeconds')::int as duration_seconds,
        value->>'repsMode' as reps_mode,
        value->>'repsList' as reps_list -- Pode precisar de tratamento se for array JSON
      FROM public.user_workouts, jsonb_array_elements(exercises) as value
      WHERE id = p_workout_id
      ORDER BY (value->>'order')::int
    LOOP
      v_order := v_order + 1;
      
      -- Tentar encontrar exercício correspondente por nome na biblioteca global
      -- Isso permite analytics futuros por tipo de exercício
      SELECT id INTO v_exercise_id 
      FROM public.exercises 
      WHERE LOWER(name) = LOWER(v_exercise.name) 
      LIMIT 1;

      -- Se não encontrar, criar um exercício "stub" ou usar NULL?
      -- Para manter integridade, vamos criar se não existir (ou usar um genérico se preferir não poluir)
      -- Por enquanto, vamos criar para permitir que o usuário tenha histórico desse exercício
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
          'user', -- Marcando como criado por usuário (indiretamente)
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
            'superset_id', v_exercise.superset_id,
            'execution_type', v_exercise.execution_type,
            'duration_seconds', v_exercise.duration_seconds,
            'reps_mode', v_exercise.reps_mode
            -- 'reps_list' removido por complexidade de parse agora, pode ser add depois
          )
        )
      );
    END LOOP;

  -- Se for System Workout (Lógica Antiga)
  ELSIF p_series_id IS NOT NULL THEN
    -- Lógica de Série (inalterada)
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
    -- Lógica de Treino de Sistema (inalterada)
    FOR v_exercise IN
      SELECT 
        we.id, 
        we.name,
        we.exercise_id, 
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
      v_exercise_id := v_exercise.exercise_id;

      IF v_exercise_id IS NULL AND v_exercise.name IS NOT NULL THEN
        SELECT id INTO v_exercise_id 
        FROM public.exercises 
        WHERE LOWER(name) = LOWER(v_exercise.name) 
        LIMIT 1;
      END IF;

      IF v_exercise_id IS NULL AND v_exercise.name IS NOT NULL THEN
        INSERT INTO public.exercises (name, created_by_type, is_active, equipment, difficulty)
        VALUES (v_exercise.name, 'admin', true, 'none', 'intermediate')
        RETURNING id INTO v_exercise_id;
      END IF;

      IF v_exercise_id IS NOT NULL THEN
        v_order := v_order + 1;
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
              'superset_id', v_exercise.superset_id,
              'execution_type', v_exercise.execution_type,
              'duration_seconds', v_exercise.duration_seconds,
              'reps_mode', v_exercise.reps_mode,
              'reps_list', v_exercise.reps_list
            )
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Atualizar total
  UPDATE public.workout_sessions
  SET total_exercises = v_order
  WHERE id = v_session_id;
  
  RETURN v_session_id;
END;
$$;
