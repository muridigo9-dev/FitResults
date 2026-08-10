-- =========================================================
-- EXPORT DIET PLANS RPC (JSON TEMPLATE V1.0)
-- =========================================================

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
                'access_level', p.access_level,
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
                                                    'dish_name', dish.name, -- Referência por nome
                                                    'portion_scale', i.portion_scale,
                                                    'quantity_override', i.quantity_override,
                                                    'observation', i.observation,
                                                    'is_optional', i.is_optional,
                                                    -- Se quiser exportar a definição completa do prato para portabilidade total:
                                                    'dish_details', (
                                                         SELECT jsonb_build_object(
                                                            'description', dish.description,
                                                            'ingredients', (
                                                                SELECT jsonb_agg(jsonb_build_object(
                                                                    'name', ing.name,
                                                                    'quantity', di.quantity,
                                                                    'metric_unit', di.metric_unit
                                                                ))
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
            'schema_version', '1.0',
            'exported_at', NOW(),
            'count', (SELECT COUNT(*) FROM plan_data),
            'data', COALESCE(jsonb_agg(item), '[]'::jsonb)
        ) INTO result
    FROM plan_data;

    RETURN result;
END;
$$;
