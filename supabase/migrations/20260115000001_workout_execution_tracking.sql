-- ============================================
-- WORKOUT EXECUTION TRACKING SYSTEM
-- ============================================
-- Description: Sistema completo de tracking de execução de treinos
--              com registro individual de séries, cálculo de métricas,
--              análises de progressão e integração com gamificação
-- Created: 2026-01-15
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260114000020_workout_system_evolution.sql

-- ============================================
-- 1. FUNÇÕES PARA TRACKING INDIVIDUAL DE SÉRIES
-- ============================================

-- Função para iniciar uma série individual
CREATE OR REPLACE FUNCTION public.start_session_set(
  p_session_exercise_id UUID,
  p_set_number INTEGER,
  p_planned_reps INTEGER DEFAULT NULL,
  p_planned_weight_kg DECIMAL(6,2) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_id UUID;
  v_user_id UUID;
BEGIN
  -- Verificar ownership
  SELECT ws.user_id INTO v_user_id
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = p_session_exercise_id;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Criar ou atualizar série
  INSERT INTO public.session_sets (
    session_exercise_id,
    set_number,
    planned_reps,
    planned_weight_kg,
    started_at,
    is_completed
  )
  VALUES (
    p_session_exercise_id,
    p_set_number,
    p_planned_reps,
    p_planned_weight_kg,
    NOW(),
    false
  )
  ON CONFLICT (session_exercise_id, set_number)
  DO UPDATE SET
    started_at = NOW(),
    is_completed = false
  RETURNING id INTO v_set_id;
  
  RETURN v_set_id;
END;
$$;

-- Função para completar uma série individual
CREATE OR REPLACE FUNCTION public.complete_session_set(
  p_session_exercise_id UUID,
  p_set_number INTEGER,
  p_actual_reps INTEGER,
  p_actual_weight_kg DECIMAL(6,2),
  p_rpe INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_id UUID;
  v_session_id UUID;
  v_user_id UUID;
  v_completed_sets INTEGER;
  v_total_sets INTEGER;
  v_xp_gained INTEGER := 2; -- XP base por série
  v_progression_bonus INTEGER := 0;
  v_last_weight DECIMAL(6,2);
BEGIN
  -- Verificar ownership
  SELECT se.session_id, ws.user_id INTO v_session_id, v_user_id
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = p_session_exercise_id;
  
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Não autorizado');
  END IF;
  
  -- Verificar se houve progressão de carga
  SELECT ss.actual_weight_kg INTO v_last_weight
  FROM public.session_sets ss
  JOIN public.session_exercises se ON se.id = ss.session_exercise_id
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.exercise_id = (SELECT exercise_id FROM public.session_exercises WHERE id = p_session_exercise_id)
    AND ws.user_id = v_user_id
    AND ss.is_completed = true
    AND ss.actual_weight_kg IS NOT NULL
  ORDER BY ss.completed_at DESC
  LIMIT 1;
  
  IF v_last_weight IS NOT NULL AND p_actual_weight_kg > v_last_weight THEN
    v_progression_bonus := 3; -- Bônus por progressão
  END IF;
  
  -- Criar ou atualizar série
  INSERT INTO public.session_sets (
    session_exercise_id,
    set_number,
    actual_reps,
    actual_weight_kg,
    rpe,
    notes,
    is_completed,
    started_at,
    completed_at
  )
  VALUES (
    p_session_exercise_id,
    p_set_number,
    p_actual_reps,
    p_actual_weight_kg,
    p_rpe,
    p_notes,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (session_exercise_id, set_number)
  DO UPDATE SET
    actual_reps = p_actual_reps,
    actual_weight_kg = p_actual_weight_kg,
    rpe = p_rpe,
    notes = p_notes,
    is_completed = true,
    completed_at = NOW()
  RETURNING id INTO v_set_id;
  
  -- Contar séries completadas
  SELECT 
    COUNT(*) FILTER (WHERE is_completed),
    COUNT(*)
  INTO v_completed_sets, v_total_sets
  FROM public.session_sets
  WHERE session_exercise_id = p_session_exercise_id;
  
  -- Atualizar contagem de séries na sessão
  UPDATE public.workout_sessions
  SET 
    completed_sets = (
      SELECT COUNT(*) 
      FROM public.session_sets ss
      JOIN public.session_exercises se ON se.id = ss.session_exercise_id
      WHERE se.session_id = v_session_id AND ss.is_completed = true
    ),
    total_sets = (
      SELECT COUNT(*) 
      FROM public.session_sets ss
      JOIN public.session_exercises se ON se.id = ss.session_exercise_id
      WHERE se.session_id = v_session_id
    )
  WHERE id = v_session_id;
  
  -- Adicionar XP (com tratamento de erro se função não existir)
  BEGIN
    PERFORM public.add_xp_to_user(
      v_user_id,
      v_xp_gained + v_progression_bonus,
      'set_completed',
      jsonb_build_object(
        'set_id', v_set_id,
        'weight_kg', p_actual_weight_kg,
        'reps', p_actual_reps,
        'progression_bonus', v_progression_bonus
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora se função não existir
    NULL;
  END;
  
  -- Verificar achievements (com tratamento de erro)
  IF v_progression_bonus > 0 THEN
    BEGIN
      PERFORM public.check_achievement_progress(v_user_id, 'weight_progression', 1);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'set_id', v_set_id,
    'completed_sets', v_completed_sets,
    'total_sets', v_total_sets,
    'xp_gained', v_xp_gained + v_progression_bonus,
    'progression_bonus', v_progression_bonus
  );
END;
$$;

-- Função para atualizar série em andamento
CREATE OR REPLACE FUNCTION public.update_session_set(
  p_session_exercise_id UUID,
  p_set_number INTEGER,
  p_actual_reps INTEGER DEFAULT NULL,
  p_actual_weight_kg DECIMAL(6,2) DEFAULT NULL,
  p_rpe INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar ownership
  SELECT ws.user_id INTO v_user_id
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = p_session_exercise_id;
  
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Não autorizado');
  END IF;
  
  -- Atualizar série
  UPDATE public.session_sets
  SET
    actual_reps = COALESCE(p_actual_reps, actual_reps),
    actual_weight_kg = COALESCE(p_actual_weight_kg, actual_weight_kg),
    rpe = COALESCE(p_rpe, rpe)
  WHERE session_exercise_id = p_session_exercise_id
    AND set_number = p_set_number;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Função para pular uma série
CREATE OR REPLACE FUNCTION public.skip_session_set(
  p_session_exercise_id UUID,
  p_set_number INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar ownership
  SELECT ws.user_id INTO v_user_id
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = p_session_exercise_id;
  
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Não autorizado');
  END IF;
  
  -- Marcar série como pulada
  INSERT INTO public.session_sets (
    session_exercise_id,
    set_number,
    is_completed,
    notes
  )
  VALUES (
    p_session_exercise_id,
    p_set_number,
    false,
    COALESCE(p_reason, 'Série pulada')
  )
  ON CONFLICT (session_exercise_id, set_number)
  DO UPDATE SET
    is_completed = false,
    notes = COALESCE(p_reason, 'Série pulada');
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 2. FUNÇÕES DE CÁLCULO DE MÉTRICAS
-- ============================================

-- Função para calcular volume total de uma sessão
CREATE OR REPLACE FUNCTION public.calculate_session_volume(
  p_session_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(ss.actual_weight_kg * ss.actual_reps), 0)::DECIMAL(10,2)
  FROM public.session_sets ss
  JOIN public.session_exercises se ON se.id = ss.session_exercise_id
  WHERE se.session_id = p_session_id
    AND ss.is_completed = true
    AND ss.actual_weight_kg IS NOT NULL
    AND ss.actual_reps IS NOT NULL;
$$;

-- Função para calcular progressão de carga de um exercício
CREATE OR REPLACE FUNCTION public.calculate_exercise_progression(
  p_student_id UUID,
  p_exercise_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_session RECORD;
  v_last_session RECORD;
  v_progression_percent DECIMAL(5,2);
  v_trend TEXT;
BEGIN
  -- Primeira sessão no período
  SELECT 
    DATE(ws.started_at) as date,
    AVG(ss.actual_weight_kg) as avg_weight,
    AVG(ss.actual_reps) as avg_reps,
    SUM(ss.actual_weight_kg * ss.actual_reps) as volume
  INTO v_first_session
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  WHERE ws.user_id = p_student_id
    AND se.exercise_id = p_exercise_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
    AND ss.is_completed = true
    AND ss.actual_weight_kg IS NOT NULL
  GROUP BY DATE(ws.started_at)
  ORDER BY DATE(ws.started_at) ASC
  LIMIT 1;
  
  -- Última sessão no período
  SELECT 
    DATE(ws.started_at) as date,
    AVG(ss.actual_weight_kg) as avg_weight,
    AVG(ss.actual_reps) as avg_reps,
    SUM(ss.actual_weight_kg * ss.actual_reps) as volume
  INTO v_last_session
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  WHERE ws.user_id = p_student_id
    AND se.exercise_id = p_exercise_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
    AND ss.is_completed = true
    AND ss.actual_weight_kg IS NOT NULL
  GROUP BY DATE(ws.started_at)
  ORDER BY DATE(ws.started_at) DESC
  LIMIT 1;
  
  IF v_first_session IS NULL OR v_last_session IS NULL THEN
    RETURN jsonb_build_object(
      'has_data', false,
      'message', 'Dados insuficientes para calcular progressão'
    );
  END IF;
  
  -- Calcular progressão
  v_progression_percent := ((v_last_session.avg_weight - v_first_session.avg_weight) / v_first_session.avg_weight * 100)::DECIMAL(5,2);
  
  -- Determinar tendência
  IF v_progression_percent > 5 THEN
    v_trend := 'improving';
  ELSIF v_progression_percent < -5 THEN
    v_trend := 'declining';
  ELSE
    v_trend := 'stable';
  END IF;
  
  RETURN jsonb_build_object(
    'has_data', true,
    'first_session', jsonb_build_object(
      'date', v_first_session.date,
      'weight', v_first_session.avg_weight,
      'reps', v_first_session.avg_reps,
      'volume', v_first_session.volume
    ),
    'last_session', jsonb_build_object(
      'date', v_last_session.date,
      'weight', v_last_session.avg_weight,
      'reps', v_last_session.avg_reps,
      'volume', v_last_session.volume
    ),
    'progression_percent', v_progression_percent,
    'trend', v_trend
  );
END;
$$;

-- Função para calcular consistência de treino
CREATE OR REPLACE FUNCTION public.calculate_training_consistency(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sessions INTEGER;
  v_completed_sessions INTEGER;
  v_total_sets INTEGER;
  v_completed_sets INTEGER;
  v_completion_rate DECIMAL(5,2);
  v_sets_completion_rate DECIMAL(5,2);
  v_consistency_score DECIMAL(5,2);
BEGIN
  -- Contar sessões
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_sessions, v_completed_sessions
  FROM public.workout_sessions
  WHERE user_id = p_student_id
    AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Contar séries
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ss.is_completed = true)
  INTO v_total_sets, v_completed_sets
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  WHERE ws.user_id = p_student_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Calcular taxas
  v_completion_rate := CASE 
    WHEN v_total_sessions > 0 THEN (v_completed_sessions::DECIMAL / v_total_sessions * 100)::DECIMAL(5,2)
    ELSE 0
  END;
  
  v_sets_completion_rate := CASE 
    WHEN v_total_sets > 0 THEN (v_completed_sets::DECIMAL / v_total_sets * 100)::DECIMAL(5,2)
    ELSE 0
  END;
  
  -- Score de consistência (média ponderada)
  v_consistency_score := (v_completion_rate * 0.6 + v_sets_completion_rate * 0.4)::DECIMAL(5,2);
  
  RETURN jsonb_build_object(
    'period_days', p_days,
    'total_sessions', v_total_sessions,
    'completed_sessions', v_completed_sessions,
    'session_completion_rate', v_completion_rate,
    'total_sets', v_total_sets,
    'completed_sets', v_completed_sets,
    'sets_completion_rate', v_sets_completion_rate,
    'consistency_score', v_consistency_score
  );
END;
$$;

-- Função para obter histórico de execução de um exercício
CREATE OR REPLACE FUNCTION public.get_exercise_history(
  p_student_id UUID,
  p_exercise_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE(ws.started_at),
      'session_id', ws.id,
      'sets', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'set_number', ss.set_number,
            'weight_kg', ss.actual_weight_kg,
            'reps', ss.actual_reps,
            'rpe', ss.rpe,
            'volume', ss.actual_weight_kg * ss.actual_reps
          )
          ORDER BY ss.set_number
        )
        FROM public.session_sets ss
        WHERE ss.session_exercise_id = se.id
          AND ss.is_completed = true
      ),
      'total_volume', (
        SELECT SUM(ss.actual_weight_kg * ss.actual_reps)
        FROM public.session_sets ss
        WHERE ss.session_exercise_id = se.id
          AND ss.is_completed = true
      )
    )
    ORDER BY ws.started_at DESC
  )
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  WHERE ws.user_id = p_student_id
    AND se.exercise_id = p_exercise_id
    AND ws.status = 'completed'
  LIMIT p_limit;
$$;

-- ============================================
-- 3. FUNÇÕES DE ANÁLISE
-- ============================================

-- Função para análise completa de progresso do aluno
CREATE OR REPLACE FUNCTION public.get_student_progress_analysis(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_consistency JSONB;
  v_total_volume DECIMAL(10,2);
  v_avg_volume DECIMAL(10,2);
  v_top_exercises JSONB;
BEGIN
  -- Consistência
  v_consistency := public.calculate_training_consistency(p_student_id, p_days);
  
  -- Volume total e médio
  SELECT 
    COALESCE(SUM(ss.actual_weight_kg * ss.actual_reps), 0),
    COALESCE(AVG(session_volume.volume), 0)
  INTO v_total_volume, v_avg_volume
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  LEFT JOIN LATERAL (
    SELECT SUM(ss2.actual_weight_kg * ss2.actual_reps) as volume
    FROM public.session_sets ss2
    JOIN public.session_exercises se2 ON se2.id = ss2.session_exercise_id
    WHERE se2.session_id = ws.id
      AND ss2.is_completed = true
  ) session_volume ON true
  WHERE ws.user_id = p_student_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
    AND ss.is_completed = true;
  
  -- Top exercícios por volume
  SELECT jsonb_agg(
    jsonb_build_object(
      'exercise_id', e.id,
      'exercise_name', e.name,
      'total_volume', exercise_stats.total_volume,
      'avg_weight', exercise_stats.avg_weight,
      'total_sets', exercise_stats.total_sets
    )
  )
  INTO v_top_exercises
  FROM (
    SELECT 
      se.exercise_id,
      SUM(ss.actual_weight_kg * ss.actual_reps) as total_volume,
      AVG(ss.actual_weight_kg) as avg_weight,
      COUNT(*) as total_sets
    FROM public.workout_sessions ws
    JOIN public.session_exercises se ON se.session_id = ws.id
    JOIN public.session_sets ss ON ss.session_exercise_id = se.id
    WHERE ws.user_id = p_student_id
      AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ss.is_completed = true
    GROUP BY se.exercise_id
    ORDER BY total_volume DESC
    LIMIT 5
  ) exercise_stats
  JOIN public.exercises e ON e.id = exercise_stats.exercise_id;
  
  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'period_days', p_days,
    'consistency', v_consistency,
    'volume', jsonb_build_object(
      'total', v_total_volume,
      'avg_per_session', v_avg_volume
    ),
    'top_exercises', COALESCE(v_top_exercises, '[]'::jsonb)
  );
END;
$$;

-- Função para análise de performance de um exercício
CREATE OR REPLACE FUNCTION public.get_exercise_performance_analysis(
  p_exercise_id UUID,
  p_days INTEGER DEFAULT 30,
  p_academy_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_completions INTEGER;
  v_avg_weight DECIMAL(6,2);
  v_avg_reps DECIMAL(5,2);
  v_total_volume DECIMAL(10,2);
  v_student_count INTEGER;
BEGIN
  -- Estatísticas gerais
  SELECT 
    COUNT(DISTINCT ws.user_id),
    COUNT(*),
    AVG(ss.actual_weight_kg),
    AVG(ss.actual_reps),
    SUM(ss.actual_weight_kg * ss.actual_reps)
  INTO v_student_count, v_total_completions, v_avg_weight, v_avg_reps, v_total_volume
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  WHERE se.exercise_id = p_exercise_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
    AND ss.is_completed = true
    AND (p_academy_id IS NULL OR ws.academy_id = p_academy_id);
  
  RETURN jsonb_build_object(
    'exercise_id', p_exercise_id,
    'period_days', p_days,
    'student_count', COALESCE(v_student_count, 0),
    'total_completions', COALESCE(v_total_completions, 0),
    'avg_weight', COALESCE(v_avg_weight, 0),
    'avg_reps', COALESCE(v_avg_reps, 0),
    'total_volume', COALESCE(v_total_volume, 0)
  );
END;
$$;

-- Função para análise por academia
CREATE OR REPLACE FUNCTION public.get_academy_workout_analytics(
  p_academy_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_sessions INTEGER;
  v_active_students INTEGER;
  v_total_volume DECIMAL(10,2);
  v_avg_consistency DECIMAL(5,2);
BEGIN
  -- Estatísticas gerais
  SELECT 
    COUNT(*),
    COUNT(DISTINCT user_id)
  INTO v_total_sessions, v_active_students
  FROM public.workout_sessions
  WHERE academy_id = p_academy_id
    AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Volume total
  SELECT COALESCE(SUM(ss.actual_weight_kg * ss.actual_reps), 0)
  INTO v_total_volume
  FROM public.workout_sessions ws
  JOIN public.session_exercises se ON se.session_id = ws.id
  JOIN public.session_sets ss ON ss.session_exercise_id = se.id
  WHERE ws.academy_id = p_academy_id
    AND ws.started_at >= NOW() - (p_days || ' days')::INTERVAL
    AND ss.is_completed = true;
  
  -- Consistência média
  SELECT AVG((consistency->>'consistency_score')::DECIMAL)
  INTO v_avg_consistency
  FROM (
    SELECT public.calculate_training_consistency(user_id, p_days) as consistency
    FROM public.workout_sessions
    WHERE academy_id = p_academy_id
      AND started_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY user_id
  ) student_consistency;
  
  RETURN jsonb_build_object(
    'academy_id', p_academy_id,
    'period_days', p_days,
    'total_sessions', COALESCE(v_total_sessions, 0),
    'active_students', COALESCE(v_active_students, 0),
    'total_volume', COALESCE(v_total_volume, 0),
    'avg_consistency_score', COALESCE(v_avg_consistency, 0)
  );
END;
$$;

-- Função para resumo por período
CREATE OR REPLACE FUNCTION public.get_period_workout_summary(
  p_student_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'student_id', p_student_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_sessions', COUNT(*),
    'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
    'total_duration_minutes', COALESCE(SUM(total_duration_seconds) / 60, 0),
    'total_volume', COALESCE(
      (
        SELECT SUM(ss.actual_weight_kg * ss.actual_reps)
        FROM public.session_sets ss
        JOIN public.session_exercises se ON se.id = ss.session_exercise_id
        JOIN public.workout_sessions ws2 ON ws2.id = se.session_id
        WHERE ws2.user_id = p_student_id
          AND DATE(ws2.started_at) BETWEEN p_start_date AND p_end_date
          AND ss.is_completed = true
      ), 0
    ),
    'workouts_by_date', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', workout_date,
          'count', workout_count,
          'volume', workout_volume
        )
        ORDER BY workout_date
      )
      FROM (
        SELECT 
          DATE(ws.started_at) as workout_date,
          COUNT(DISTINCT ws.id) as workout_count,
          COALESCE(SUM(ss.actual_weight_kg * ss.actual_reps), 0) as workout_volume
        FROM public.workout_sessions ws
        LEFT JOIN public.session_exercises se ON se.session_id = ws.id
        LEFT JOIN public.session_sets ss ON ss.session_exercise_id = se.id AND ss.is_completed = true
        WHERE ws.user_id = p_student_id
          AND DATE(ws.started_at) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(ws.started_at)
      ) daily_stats
    )
  )
  FROM public.workout_sessions
  WHERE user_id = p_student_id
    AND DATE(started_at) BETWEEN p_start_date AND p_end_date;
$$;

-- ============================================
-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================

-- Trigger para atualizar volume total da sessão quando série é completada
CREATE OR REPLACE FUNCTION update_session_volume_on_set_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_total_volume DECIMAL(10,2);
BEGIN
  -- Obter session_id
  SELECT se.session_id INTO v_session_id
  FROM public.session_exercises se
  WHERE se.id = NEW.session_exercise_id;
  
  -- Calcular volume total
  v_total_volume := public.calculate_session_volume(v_session_id);
  
  -- Atualizar sessão
  UPDATE public.workout_sessions
  SET total_volume_kg = v_total_volume
  WHERE id = v_session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_session_volume ON public.session_sets;
CREATE TRIGGER trg_update_session_volume
AFTER INSERT OR UPDATE OF is_completed, actual_weight_kg, actual_reps
ON public.session_sets
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION update_session_volume_on_set_complete();

-- ============================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para queries de análise
CREATE INDEX IF NOT EXISTS idx_session_sets_completed_weight 
ON public.session_sets(session_exercise_id, is_completed, actual_weight_kg) 
WHERE is_completed = true AND actual_weight_kg IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_sets_completed_at 
ON public.session_sets(completed_at DESC) 
WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date 
ON public.workout_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_academy_date 
ON public.workout_sessions(academy_id, started_at DESC) 
WHERE academy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise_session 
ON public.session_exercises(exercise_id, session_id);

-- Índice composto para cálculo de volume
CREATE INDEX IF NOT EXISTS idx_session_sets_volume_calc 
ON public.session_sets(session_exercise_id, is_completed, actual_weight_kg, actual_reps) 
WHERE is_completed = true;

-- ============================================
-- 6. CONSTRAINT PARA GARANTIR UNICIDADE
-- ============================================

-- Garantir que não haja séries duplicadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'session_sets_unique_set_number'
  ) THEN
    ALTER TABLE public.session_sets 
    ADD CONSTRAINT session_sets_unique_set_number 
    UNIQUE (session_exercise_id, set_number);
  END IF;
END $$;

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION public.start_session_set(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_set(UUID, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_set(UUID, INTEGER, INTEGER, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_session_set(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_session_volume(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_exercise_progression(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_training_consistency(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_history(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress_analysis(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_performance_analysis(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_academy_workout_analytics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_period_workout_summary(UUID, DATE, DATE) TO authenticated;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON FUNCTION public.start_session_set(UUID, INTEGER, INTEGER, DECIMAL) IS 
'Inicia uma série individual de um exercício';

COMMENT ON FUNCTION public.complete_session_set(UUID, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT) IS 
'Completa uma série individual com peso e reps reais, calcula XP e progressão';

COMMENT ON FUNCTION public.update_session_set(UUID, INTEGER, INTEGER, DECIMAL, INTEGER) IS 
'Atualiza uma série em andamento';

COMMENT ON FUNCTION public.skip_session_set(UUID, INTEGER, TEXT) IS 
'Marca uma série como pulada';

COMMENT ON FUNCTION public.calculate_session_volume(UUID) IS 
'Calcula volume total (peso × reps) de uma sessão';

COMMENT ON FUNCTION public.calculate_exercise_progression(UUID, UUID, INTEGER) IS 
'Calcula progressão de carga de um exercício para um aluno';

COMMENT ON FUNCTION public.calculate_training_consistency(UUID, INTEGER) IS 
'Calcula consistência de treino (% de séries e sessões completadas)';

COMMENT ON FUNCTION public.get_exercise_history(UUID, UUID, INTEGER) IS 
'Retorna histórico de execução de um exercício';

COMMENT ON FUNCTION public.get_student_progress_analysis(UUID, INTEGER) IS 
'Análise completa de progresso do aluno com consistência, volume e top exercícios';

COMMENT ON FUNCTION public.get_exercise_performance_analysis(UUID, INTEGER, UUID) IS 
'Análise de performance de um exercício (global ou por academia)';

COMMENT ON FUNCTION public.get_academy_workout_analytics(UUID, INTEGER) IS 
'Analytics de treinos de uma academia';

COMMENT ON FUNCTION public.get_period_workout_summary(UUID, DATE, DATE) IS 
'Resumo de treinos de um aluno em um período específico';
