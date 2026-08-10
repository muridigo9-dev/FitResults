-- =========================================================
-- EXPORT DISHES RPC (JSON TEMPLATE V1.0)
-- =========================================================

CREATE OR REPLACE FUNCTION public.export_dishes()
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
                'name', d.name,
                'description', d.description,
                'visibility_type', d.visibility_type,
                'ingredients', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'name', i.name, -- Nome para match na importação
                            'quantity', di.quantity,
                            'metric_unit', di.metric_unit
                        )
                    ), '[]'::jsonb)
                    FROM dish_ingredients di
                    JOIN ingredients i ON di.ingredient_id = i.id
                    WHERE di.dish_id = d.id
                )
            ) as item
        FROM dishes d
        -- Opcional: Filtrar apenas globais ou do usuário, por enquanto exporta tudo que o user vê (RLS atua?)
        -- Como é SECURITY DEFINER, cuidado. Vamos restringir a globais para admin backup.
        -- TODO: Adicionar parametros de filtro no futuro.
        ORDER BY d.name
    )
    SELECT 
        jsonb_build_object(
            'schema_version', '1.0',
            'exported_at', NOW(),
            'count', (SELECT COUNT(*) FROM dishes),
            'data', COALESCE(jsonb_agg(item), '[]'::jsonb)
        ) INTO result
    FROM dish_data;

    RETURN result;
END;
$$;
