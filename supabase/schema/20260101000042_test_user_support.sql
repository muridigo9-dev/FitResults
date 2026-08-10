-- =====================================================
-- ADD TEST USER SUPPORT
-- =====================================================
-- This migration adds is_test_user column and updates
-- has_active_subscription to bypass subscription checks
-- for test/system users.
-- =====================================================

-- Add is_test_user column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_test_user IS 'Flag to identify test/system users that bypass subscription checks';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_test_user 
ON public.profiles(is_test_user) WHERE is_test_user = true;

-- Update existing test users to have correct flags
UPDATE public.profiles
SET 
  is_test_user = true,
  subscription_status = 'active',
  account_status = 'active'
WHERE email IN (
  'admin@admin.com',
  'user@test.com',
  'gym@test.com',
  'pt@test.com',
  'content@test.com'
);

-- =====================================================
-- UPDATE has_active_subscription FUNCTION
-- =====================================================
-- Now checks for:
-- 1. Test users (is_test_user = true) → always active
-- 2. Admin role → always active
-- 3. Special roles (gym, personal_trainer, content_creator) created as test → active
-- 4. Regular users → check subscription_status
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_test_user boolean;
    v_is_admin boolean;
    v_is_special_role boolean;
    v_sub_status text;
    v_acc_status text;
BEGIN
    -- Step 1: Check if user is a test user (fastest check)
    SELECT is_test_user, subscription_status, account_status
    INTO v_is_test_user, v_sub_status, v_acc_status
    FROM public.profiles
    WHERE id = check_user_id;
    
    -- Test users always have access
    IF v_is_test_user = true THEN
        RETURN true;
    END IF;
    
    -- Step 2: Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
        RETURN true;
    END IF;
    
    -- Step 3: Check if user has special roles AND is a test user by email pattern
    -- This catches test users that might not have is_test_user flag set
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = check_user_id 
        AND ur.role IN ('personal_trainer', 'content_creator', 'academy_admin')
        AND (
            p.is_test_user = true 
            OR p.email LIKE '%@test.com'
            OR p.email = 'admin@admin.com'
        )
    ) INTO v_is_special_role;
    
    IF v_is_special_role THEN
        RETURN true;
    END IF;
    
    -- Step 4: Return false if account is cancelled
    IF v_acc_status = 'cancelled' THEN
        RETURN false;
    END IF;
    
    -- Step 5: Return true if subscription is active or trialing
    RETURN v_sub_status IN ('active', 'trialing');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;

-- =====================================================
-- HELPER FUNCTION: is_test_user
-- =====================================================
-- Quick check if a user is a test/system user

CREATE OR REPLACE FUNCTION public.is_test_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_test boolean;
    v_email text;
BEGIN
    SELECT is_test_user, email
    INTO v_is_test, v_email
    FROM public.profiles
    WHERE id = check_user_id;
    
    -- Check is_test_user flag or email pattern
    RETURN COALESCE(v_is_test, false) 
        OR v_email LIKE '%@test.com'
        OR v_email = 'admin@admin.com';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_test_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_test_user(uuid) TO service_role;
