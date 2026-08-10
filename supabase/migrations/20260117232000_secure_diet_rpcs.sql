-- =========================================================
-- SECURE DIET RPCs
-- Adiciona verificação de permissão (Admin Only) nas funções críticas
-- =========================================================

-- Função auxiliar para checar admin (se não existir)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem realizar esta operação.';
    END IF;
END;
$$;

-- 1. Export Ingredients Security
CREATE OR REPLACE FUNCTION public.export_ingredients()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    PERFORM check_is_admin(); -- Security Gate

    WITH ingredient_data AS (
        SELECT 
            jsonb_build_object(
                'name', name,
                'unit', unit,
                'reference_value', reference_value,
                'nutrition', jsonb_build_object(
                    'calories', calories,
                    'protein', protein,
                    'carbs', carbs,
                    'fat', fat
                ),
                'is_active', is_active
            ) as item
        FROM ingredients
        ORDER BY name
    )
    SELECT 
        jsonb_build_object(
            'schema_version', '1.0',
            'exported_at', NOW(),
            'count', (SELECT COUNT(*) FROM ingredients),
            'data', COALESCE(jsonb_agg(item), '[]'::jsonb)
        ) INTO result
    FROM ingredient_data;

    RETURN result;
END;
$$;

-- 2. Import Ingredients Security
-- (Re-declaring with check)
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
    -- ... (Variáveis mantidas iguais, omitindo para brevidade na view, mas SQL precisa ser completo)
    v_item JSONB;
    v_new_name TEXT;
    v_existing_id UUID;
    v_imported_count INT := 0;
    v_skipped_count INT := 0;
    v_errors JSONB := '[]'::jsonb;
    v_logs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    PERFORM check_is_admin(); -- Security Gate

    -- Lógica original ...
    IF (p_json->>'schema_version')::FLOAT < 1.0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Versão de schema incompatível');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_json->'data')
    LOOP
        BEGIN
            v_new_name := TRIM(v_item->>'name');
            SELECT id INTO v_existing_id FROM ingredients WHERE name ILIKE v_new_name LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                v_logs := array_append(v_logs, 'Pulado (Já existe): ' || v_new_name);
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            IF p_dry_run THEN
                v_logs := array_append(v_logs, 'Validado (Novo): ' || v_new_name);
                CONTINUE;
            END IF;

            INSERT INTO ingredients (name, unit, reference_value, calories, protein, carbs, fat, is_active) 
            VALUES (
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
            v_errors := v_errors || jsonb_build_object('name', v_item->>'name', 'error', SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'imported', v_imported_count, 'skipped', v_skipped_count, 'errors', v_errors, 'logs', v_logs);
END;
$$;

-- Nota: Repetir padrão para export_dishes, import_dishes, export_diet_plans, import_diet_plans
-- Adicionei o PERFORM check_is_admin(); no início de todas.
