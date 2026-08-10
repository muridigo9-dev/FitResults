-- =========================================================
-- IMPORT DIET PLANS RPC (JSON TEMPLATE V1.0)
-- =========================================================

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
    IF (p_json->>'schema_version')::FLOAT < 1.0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Versão de schema incompatível');
    END IF;

    FOR v_plan_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            -- Check Duplicidade Plano (Por titulo)
            -- (Opcional: permitir edição se já existe? Por enquanto, Skip se título igual)
            IF EXISTS (SELECT 1 FROM diet_plans WHERE title = (v_plan_item->>'title')) THEN
                 v_skipped_count := v_skipped_count + 1;
                 v_logs := array_append(v_logs, 'Plano pulado (Existe): ' || (v_plan_item->>'title'));
                 CONTINUE;
            END IF;

            IF p_dry_run THEN
                 v_logs := array_append(v_logs, 'Validado: ' || (v_plan_item->>'title'));
                 CONTINUE;
            END IF;

            -- 1. Criar Plano
            INSERT INTO diet_plans (
                title, description, access_level, created_by, owner_id
            ) VALUES (
                v_plan_item->>'title',
                v_plan_item->>'description',
                COALESCE(v_plan_item->>'access_level', 'private'),
                auth.uid(),
                auth.uid()
            ) RETURNING id INTO v_plan_id;

            -- 2. Dias
            FOR v_day_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_plan_item->'days', '[]'::jsonb))
            LOOP
                INSERT INTO diet_plan_days (diet_plan_id, name, order_index)
                VALUES (v_plan_id, v_day_item->>'name', (v_day_item->>'order_index')::INT)
                RETURNING id INTO v_day_id;

                -- 3. Refeições
                FOR v_meal_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_day_item->'meals', '[]'::jsonb))
                LOOP
                    INSERT INTO diet_plan_meals (diet_plan_day_id, name, time_suggestion, order_index)
                    VALUES (v_day_id, v_meal_item->>'name', (v_meal_item->>'time_suggestion')::TIME, (v_meal_item->>'order_index')::INT)
                    RETURNING id INTO v_meal_id;

                    -- 4. Itens (Pratos)
                    FOR v_meal_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_meal_item->'items', '[]'::jsonb))
                    LOOP
                        v_dish_name := v_meal_option->>'dish_name';
                        v_dish_details := v_meal_option->'dish_details';
                        
                        -- Resolver Prato (Find or Create)
                        SELECT id INTO v_dish_id FROM dishes WHERE name ILIKE v_dish_name LIMIT 1;
                        
                        IF v_dish_id IS NULL THEN
                             -- Criação automática do prato (Simplificada)
                             -- Se houver dish_details, poderia criar ingredientes. 
                             -- Aqui criamos apenas o header do Prato para não falhar a importação do Plano.
                             -- O ideal seria chamar recursive import_dishes, mas SQL não permite chamar RPC facilmente assim.
                             -- Vamos criar um Stub de Prato.
                             INSERT INTO dishes (name, description, visibility_type, created_by)
                             VALUES (v_dish_name, COALESCE(v_dish_details->>'description', 'Gerado via Importação de Plano'), 'private', auth.uid())
                             RETURNING id INTO v_dish_id;
                             
                             v_logs := array_append(v_logs, 'Aviso: Prato criado automaticamente (vazio): ' || v_dish_name);
                             
                             -- TODO: Se dish_details tiver ingredients, inserir em dish_ingredients aqui.
                             -- (Deixando para V2 por complexidade)
                        END IF;

                        INSERT INTO diet_plan_items (
                            diet_plan_meal_id, dish_id, 
                            portion_scale, quantity_override, observation, is_optional
                        ) VALUES (
                            v_meal_id, v_dish_id,
                            COALESCE((v_meal_option->>'portion_scale')::NUMERIC, 1.0),
                            v_meal_option->>'quantity_override',
                            v_meal_option->>'observation',
                            COALESCE((v_meal_option->>'is_optional')::BOOLEAN, false)
                        );
                    END LOOP;
                END LOOP;
            END LOOP;

            v_imported_count := v_imported_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('plan', v_plan_item->>'title', 'error', SQLERRM);
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
