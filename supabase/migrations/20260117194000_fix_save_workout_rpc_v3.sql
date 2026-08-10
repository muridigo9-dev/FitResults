-- =========================================================
-- FIX: ADVANCED WORKOUT EXECUTION (NULL SAFETY & SEARCH PATH)
-- =========================================================

-- 1. Garantir que o Trigger lide com JSON null vs SQL NULL
CREATE OR REPLACE FUNCTION public.validate_workout_exercise_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Se modo é variável, precisamos de uma lista válida e com tamanho correto
    IF NEW.reps_mode = 'variable' THEN
        -- jsonb_typeof verifica se é realmente um array para evitar erro de execução
        IF NEW.reps_list IS NULL OR jsonb_typeof(NEW.reps_list) != 'array' OR jsonb_array_length(NEW.reps_list) != NEW.sets THEN
            RAISE EXCEPTION 'A lista de repetições variável deve conter exatamente % itens (array JSON) para coincidir com o número de séries. Recebido: %', NEW.sets, NEW.reps_list;
        END IF;
    END IF;

    -- Se modo é fixo, garante que reps_list seja SQL NULL (limpeza)
    IF NEW.reps_mode = 'fixed' THEN
        NEW.reps_list := NULL;
    END IF;

    -- Se tipo é tempo, garante reps/reps_list nulos
    IF NEW.execution_type = 'time' THEN
        NEW.reps := NULL;
        NEW.reps_list := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar RPC com melhor tratamento de tipos e NULLs
CREATE OR REPLACE FUNCTION public.save_workout_v2(
    p_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_image_url TEXT,
    p_image_path TEXT,
    p_category TEXT,
    p_is_active BOOLEAN,
    p_exercises JSONB,
    p_assigned_to_type TEXT DEFAULT NULL,
    p_assigned_to_id UUID DEFAULT NULL
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workout_id UUID;
BEGIN
    -- 1. Upsert Workout
    IF p_id IS NOT NULL THEN
        UPDATE public.workouts SET
            title = p_title,
            description = p_description,
            image_url = p_image_url,
            image_path = p_image_path,
            category = p_category,
            is_active = p_is_active,
            updated_at = NOW()
        WHERE id = p_id;
        v_workout_id := p_id;
        
        DELETE FROM public.workout_exercises WHERE workout_id = v_workout_id;
    ELSE
        INSERT INTO public.workouts (
            title, description, image_url, image_path, category, is_active, content_origin, created_by
        ) VALUES (
            p_title, p_description, p_image_url, p_image_path, p_category, p_is_active, 'system', auth.uid()
        ) RETURNING id INTO v_workout_id;
    END IF;

    -- 2. Insert Exercises
    IF p_exercises IS NOT NULL AND jsonb_array_length(p_exercises) > 0 THEN
        INSERT INTO public.workout_exercises (
            workout_id,
            exercise_id,
            name,
            description,
            sets,
            reps,
            reps_mode,
            reps_list,
            execution_type,
            duration_seconds,
            rest_seconds,
            exercise_order,
            superset_id,
            rest_type
        )
        SELECT 
            v_workout_id,
            CASE 
                WHEN (ex->>'exercise_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN (ex->>'exercise_id')::UUID 
                ELSE NULL 
            END,
            ex->>'name',
            ex->>'description',
            COALESCE((ex->>'sets')::INTEGER, 1),
            ex->>'reps',
            COALESCE((ex->>'reps_mode')::public.reps_mode, 'fixed'),
            -- Se reps_list vier como string "null" do JS, convertemos para SQL NULL
            CASE WHEN ex->'reps_list' = 'null'::jsonb THEN NULL ELSE ex->'reps_list' END,
            COALESCE((ex->>'execution_type')::public.execution_type, 'reps'),
            (ex->>'duration_seconds')::INTEGER,
            COALESCE((ex->>'rest_seconds')::INTEGER, 0),
            (ex->>'exercise_order')::INTEGER,
            CASE 
                WHEN (ex->>'superset_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN (ex->>'superset_id')::UUID 
                ELSE NULL 
            END,
            COALESCE(ex->>'rest_type', 'individual')
        FROM jsonb_array_elements(p_exercises) AS ex;
    END IF;

    -- 3. Manage Assignments
    IF p_assigned_to_type IS NOT NULL THEN
        DELETE FROM public.workout_assignments WHERE workout_id = v_workout_id;
        INSERT INTO public.workout_assignments (workout_id, scope, target_id)
        VALUES (v_workout_id, p_assigned_to_type::visibility_scope, p_assigned_to_id);
    END IF;

    RETURN v_workout_id;
END;
$$;
