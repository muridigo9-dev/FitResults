-- Migration: 20260118000002_feature_gating_functions.sql
-- Description: Core Logic for Hierarchical Feature Gating

-- 1. Function: is_feature_active_for_user
-- Determines if a specific feature is enabled for a user based on:
-- Global Flag -> Administration -> Plan Entitlement -> User Context

CREATE OR REPLACE FUNCTION public.is_feature_active_for_user(
    feature_key_param TEXT,
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_global_enabled BOOLEAN;
    v_is_admin BOOLEAN;
    v_plan_id UUID;
    v_academy_plan_id UUID;
    v_user_plan_id UUID;
BEGIN
    -- 1. Global Switch (Level 0)
    -- If the feature is globally disabled, NOBODY accesses it (System Maintenance/Kill Switch)
    SELECT enabled INTO v_global_enabled
    FROM public.feature_flags
    WHERE key = feature_key_param;

    -- If flag doesn't exist or is disabled, return false immediately
    IF v_global_enabled IS NULL OR v_global_enabled = false THEN
        RETURN false;
    END IF;

    -- 2. Super Admin Bypass (Level 0.5)
    -- Admins ignore Plan limits, BUT respect Global Kill Switch (already checked above)
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_id_param AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
        RETURN true;
    END IF;

    -- 3. Determine Effective Plan (Level 1)
    
    -- A. Check if user is an active member of an Academy (Multi-tenant context)
    -- We prioritize Academy Plan over Personal Plan if the user is in an academy context.
    -- (Simplification: If user is in ANY active academy, we use that academy's plan.
    --  In a clearer context, we might pass academy_id as param, but for RLS we assume current context or primary context)
    
    SELECT a.plan_id INTO v_academy_plan_id
    FROM public.academy_members am
    JOIN public.academies a ON am.academy_id = a.id
    WHERE am.user_id = user_id_param
      AND am.status = 'active'
      AND a.status = 'active'
    LIMIT 1; -- Take the first active academy found

    IF v_academy_plan_id IS NOT NULL THEN
        v_plan_id := v_academy_plan_id;
    ELSE
        -- B. Fallback to User Personal Plan (SaaS)
        SELECT current_plan_id INTO v_user_plan_id
        FROM public.profiles
        WHERE id = user_id_param;
        
        v_plan_id := v_user_plan_id;
    END IF;

    -- 4. Plan Entitlement Check
    -- If no plan is found, access is DENIED (Strict default)
    -- To allow "Free" access, user/academy MUST have the Free Plan assigned.
    IF v_plan_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check if the plan has the feature enabled
    RETURN EXISTS (
        SELECT 1 
        FROM public.plan_features
        WHERE plan_id = v_plan_id
          AND feature_key = feature_key_param
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_feature_active_for_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_active_for_user(TEXT, UUID) TO service_role;


-- 2. RPC: get_active_features
-- Returns array of all active feature keys for the current user
-- Used by Frontend to initialize FeatureFlagsContext efficiently
CREATE OR REPLACE FUNCTION public.get_active_features()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    active_features TEXT[];
BEGIN
    SELECT array_agg(key)
    INTO active_features
    FROM public.feature_flags ff
    WHERE public.is_feature_active_for_user(ff.key, v_user_id);

    RETURN COALESCE(active_features, '{}');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_features() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_features() TO service_role;
