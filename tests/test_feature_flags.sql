-- Test: Feature Flag Logic Verification
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Setup Test Data
INSERT INTO public.feature_flags (key, enabled, description) 
VALUES ('test_feature_A', true, 'Test Feature A (Global ON)')
ON CONFLICT (key) DO UPDATE SET enabled = true;

INSERT INTO public.feature_flags (key, enabled, description) 
VALUES ('test_feature_B', false, 'Test Feature B (Global OFF)')
ON CONFLICT (key) DO UPDATE SET enabled = false;

-- Create Plan without features
DO $$
DECLARE v_plan_id UUID;
BEGIN
    INSERT INTO public.plans (name, price, currency, interval, features)
    VALUES ('Test Plan Basic', 0, 'BRL', 'month', '[]'::jsonb)
    RETURNING id INTO v_plan_id;
    
    -- Create Plan with features
    INSERT INTO public.plans (name, price, currency, interval, features)
    VALUES ('Test Plan Pro', 100, 'BRL', 'month', '[]'::jsonb)
    RETURNING id INTO v_plan_id;
    
    INSERT INTO public.plan_features (plan_id, feature_key)
    VALUES (v_plan_id, 'test_feature_A');
END $$;


-- 2. Verify Logic

-- Case 1: Global Flag Disabled
-- Expected: is_feature_active_for_user('test_feature_B', user_id) should be FALSE for EVERYONE
-- (We'll check using a random UUID as user_id since logic handles null plans as false anyway)
SELECT 
    'Global Disabled Check' as test_case,
    public.is_feature_active_for_user('test_feature_B', gen_random_uuid()) = false as result;

-- Case 2: Global Enabled, User has no plan
-- Expected: FALSE (Default deny)
SELECT 
    'No Plan Check' as test_case,
    public.is_feature_active_for_user('test_feature_A', gen_random_uuid()) = false as result;

-- Case 3: Create User with Pro Plan and Check
DO $$
DECLARE 
    v_pro_plan_id UUID;
    v_user_id UUID;
    v_result boolean;
BEGIN
    SELECT id INTO v_pro_plan_id FROM public.plans WHERE name = 'Test Plan Pro' LIMIT 1;
    
    -- Create dummy user (profile)
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test_pro@example.com') RETURNING id INTO v_user_id;
    INSERT INTO public.profiles (id, current_plan_id) VALUES (v_user_id, v_pro_plan_id);

    -- Check
    v_result := public.is_feature_active_for_user('test_feature_A', v_user_id);
    
    RAISE NOTICE 'User Pro Access Result: %', v_result;
    
    IF v_result != true THEN
        RAISE EXCEPTION 'Test Failed: Pro user should have access to feature A';
    END IF;
    
    -- Cleanup
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
END $$;

ROLLBACK; -- Always rollback to keep DB clean
