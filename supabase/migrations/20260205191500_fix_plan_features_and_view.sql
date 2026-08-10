-- ================================================
-- FIX PLAN FEATURES REFERENTIAL INTEGRITY AND VIEW
-- Migration: 20260205191500_fix_plan_features_and_view.sql
-- ================================================

-- 1. PRE-CLEANUP: Ensure all feature keys in plan_features exist in feature_flags
-- This fixes the SQLSTATE 23503 error (foreign_key_violation)
INSERT INTO public.feature_flags (key, display_name, description, enabled)
SELECT DISTINCT feature_key, feature_key, 'Auto-generated missing flag', false
FROM public.plan_features
WHERE feature_key NOT IN (SELECT key FROM public.feature_flags)
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure foreign key exists from plan_features to feature_flags
-- This allows Postgrest to perform joins automatically
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plan_features_feature_key_fkey'
    ) THEN
        -- Link plan_features.feature_key to feature_flags.key
        ALTER TABLE public.plan_features
        ADD CONSTRAINT plan_features_feature_key_fkey 
        FOREIGN KEY (feature_key) REFERENCES public.feature_flags(key) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Update vw_plan_comparisons to be more descriptive
-- Drop first to allow column changes
DROP VIEW IF EXISTS public.vw_plan_comparisons;

CREATE OR REPLACE VIEW public.vw_plan_comparisons AS
WITH all_plans AS (
    SELECT id, name, description, display_order FROM public.plans WHERE is_active = true
),
plan_feat_details AS (
    -- Join with feature_flags to get names and translations
    SELECT 
        pf.plan_id,
        pf.feature_key,
        pf.enabled,
        ff.display_name,
        ff.display_name_en,
        ff.display_name_es,
        ff.show_in_plans
    FROM public.plan_features pf
    LEFT JOIN public.feature_flags ff ON pf.feature_key = ff.key
),
plan_feat_agg AS (
    SELECT 
        plan_id,
        -- Keep legacy boolean map for compatibility
        jsonb_object_agg(feature_key, enabled) as feature_map,
        -- New detailed map with translations
        jsonb_object_agg(
            feature_key, 
            jsonb_build_object(
                'enabled', enabled,
                'display_name', display_name,
                'display_name_en', display_name_en,
                'display_name_es', display_name_es,
                'show_in_plans', COALESCE(show_in_plans, true)
            )
        ) as feature_details
    FROM plan_feat_details
    GROUP BY plan_id
),
plan_price_single AS (
    SELECT DISTINCT ON (plan_id) 
        plan_id, 
        price_id,
        interval,
        display_price,
        display_currency
    FROM public.plan_prices 
    WHERE is_active = true 
    ORDER BY plan_id, display_price ASC
)
SELECT 
    p.id as plan_id,
    p.name as plan_name,
    p.description,
    p.display_order,
    COALESCE(fa.feature_map, '{}'::jsonb) as features,
    COALESCE(fa.feature_details, '{}'::jsonb) as feature_details,
    pp.price_id,
    pp.interval as price_interval,
    pp.display_price,
    pp.display_currency
FROM all_plans p
LEFT JOIN plan_feat_agg fa ON fa.plan_id = p.id
LEFT JOIN plan_price_single pp ON pp.plan_id = p.id;

GRANT SELECT ON public.vw_plan_comparisons TO anon, authenticated;

-- Force reload schema
NOTIFY pgrst, 'reload schema';
