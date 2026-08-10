-- =============================================
-- FIX: WORKOUT EXERCISES PERSISTENCE & SCHEMA
-- =============================================

-- 1. Ajustar tipos de dados para flexibilidade
DO $$ 
BEGIN 
    -- Safe alter column type
    ALTER TABLE public.workout_exercises ALTER COLUMN reps TYPE TEXT;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping reps column alter: %', SQLERRM;
END $$;

-- 1.1 Garantir updated_at na tabela workouts
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Garantir colunas para Supersets (já podem existir de migrações anteriores, mas garantimos aqui)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_exercises' AND column_name='superset_id') THEN
        ALTER TABLE public.workout_exercises ADD COLUMN superset_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_exercises' AND column_name='rest_type') THEN
        ALTER TABLE public.workout_exercises ADD COLUMN rest_type TEXT DEFAULT 'individual';
    END IF;
END $$;

-- 3. Função RPC para salvamento transacional (Tudo ou Nada)
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
    v_exercise RECORD;
BEGIN
    -- 1. Upsert do Treino
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
        
        -- Limpar exercícios antigos (Requisito: Remover vínculos antigos)
        DELETE FROM public.workout_exercises WHERE workout_id = v_workout_id;
    ELSE
        INSERT INTO public.workouts (
            title, description, image_url, image_path, category, is_active, content_origin, created_by
        ) VALUES (
            p_title, p_description, p_image_url, p_image_path, p_category, p_is_active, 'system', auth.uid()
        ) RETURNING id INTO v_workout_id;
    END IF;

    -- 2. Inserir Exercícios (Requisito: Ordem, Reps, Sets, Superset)
    IF p_exercises IS NOT NULL AND jsonb_array_length(p_exercises) > 0 THEN
        INSERT INTO public.workout_exercises (
            workout_id,
            exercise_id,
            name,
            description,
            sets,
            reps,
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
            ex->>'reps',
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

    -- 3. Gerenciar Atribuições (Assignments)
    IF p_assigned_to_type IS NOT NULL THEN
        DELETE FROM public.workout_assignments WHERE workout_id = v_workout_id;
        INSERT INTO public.workout_assignments (workout_id, scope, target_id)
        VALUES (v_workout_id, p_assigned_to_type::visibility_scope, p_assigned_to_id);
    END IF;

    RETURN v_workout_id;
END;
$$;
