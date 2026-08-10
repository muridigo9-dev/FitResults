-- =========================================================
-- EXPORT WORKOUTS RPC (JSON TEMPLATE V1.1)
-- =========================================================

CREATE OR REPLACE FUNCTION public.export_workouts(p_workout_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH target_workouts AS (
        SELECT * FROM workouts WHERE id = ANY(p_workout_ids)
    ),
    -- 1. Obter dados crus dos exercícios com metadados da livraria
    raw_exercises AS (
        SELECT 
            we.workout_id,
            we.id as instance_id,
            we.exercise_order,
            we.superset_id,
            we.name as display_name,
            -- Protocolo
            we.sets,
            we.rest_seconds,
            we.execution_type,
            we.reps_mode,
            we.reps,       -- Valor fixo/display
            we.reps_list,  -- Array se variável
            we.duration_seconds,
            we.rest_type,
            -- Metadados da Library (se vinculado)
            e.slug as library_ref,
            e.equipment,
            -- Join para arrays de metadados
            COALESCE(
                (SELECT jsonb_agg(mg.category) 
                 FROM exercise_muscle_groups emg 
                 JOIN muscle_groups mg ON mg.id = emg.muscle_group_id 
                 WHERE emg.exercise_id = e.id), 
                '[]'::jsonb
            ) as muscle_groups,
            t.slug as type_slug,
            l.slug as level_slug
        FROM workout_exercises we
        LEFT JOIN exercises e ON we.exercise_id = e.id
        LEFT JOIN exercise_types t ON e.type_id = t.id
        LEFT JOIN exercise_levels l ON e.level_id = l.id
        WHERE we.workout_id = ANY(p_workout_ids)
        ORDER BY we.workout_id, we.exercise_order
    ),
    -- 2. Agrupar em Blocos
    blocks AS (
        SELECT 
            workout_id,
            COALESCE(superset_id, instance_id) as block_key,
            MIN(exercise_order) as block_sequence,
            CASE WHEN superset_id IS NOT NULL THEN 'superset' ELSE 'single' END as block_type,
            jsonb_agg(
                jsonb_build_object(
                    'name', display_name,
                    'library_ref', library_ref,
                    'metadata', jsonb_build_object(
                        'muscle_groups', muscle_groups,
                        'type', type_slug,
                        'level', level_slug,
                        'equipment', equipment
                    ),
                    'protocol', jsonb_build_object(
                        'sets', sets,
                        'rest_seconds', rest_seconds,
                        'execution', jsonb_build_object(
                            'type', COALESCE(execution_type, 'reps'),
                            'mode', CASE WHEN execution_type = 'time' THEN NULL ELSE COALESCE(reps_mode, 'fixed') END,
                            'value', CASE 
                                WHEN execution_type = 'time' THEN NULL
                                WHEN reps_mode = 'variable' THEN reps_list 
                                ELSE to_jsonb(reps) 
                            END,
                            'duration_seconds', duration_seconds
                        )
                    )
                ) ORDER BY exercise_order
            ) as exercises
        FROM raw_exercises
        GROUP BY workout_id, block_key, superset_id
    ),
    -- 2.1 Calcular sequência dos blocos (Fix Window Function issue)
    blocks_ordered AS (
        SELECT 
            workout_id,
            block_type,
            exercises,
            row_number() OVER (PARTITION BY workout_id ORDER BY block_sequence) as sequence_id
        FROM blocks
    ),
    -- 3. Montar Objeto Final por Treino
    final_json AS (
        SELECT 
            jsonb_build_object(
                'schema_version', '1.1',
                'generated_at', NOW(),
                'data', jsonb_build_object(
                    'title', w.title,
                    'description', w.description, -- ... resto da query
                    'category', w.category,
                    'media', jsonb_build_object(
                        'type', CASE WHEN w.image_url IS NOT NULL THEN 'image' ELSE 'none' END,
                        'url', w.image_url
                    ),
                    'configuration', jsonb_build_object(
                        'is_active', w.is_active
                    ),
                    'blocks', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'sequence_id', bo.sequence_id,
                                'type', bo.block_type,
                                'exercises', bo.exercises
                            )
                         ORDER BY bo.sequence_id), '[]'::jsonb)
                        FROM blocks_ordered bo 
                        WHERE bo.workout_id = w.id
                    )
                )
            ) as workout_json
        FROM target_workouts w
    )
    SELECT COALESCE(jsonb_agg(workout_json), '[]'::jsonb) INTO result FROM final_json;

    RETURN result;
END;
$$;
