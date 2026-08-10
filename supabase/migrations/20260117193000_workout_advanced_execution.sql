-- =========================================================
-- ADVANCED WORKOUT EXECUTION SCHEMA (REPS MODE & EXEC TYPE)
-- =========================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.reps_mode AS ENUM ('fixed', 'variable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.execution_type AS ENUM ('reps', 'time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Update Table Schema
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS reps_mode public.reps_mode DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS reps_list JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS execution_type public.execution_type DEFAULT 'reps',
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT NULL;

-- 3. Integrity Constraints
-- Rule: Exclusivity (Reps vs Time) and Min Params
ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS check_exclusive_execution;
ALTER TABLE public.workout_exercises ADD CONSTRAINT check_exclusive_execution CHECK (
    (execution_type = 'time' AND reps IS NULL AND reps_list IS NULL AND duration_seconds > 0) OR
    (execution_type = 'reps' AND duration_seconds IS NULL AND (reps IS NOT NULL OR reps_list IS NOT NULL))
);

ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS check_min_params;
ALTER TABLE public.workout_exercises ADD CONSTRAINT check_min_params CHECK (sets > 0 AND exercise_order > 0);

-- Rule: Superset Rest Consistency
ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS check_superset_rest;
ALTER TABLE public.workout_exercises ADD CONSTRAINT check_superset_rest CHECK (
    (rest_type = 'group' AND rest_seconds = 0) OR
    (rest_type = 'individual')
);

-- 4. Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_workout_exercise_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule: Variable Reps Sync
    IF NEW.reps_mode = 'variable' THEN
        IF NEW.reps_list IS NULL OR jsonb_array_length(NEW.reps_list) != NEW.sets THEN
            RAISE EXCEPTION 'A lista de repetições variável deve conter exatamente % itens para coincidir com o número de séries.', NEW.sets;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_workout_exercise ON public.workout_exercises;
CREATE TRIGGER trg_validate_workout_exercise
    BEFORE INSERT OR UPDATE ON public.workout_exercises
    FOR EACH ROW EXECUTE FUNCTION public.validate_workout_exercise_integrity();

-- 5. Updated RPC: save_workout_v2 (Atomic & Transacional)
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

    -- 2. Insert Exercises with Advanced Logic
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
            (ex->>'sets')::INTEGER,
            CASE WHEN (ex->>'execution_type') = 'reps' THEN ex->>'reps' ELSE NULL END,
            COALESCE((ex->>'reps_mode')::public.reps_mode, 'fixed'),
            (ex->'reps_list'),
            COALESCE((ex->>'execution_type')::public.execution_type, 'reps'),
            CASE WHEN (ex->>'execution_type') = 'time' THEN (ex->>'duration_seconds')::INTEGER ELSE NULL END,
            (ex->>'rest_seconds')::INTEGER,
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
