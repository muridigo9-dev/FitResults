-- =========================================================
-- FIX DIET RPCS V2.1 (ROBUSTNESS & HYBRID FORMAT SUPPORT)
-- =========================================================

-- 1. FIX EXPORT DISHES (Include image and preparation)
CREATE OR REPLACE FUNCTION public.export_dishes(p_dish_ids UUID[] DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH dish_data AS (
        SELECT 
            jsonb_build_object(
                'name', d.title,
                'description', d.description,
                'image_url', d.image_url,
                'visibility_type', d.visibility_type,
                'category', d.category,
                'ingredients', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'name', i.name,
                            'quantity', di.quantity,
                            'metric_unit', di.metric_unit
                        )
                    ), '[]'::jsonb)
                    FROM dish_ingredients di
                    JOIN ingredients i ON di.ingredient_id = i.id
                    WHERE di.dish_id = d.id
                ),
                'preparation_steps', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'order', ps.step_order,
                            'description', ps.description
                        ) ORDER BY ps.step_order
                    ), '[]'::jsonb)
                    FROM diet_preparation_steps ps
                    WHERE ps.diet_id = d.id
                )
            ) as item
        FROM dishes d
        WHERE (p_dish_ids IS NULL OR d.id = ANY(p_dish_ids))
        ORDER BY d.title
    )
    SELECT 
        jsonb_build_object(
            'schema_version', '1.2',
            'exported_at', NOW(),
            'count', (SELECT COUNT(*) FROM dish_data),
            'data', COALESCE(jsonb_agg(item), '[]'::jsonb)
        ) INTO result
    FROM dish_data;

    RETURN result;
END;
$$;

-- 2. FIX IMPORT DISHES (Include image and preparation)
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
    v_prep_item JSONB;
    v_imported_count INT := 0;
    v_skipped_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            v_dish_name := TRIM(v_item->>'name');

            -- Verificar se Prato existe
            SELECT id INTO v_dish_id FROM dishes WHERE title ILIKE v_dish_name LIMIT 1;
            
            IF v_dish_id IS NOT NULL THEN
                v_logs := array_append(v_logs, 'Prato pulado (Duplicado): ' || v_dish_name);
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            IF p_dry_run THEN
                 v_logs := array_append(v_logs, 'Validado (Novo): ' || v_dish_name);
                 CONTINUE;
            END IF;

            -- 1. Criar Prato
            INSERT INTO dishes (
                title, description, image_url, visibility_type, category, owner_id, created_by
            ) VALUES (
                v_dish_name,
                v_item->>'description',
                v_item->>'image_url',
                COALESCE(v_item->>'visibility_type', 'private'),
                v_item->>'category',
                auth.uid(),
                auth.uid()
            ) RETURNING id INTO v_dish_id;

            -- 2. Inserir Ingredientes
            FOR v_ingredient_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'ingredients', '[]'::jsonb))
            LOOP
                v_ingredient_name := TRIM(v_ingredient_item->>'name');
                SELECT id INTO v_ingredient_id FROM ingredients WHERE name ILIKE v_ingredient_name LIMIT 1;
                IF v_ingredient_id IS NULL THEN
                     INSERT INTO ingredients (name, unit, reference_value) 
                     VALUES (v_ingredient_name, 'g', 100)
                     RETURNING id INTO v_ingredient_id;
                END IF;

                INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity, metric_unit) 
                VALUES (v_dish_id, v_ingredient_id, (v_ingredient_item->>'quantity')::NUMERIC, v_ingredient_item->>'metric_unit');
            END LOOP;

            -- 3. Inserir Modo de Preparo
            FOR v_prep_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'preparation_steps', '[]'::jsonb))
            LOOP
                INSERT INTO diet_preparation_steps (diet_id, step_order, description) 
                VALUES (v_dish_id, (v_prep_item->>'order')::INT, v_prep_item->>'description');
            END LOOP;

            v_imported_count := v_imported_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('name', v_dish_name, 'error', SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'imported', v_imported_count, 'skipped', v_skipped_count, 'errors', v_errors, 'logs', v_logs);
END;
$$;

-- 3. FIX EXPORT DIET PLANS
CREATE OR REPLACE FUNCTION public.export_diet_plans(p_plan_ids UUID[] DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH plan_data AS (
        SELECT 
            jsonb_build_object(
                'title', p.title,
                'description', p.description,
                'access_level', COALESCE(p.access_level, 'private'),
                'days', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'name', d.name,
                            'order_index', d.order_index,
                            'meals', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', m.name,
                                        'time_suggestion', m.time_suggestion,
                                        'order_index', m.order_index,
                                        'items', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'dish_name', dish.title,
                                                    'portion_scale', i.portion_scale,
                                                    'quantity_override', i.quantity_override,
                                                    'observation', i.observation,
                                                    'is_optional', i.is_optional,
                                                    'dish_details', (
                                                         SELECT jsonb_build_object(
                                                            'description', dish.description,
                                                            'image_url', dish.image_url,
                                                            'category', dish.category,
                                                            'ingredients', (
                                                                SELECT jsonb_agg(jsonb_build_object('name', ing.name, 'quantity', di.quantity, 'metric_unit', di.metric_unit))
                                                                FROM dish_ingredients di
                                                                JOIN ingredients ing ON di.ingredient_id = ing.id
                                                                WHERE di.dish_id = dish.id
                                                            )
                                                         )
                                                    )
                                                ) ORDER BY i.order_index
                                            ), '[]'::jsonb)
                                            FROM diet_plan_items i
                                            JOIN dishes dish ON i.dish_id = dish.id
                                            WHERE i.diet_plan_meal_id = m.id
                                        )
                                    ) ORDER BY m.order_index
                                ), '[]'::jsonb)
                                FROM diet_plan_meals m
                                WHERE m.diet_plan_day_id = d.id
                            )
                        ) ORDER BY d.order_index
                    ), '[]'::jsonb)
                    FROM diet_plan_days d
                    WHERE d.diet_plan_id = p.id
                )
            ) as item
        FROM diet_plans p
        WHERE (p_plan_ids IS NULL OR p.id = ANY(p_plan_ids))
        ORDER BY p.title
    )
    SELECT 
        jsonb_build_object(
            'schema_version', '1.2',
            'exported_at', NOW(),
            'count', (SELECT COUNT(*) FROM plan_data),
            'data', COALESCE(jsonb_agg(item), '[]'::jsonb)
        ) INTO result
    FROM plan_data;

    RETURN result;
END;
$$;

-- 4. FIX IMPORT DIET PLANS (Fallback for Legacy Flat Meals)
CREATE OR REPLACE FUNCTION public.import_diet_plans(
    p_json JSONB,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_item JSONB;
    v_day_item JSONB;
    v_meal_item JSONB;
    v_meal_option JSONB;
    v_plan_id UUID;
    v_day_id UUID;
    v_meal_id UUID;
    v_dish_id UUID;
    v_dish_name TEXT;
    v_dish_details JSONB;
    v_imported_count INT := 0;
    v_skipped_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR v_plan_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            IF EXISTS (SELECT 1 FROM diet_plans WHERE title = (v_plan_item->>'title')) THEN
                 v_skipped_count := v_skipped_count + 1;
                 v_logs := array_append(v_logs, 'Plano pulado (Existe): ' || (v_plan_item->>'title'));
                 CONTINUE;
            END IF;

            IF p_dry_run THEN CONTINUE; END IF;

            INSERT INTO diet_plans (title, description, access_level, created_by, owner_id) 
            VALUES (v_plan_item->>'title', v_plan_item->>'description', COALESCE(v_plan_item->>'access_level', 'private'), auth.uid(), auth.uid()) 
            RETURNING id INTO v_plan_id;

            -- Handle Days Structure
            IF v_plan_item ? 'days' AND jsonb_array_length(v_plan_item->'days') > 0 THEN
                FOR v_day_item IN SELECT * FROM jsonb_array_elements(v_plan_item->'days')
                LOOP
                    INSERT INTO diet_plan_days (diet_plan_id, name, order_index)
                    VALUES (v_plan_id, v_day_item->>'name', (v_day_item->>'order_index')::INT)
                    RETURNING id INTO v_day_id;

                    FOR v_meal_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_day_item->'meals', '[]'::jsonb))
                    LOOP
                        INSERT INTO diet_plan_meals (diet_plan_day_id, name, time_suggestion, order_index)
                        VALUES (v_day_id, v_meal_item->>'name', (v_meal_item->>'time_suggestion')::TIME, (v_meal_item->>'order_index')::INT)
                        RETURNING id INTO v_meal_id;

                        FOR v_meal_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_meal_item->'items', '[]'::jsonb))
                        LOOP
                            v_dish_name := v_meal_option->>'dish_name';
                            v_dish_details := v_meal_option->'dish_details';
                            SELECT id INTO v_dish_id FROM dishes WHERE title ILIKE v_dish_name LIMIT 1;
                            IF v_dish_id IS NULL THEN
                                 INSERT INTO dishes (title, description, category, visibility_type, created_by)
                                 VALUES (v_dish_name, COALESCE(v_dish_details->>'description', 'Gerado via Importação'), v_dish_details->>'category', 'private', auth.uid())
                                 RETURNING id INTO v_dish_id;
                            END IF;
                            INSERT INTO diet_plan_items (diet_plan_meal_id, dish_id, portion_scale, quantity_override, observation, is_optional) 
                            VALUES (v_meal_id, v_dish_id, COALESCE((v_meal_option->>'portion_scale')::NUMERIC, 1.0), v_meal_option->>'quantity_override', v_meal_option->>'observation', COALESCE((v_meal_option->>'is_optional')::BOOLEAN, false));
                        END LOOP;
                    END LOOP;
                END LOOP;
            ELSIF v_plan_item ? 'meals' THEN
                -- FALLBACK: Legacy format where meals are directly in the plan
                INSERT INTO diet_plan_days (diet_plan_id, name, order_index)
                VALUES (v_plan_id, 'Dia Padrão', 0)
                RETURNING id INTO v_day_id;

                FOR v_meal_item IN SELECT * FROM jsonb_array_elements(v_plan_item->'meals')
                LOOP
                    INSERT INTO diet_plan_meals (diet_plan_day_id, name, time_suggestion, order_index)
                    VALUES (v_day_id, v_meal_item->>'name', (v_meal_item->>'time_suggestion')::TIME, (v_meal_item->>'order_index')::INT)
                    RETURNING id INTO v_meal_id;
                    
                    FOR v_meal_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_meal_item->'items', '[]'::jsonb))
                    LOOP
                        v_dish_name := v_meal_option->>'dish_name';
                        SELECT id INTO v_dish_id FROM dishes WHERE title ILIKE v_dish_name LIMIT 1;
                        IF v_dish_id IS NOT NULL THEN
                            INSERT INTO diet_plan_items (diet_plan_meal_id, dish_id, portion_scale, quantity_override, observation, is_optional) 
                            VALUES (v_meal_id, v_dish_id, COALESCE((v_meal_option->>'portion_scale')::NUMERIC, 1.0), v_meal_option->>'quantity_override', v_meal_option->>'observation', COALESCE((v_meal_option->>'is_optional')::BOOLEAN, false));
                        END IF;
                    END LOOP;
                END LOOP;
            END IF;

            v_imported_count := v_imported_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('plan', v_plan_item->>'title', 'error', SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'imported', v_imported_count, 'skipped', v_skipped_count, 'errors', v_errors, 'logs', v_logs);
END;
$$;

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
