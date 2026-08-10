-- =========================================================
-- IMPORT DISHES RPC (JSON TEMPLATE V1.0)
-- =========================================================

CREATE OR REPLACE FUNCTION public.import_dishes(
    p_json JSONB,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_dish_name TEXT;
    v_dish_id UUID;
    v_ingredient_item JSONB;
    v_ingredient_name TEXT;
    v_ingredient_id UUID;
    v_imported_count INT := 0;
    v_skipped_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Validar versão
    IF (p_json->>'schema_version')::FLOAT < 1.0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Versão de schema incompatível');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            v_dish_name := TRIM(v_item->>'name');

            -- 1. Verificar se Prato existe
            SELECT id INTO v_dish_id FROM dishes WHERE name ILIKE v_dish_name LIMIT 1;
            
            IF v_dish_id IS NOT NULL THEN
                v_logs := array_append(v_logs, 'Prato pulado (Duplicado): ' || v_dish_name);
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            IF p_dry_run THEN
                 v_logs := array_append(v_logs, 'Validado (Novo): ' || v_dish_name);
                 CONTINUE;
            END IF;

            -- 2. Criar Prato
            INSERT INTO dishes (
                name,
                description,
                visibility_type,
                owner_id,
                created_by
            ) VALUES (
                v_dish_name,
                v_item->>'description',
                COALESCE(v_item->>'visibility_type', 'private'), -- Default private se não especificado
                auth.uid(), -- Dono é quem importa
                auth.uid()
            ) RETURNING id INTO v_dish_id;

            -- 3. Inserir Ingredientes
            FOR v_ingredient_item IN SELECT * FROM jsonb_array_elements(v_item->'ingredients')
            LOOP
                v_ingredient_name := TRIM(v_ingredient_item->>'name');
                
                -- Buscar ingrediente
                SELECT id INTO v_ingredient_id FROM ingredients WHERE name ILIKE v_ingredient_name LIMIT 1;
                
                -- Se não existe, criar (Auto-create ingredient strategy)
                IF v_ingredient_id IS NULL THEN
                     INSERT INTO ingredients (name, unit, reference_value) 
                     VALUES (v_ingredient_name, 'g', 100) -- Defaults seguros
                     RETURNING id INTO v_ingredient_id;
                     
                     v_logs := array_append(v_logs, 'Aviso: Ingrediente criado automaticamente: ' || v_ingredient_name);
                END IF;

                -- Vincular
                INSERT INTO dish_ingredients (
                    dish_id,
                    ingredient_id,
                    quantity,
                    metric_unit
                ) VALUES (
                    v_dish_id,
                    v_ingredient_id,
                    (v_ingredient_item->>'quantity')::NUMERIC,
                    v_ingredient_item->>'metric_unit'
                );
            END LOOP;

            v_imported_count := v_imported_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'name', v_dish_name,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'imported', v_imported_count,
        'skipped', v_skipped_count,
        'errors', v_errors,
        'logs', v_logs
    );
END;
$$;
