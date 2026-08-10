-- =====================================================
-- PROVISION TEST USERS
-- Creates multiple test users with different roles
-- Idempotent - safe to run multiple times
-- =====================================================

-- =====================================================
-- 1. ENSURE HELPER FUNCTIONS EXIST
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user is admin (no params - uses auth.uid())
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =====================================================
-- 2. PROVISION EXISTING TEST USERS (if created via Auth API)
-- This runs after users are created by the deploy script
-- =====================================================

-- Helper function to provision a test user profile and role
CREATE OR REPLACE FUNCTION public.provision_test_user_profile(
  _email text,
  _full_name text,
  _role app_role DEFAULT 'user'::app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User % not found in auth.users - skipping', _email;
    RETURN;
  END IF;
  
  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status)
  VALUES (
    _user_id,
    _email,
    _full_name,
    'active',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    subscription_status = 'active',
    account_status = 'active',
    current_plan_id = (SELECT id FROM public.plans WHERE name = 'Plano Free' LIMIT 1),
    updated_at = now();
  
  -- Assign role (avoid duplicates)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Provisioned user: % with role: %', _email, _role;
END;
$$;

-- =====================================================
-- 3. TRIGGER TO AUTO-PROVISION TEST USERS ON SIGNUP
-- Automatically assigns roles based on email pattern
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_provision_test_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _full_name text;
BEGIN
  -- Determine role based on email
  _role := CASE
    WHEN NEW.email = 'admin@admin.com' THEN 'admin'::app_role
    WHEN NEW.email = 'user@test.com' THEN 'user'::app_role
    WHEN NEW.email = 'pt@test.com' THEN 'personal_trainer'::app_role
    WHEN NEW.email = 'content@test.com' THEN 'content_creator'::app_role
    WHEN NEW.email LIKE '%@test.com' THEN 'user'::app_role
    ELSE NULL
  END;
  
  -- Only provision if it's a test user
  IF _role IS NOT NULL THEN
    -- Determine display name
    _full_name := CASE
      WHEN NEW.email = 'admin@admin.com' THEN 'Administrador'
      WHEN NEW.email = 'user@test.com' THEN 'Usuário Teste'
      WHEN NEW.email = 'gym@test.com' THEN 'Academia Teste'
      WHEN NEW.email = 'pt@test.com' THEN 'Personal Trainer Teste'
      WHEN NEW.email = 'content@test.com' THEN 'Criador de Conteúdo Teste'
      ELSE COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário Teste')
    END;
    
    -- Create profile with active subscription
    INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status)
    VALUES (
      NEW.id,
      NEW.email,
      _full_name,
      'active',
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      subscription_status = 'active',
      account_status = 'active',
      current_plan_id = (SELECT id FROM public.plans WHERE name = 'Plano Free' LIMIT 1),
      updated_at = now();
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Auto-provisioned test user: % with role: %', NEW.email, _role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_test_user_created ON auth.users;

CREATE TRIGGER on_test_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_test_user();

-- =====================================================
-- 4. PROVISION EXISTING TEST USERS
-- Run this to provision users that may already exist
-- =====================================================

DO $$
BEGIN
  PERFORM public.provision_test_user_profile('admin@admin.com', 'Administrador', 'admin');
  PERFORM public.provision_test_user_profile('user@test.com', 'Usuário Teste', 'user');
  PERFORM public.provision_test_user_profile('pt@test.com', 'Personal Trainer Teste', 'personal_trainer');
  PERFORM public.provision_test_user_profile('content@test.com', 'Criador de Conteúdo Teste', 'content_creator');
END;
$$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration:
-- 1. Creates helper functions (has_role, is_admin)
-- 2. Creates provision_test_user_profile function
-- 3. Creates auto-provision trigger for test users
-- 4. Provisions existing test users (if they exist)
--
-- Test users created by deploy:
-- - admin@admin.com (admin)
-- - user@test.com (user)
-- - gym@test.com (academy_admin)
-- - pt@test.com (personal_trainer)
-- - content@test.com (content_creator)
--
-- All users have:
-- - must_change_password: true (in user_metadata)
-- - email_confirm: true (no confirmation needed)
-- - subscription_status: active
-- - account_status: active
-- =====================================================
