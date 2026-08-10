-- =========================================================
-- EXPORT INGREDIENTS RPC (JSON TEMPLATE V1.0)
-- =========================================================

CREATE OR REPLACE FUNCTION public.export_ingredients()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
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
