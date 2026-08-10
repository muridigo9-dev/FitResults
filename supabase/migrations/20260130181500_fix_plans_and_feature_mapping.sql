-- Migration: 20260130181500_fix_plans_and_feature_mapping.sql
-- Description: Fix plan name consistency and ensure all core features are enabled for all plans
-- Created: 2026-01-30

-- 1. Ensure Plan Names are consistent
-- Many scripts use 'Plano Free' but the plans table has 'Free'
UPDATE public.plans 
SET name = 'Plano Free' 
WHERE name = 'Free';

UPDATE public.plans 
SET name = 'Plano Pro' 
WHERE name = 'Pro';

-- 2. Retroactively assign default plan to users with null current_plan_id
-- We look for 'Plano Free' ID
DO $$
DECLARE
    v_free_plan_id UUID;
BEGIN
    SELECT id INTO v_free_plan_id FROM public.plans WHERE name = 'Plano Free' LIMIT 1;
    
    IF v_free_plan_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET current_plan_id = v_free_plan_id 
        WHERE current_plan_id IS NULL;
        
        -- Also ensure they have a record in user_subscriptions for RLS
        INSERT INTO public.user_subscriptions (user_id, plan_id, status)
        SELECT id, v_free_plan_id, 'active'
        FROM public.profiles
        WHERE current_plan_id = v_free_plan_id
        ON CONFLICT (user_id, plan_id) DO UPDATE SET status = 'active';
    END IF;
END $$;

-- 3. Mass Mapping: Enable core features for ALL plans
-- Core features that should be visible to everyone (gated by global flag only or basic access)
WITH core_features AS (
    SELECT unnest(ARRAY[
        'training_mode_enabled', 
        'exercises_enabled', 
        'diets_enabled', 
        'summary_enabled', 
        'gamification_enabled',
        'habits_enabled',
        'water_tracking'
    ]) as feature_key
)
INSERT INTO public.plan_features (plan_id, feature_key, enabled)
SELECT p.id, cf.feature_key, true
FROM public.plans p
CROSS JOIN core_features cf
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = true;

-- 4. Ensure Global Flags are ON for these core features
UPDATE public.feature_flags 
SET enabled = true 
WHERE key IN (
    'training_mode_enabled', 
    'exercises_enabled', 
    'diets_enabled', 
    'summary_enabled', 
    'gamification_enabled'
);
