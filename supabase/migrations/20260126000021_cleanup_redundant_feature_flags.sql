-- Migration: 20260126000021_cleanup_redundant_feature_flags.sql
-- Description: Remove redundant feature flags rest_timer_enabled and workouts_enabled
-- Created: 2026-01-26

-- 1. Ensure training_mode_enabled exists in feature_flags if it doesn't already
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
SELECT 'training_mode_enabled', 'Habilita o módulo de treinos e execução', true, false, '["workouts"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'training_mode_enabled')
ON CONFLICT (key) DO NOTHING;

-- 2. Migrate plan features: if workouts_enabled was enabled for a plan, ensure training_mode_enabled is also enabled
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
SELECT plan_id, 'training_mode_enabled', enabled
FROM public.plan_features
WHERE feature_key = 'workouts_enabled'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- 3. Delete redundant flags from global feature_flags
-- We disable the trigger to avoid FK violations in the audit log during hard deletion
ALTER TABLE public.feature_flags DISABLE TRIGGER feature_flag_audit_trigger;

DELETE FROM public.feature_flags WHERE key IN ('workouts_enabled', 'rest_timer_enabled');

ALTER TABLE public.feature_flags ENABLE TRIGGER feature_flag_audit_trigger;

-- 4. Delete redundant flags from plan_features
DELETE FROM public.plan_features WHERE feature_key IN ('workouts_enabled', 'rest_timer_enabled');
