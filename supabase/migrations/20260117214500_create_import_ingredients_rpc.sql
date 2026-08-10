-- =========================================================
-- IMPORT INGREDIENTS RPC (JSON TEMPLATE V1.0)
-- =========================================================

CREATE OR REPLACE FUNCTION public.import_ingredients(
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
    v_new_name TEXT;
    v_existing_id UUID;
    v_imported_count INT := 0;
    v_skipped_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Validar versão do schema
    IF (p_json->>'schema_version')::FLOAT < 1.0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Versão de schema incompatível');
    END IF;

    -- Iterar sobre os itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            v_new_name := TRIM(v_item->>'name');
            
            -- Verificar Duplicidade (Case Insensitive)
            SELECT id INTO v_existing_id 
            FROM ingredients 
            WHERE name ILIKE v_new_name 
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                v_logs := array_append(v_logs, 'Pulado (Já existe): ' || v_new_name);
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Se Dry Run, apenas logar que seria criado
            IF p_dry_run THEN
                v_logs := array_append(v_logs, 'Validado (Novo): ' || v_new_name);
                CONTINUE;
            END IF;

            -- Inserir Novo Ingrediente
            INSERT INTO ingredients (
                name,
                unit,
                reference_value,
                calories,
                protein,
                carbs,
                fat,
                is_active
            ) VALUES (
                v_new_name,
                COALESCE(v_item->>'unit', 'g'),
                COALESCE((v_item->>'reference_value')::NUMERIC, 100),
                COALESCE((v_item->'nutrition'->>'calories')::NUMERIC, 0),
                COALESCE((v_item->'nutrition'->>'protein')::NUMERIC, 0),
                COALESCE((v_item->'nutrition'->>'carbs')::NUMERIC, 0),
                COALESCE((v_item->'nutrition'->>'fat')::NUMERIC, 0),
                COALESCE((v_item->>'is_active')::BOOLEAN, TRUE)
            );

            v_imported_count := v_imported_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'name', v_item->>'name',
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
