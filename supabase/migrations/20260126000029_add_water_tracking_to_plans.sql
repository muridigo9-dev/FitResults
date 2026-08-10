-- Add water_tracking feature to Plans
-- Migration: 20260126000029_add_water_tracking_to_plans.sql

-- Free Plan ID: 00000000-0000-0000-0000-000000000001
-- Pro Plan ID:  00000000-0000-0000-0000-000000000002

-- 1. Enable water_tracking for Free Plan
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'water_tracking', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = true;

-- 2. Enable water_tracking for Pro Plan
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'water_tracking', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = true;

-- 3. Also ensure global flag is enabled just in case
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'water_tracking', 
  'Permite registrar consumo de água', 
  true, 
  true, 
  '["dashboard", "checkin"]'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET 
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  allow_user_content = EXCLUDED.allow_user_content,
  affects = EXCLUDED.affects,
  updated_at = now();
