-- Migration: 20260130171500_add_summary_feature_flag.sql
-- Description: Add summary_enabled feature flag for the Evolution module
-- Created: 2026-01-30

-- 1. Ensure summary_enabled exists in feature_flags
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
    'summary_enabled', 
    'Habilita o módulo de Evolução (Resumo consolidado)', 
    true, 
    false, 
    '["summary"]'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Add to existing plans (optional - enabling for all plans that have training or diets)
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
SELECT DISTINCT plan_id, 'summary_enabled', true
FROM public.plan_features
ON CONFLICT (plan_id, feature_key) DO NOTHING;
