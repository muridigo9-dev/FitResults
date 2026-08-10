-- ============================================================
-- FIX: is_feature_active_for_user must check enabled column
-- Migration: 20260123000010_fix_plan_feature_enabled_check.sql
-- ============================================================
-- PROBLEMA: A função apenas verifica se feature EXISTS em plan_features
-- mas não verifica se enabled = true
-- ============================================================

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
    v_feature_enabled BOOLEAN;
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
    SELECT a.plan_id INTO v_academy_plan_id
    FROM public.academy_members am
    JOIN public.academies a ON am.academy_id = a.id
    WHERE am.user_id = user_id_param
      AND am.status = 'active'
      AND a.status = 'active'
    LIMIT 1;

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
    IF v_plan_id IS NULL THEN
        RETURN false;
    END IF;

    -- 5. Check if the plan has the feature ENABLED (not just exists!)
    -- FIX: Added "AND enabled = true" condition
    SELECT enabled INTO v_feature_enabled
    FROM public.plan_features
    WHERE plan_id = v_plan_id
      AND feature_key = feature_key_param;
    
    -- If feature not in plan_features, return false
    -- If feature exists but enabled = false, return false
    RETURN COALESCE(v_feature_enabled, false);
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.is_feature_active_for_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_active_for_user(TEXT, UUID) TO service_role;

-- Log fix
DO $$ BEGIN 
  RAISE NOTICE 'Fixed is_feature_active_for_user to check enabled column in plan_features';
END $$;
