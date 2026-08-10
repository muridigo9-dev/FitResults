-- =========================================================
-- FIX: Update import_workouts RPC to use valid ENUM value
-- 'import' was causing "invalid input value for enum" error.
-- Using 'system' as default for Admin imports.
-- =========================================================

CREATE OR REPLACE FUNCTION public.import_workouts(
    p_data JSONB, 
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_data JSONB;
    v_block JSONB;
    v_ex JSONB;
    v_workout_id UUID;
    v_library_ex_id UUID;
    v_superset_id UUID;
    v_exercise_order INT;
    v_imported_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Iterar sobre cada item do array de importação (suporta single ou batch)
    FOR v_item IN SELECT * FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_data) = 'array' THEN p_data ELSE jsonb_build_array(p_data) END)
    LOOP
        BEGIN
            v_data := v_item->'data';
            
            -- 1. Validação de Schema (Simplificada para V1.x)
            IF (v_item->>'schema_version')::FLOAT < 1.0 THEN
                RAISE EXCEPTION 'Versão de schema incompatível ou ausente.';
            END IF;

            -- Modo Dry Run: Apenas valida estrutura básica
            IF p_dry_run THEN
                 v_logs := array_append(v_logs, 'Validado: ' || (v_data->>'title'));
                 CONTINUE; 
            END IF;

            -- 2. Criar Treino (Header)
            -- FIX: content_origin agora usa 'system' hardcoded, ou poderiamos checar se o usuario logado é admin.
            INSERT INTO workouts (
                title, 
                description, 
                category, 
                image_url, 
                is_active, 
                created_by,
                content_origin
            ) VALUES (
                v_data->>'title',
                v_data->>'description',
                v_data->>'category',
                v_data->'media'->>'url',
                COALESCE((v_data->'configuration'->>'is_active')::BOOLEAN, TRUE),
                auth.uid(),
                'system' -- FIX: Changed from 'import' to 'system' to satisfy ENUM constraint
            ) RETURNING id INTO v_workout_id;

            v_exercise_order := 0;

            -- 3. Iterar Blocos
            FOR v_block IN SELECT * FROM jsonb_array_elements(v_data->'blocks')
            LOOP
                -- Se o bloco é superset, geramos um UUID novo para agrupar
                IF v_block->>'type' = 'superset' THEN
                    v_superset_id := gen_random_uuid();
                ELSE
                    v_superset_id := NULL;
                END IF;

                -- 4. Iterar Exercícios dentro do Bloco
                FOR v_ex IN SELECT * FROM jsonb_array_elements(v_block->'exercises')
                LOOP
                    v_exercise_order := v_exercise_order + 1;
                    
                    -- Tentar encontrar exercício na Library pelo Slug, ou Nome (Fuzzy Match básica)
                    v_library_ex_id := NULL;
                    
                    -- Tenta Slug
                    IF v_ex->>'library_ref' IS NOT NULL THEN
                       SELECT id INTO v_library_ex_id FROM exercises WHERE slug = (v_ex->>'library_ref') LIMIT 1;
                    END IF;

                    -- Tenta Nome se Slug falhou
                    IF v_library_ex_id IS NULL THEN
                       SELECT id INTO v_library_ex_id FROM exercises WHERE name ILIKE (v_ex->>'name') LIMIT 1;
                    END IF;

                    -- Inserir vínculo workout_exercise
                    INSERT INTO workout_exercises (
                        workout_id,
                        exercise_id, 
                        name,
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
                    ) VALUES (
                        v_workout_id,
                        v_library_ex_id, 
                        v_ex->>'name',
                        COALESCE((v_ex->'protocol'->>'sets')::INT, 1),
                        -- Reps valor
                        CASE 
                            WHEN v_ex->'protocol'->'execution'->>'mode' = 'variable' THEN NULL
                            ELSE v_ex->'protocol'->'execution'->>'value'
                        END,
                        -- Reps Mode
                        COALESCE((v_ex->'protocol'->'execution'->>'mode')::reps_mode, 'fixed'),
                        -- Reps Lista
                        CASE 
                            WHEN v_ex->'protocol'->'execution'->>'mode' = 'variable' 
                            THEN v_ex->'protocol'->'execution'->'value'
                            ELSE NULL
                        END,
                        -- Execution Type
                        COALESCE((v_ex->'protocol'->'execution'->>'type')::execution_type, 'reps'),
                        -- Duration
                        (v_ex->'protocol'->'execution'->>'duration_seconds')::INT,
                        -- Rest
                        COALESCE((v_ex->'protocol'->>'rest_seconds')::INT, 60),
                        v_exercise_order,
                        v_superset_id,
                        CASE 
                            WHEN v_block->>'type' = 'superset' THEN 'group'
                            ELSE 'individual'
                        END
                    );
                END LOOP;
            END LOOP;

            v_imported_count := v_imported_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'title', v_data->>'title',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'imported', v_imported_count,
        'errors', v_errors,
        'logs', v_logs
    );
END;
$$;
