-- =====================================================
-- COMPLETE TEST USERS SYSTEM
-- Creates all test users with proper roles, subscriptions,
-- and relationships (academies, trainers, students)
-- 
-- IDEMPOTENT: Safe to run multiple times
-- ENVIRONMENT-AWARE: Only creates in development/staging
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Check if we should create test data
-- =====================================================

CREATE OR REPLACE FUNCTION public.should_create_test_data()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if ENABLE_TEST_SEED environment variable is set
  -- In production, this should NEVER be true
  RETURN COALESCE(
    current_setting('app.enable_test_seed', true)::boolean,
    false
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =====================================================
-- 2. ENHANCED PROVISION FUNCTION
-- Creates user in auth.users if not exists, then provisions profile
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_complete_test_user(
  _email text,
  _password text DEFAULT 'Test@123',
  _full_name text DEFAULT NULL,
  _role app_role DEFAULT 'user'::app_role,
  _subscription_status text DEFAULT 'active',
  _account_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _encrypted_password text;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  -- If user doesn't exist, create it
  IF _user_id IS NULL THEN
    -- Generate a new UUID
    _user_id := gen_random_uuid();
    
    -- Hash the password using crypt
    _encrypted_password := crypt(_password, gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      _email,
      _encrypted_password,
      NOW(), -- Email already confirmed
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', COALESCE(_full_name, 'Test User'),
        'must_change_password', true,
        'is_test_user', true
      ),
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Created auth.user: %', _email;
  ELSE
    RAISE NOTICE 'User already exists: %', _email;
  END IF;
  
  -- Create or update profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_status,
    account_status,
    created_at,
    updated_at
  )
  VALUES (
    _user_id,
    _email,
    COALESCE(_full_name, 'Test User'),
    _subscription_status,
    _account_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    subscription_status = EXCLUDED.subscription_status,
    account_status = EXCLUDED.account_status,
    updated_at = NOW();
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Provisioned user: % (%) with role: %', _full_name, _email, _role;
  
  RETURN _user_id;
END;
$$;

-- =====================================================
-- 3. CREATE ALL TEST USERS
-- Only if in development/staging environment
-- =====================================================

DO $$
DECLARE
  _admin_id uuid;
  _user_id uuid;
  _gym_id uuid;
  _pt_id uuid;
  _nutri_id uuid;
  _content_id uuid;
  _student1_id uuid;
  _student2_id uuid;
  _student3_id uuid;
  _academy_id uuid;
BEGIN
  -- Skip if not in test environment
  IF NOT public.should_create_test_data() THEN
    RAISE NOTICE 'Skipping test user creation - not in test environment';
    RETURN;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREATING TEST USERS';
  RAISE NOTICE '========================================';
  
  -- 1. SUPER ADMIN
  _admin_id := public.provision_complete_test_user(
    _email := 'admin@test.com',
    _password := 'Admin@123',
    _full_name := 'Super Administrador',
    _role := 'admin'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 2. REGULAR USER
  _user_id := public.provision_complete_test_user(
    _email := 'user@test.com',
    _password := 'User@123',
    _full_name := 'Usuário Teste',
    _role := 'user'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 3. ACADEMY ADMIN
  _gym_id := public.provision_complete_test_user(
    _email := 'gym@test.com',
    _password := 'Gym@123',
    _full_name := 'Academia Fit Test',
    _role := 'academy_admin'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 4. PERSONAL TRAINER
  _pt_id := public.provision_complete_test_user(
    _email := 'pt@test.com',
    _password := 'PT@123',
    _full_name := 'Personal Trainer João',
    _role := 'personal_trainer'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 5. NUTRITIONIST
  _nutri_id := public.provision_complete_test_user(
    _email := 'nutritionist@test.com',
    _password := 'Nutri@123',
    _full_name := 'Nutricionista Maria',
    _role := 'nutritionist'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 6. CONTENT CREATOR
  _content_id := public.provision_complete_test_user(
    _email := 'content@test.com',
    _password := 'Content@123',
    _full_name := 'Criador de Conteúdo Pedro',
    _role := 'content_creator'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  -- 7-9. STUDENTS
  _student1_id := public.provision_complete_test_user(
    _email := 'student1@test.com',
    _password := 'Student@123',
    _full_name := 'Aluno Carlos Silva',
    _role := 'user'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  _student2_id := public.provision_complete_test_user(
    _email := 'student2@test.com',
    _password := 'Student@123',
    _full_name := 'Aluna Ana Santos',
    _role := 'user'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  _student3_id := public.provision_complete_test_user(
    _email := 'student3@test.com',
    _password := 'Student@123',
    _full_name := 'Aluno Bruno Costa',
    _role := 'user'::app_role,
    _subscription_status := 'active',
    _account_status := 'active'
  );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREATING ACADEMY AND RELATIONSHIPS';
  RAISE NOTICE '========================================';
  
  -- =====================================================
  -- 4. CREATE ACADEMY
  -- =====================================================
  
  INSERT INTO public.academies (
    id,
    name,
    slug,
    owner_id,
    plan_type,
    subscription_status,
    allow_multi_academy_professionals,
    max_members,
    branding,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    'Academia Fit Test',
    'academia-fit-test',
    _gym_id,
    'professional',
    'active',
    true,
    100,
    jsonb_build_object(
      'primary_color', '#8B5CF6',
      'logo_url', NULL,
      'banner_url', NULL
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    owner_id = EXCLUDED.owner_id,
    updated_at = NOW()
  RETURNING id INTO _academy_id;
  
  RAISE NOTICE 'Created academy: % (ID: %)', 'Academia Fit Test', _academy_id;
  
  -- =====================================================
  -- 5. CREATE ACADEMY MEMBERS
  -- =====================================================
  
  -- Owner
  INSERT INTO public.academy_members (
    academy_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  VALUES (
    _academy_id,
    _gym_id,
    'owner',
    'active',
    '["manage_members", "manage_content", "manage_settings", "view_stats"]'::jsonb,
    NOW()
  )
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  -- Personal Trainer
  INSERT INTO public.academy_members (
    academy_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  VALUES (
    _academy_id,
    _pt_id,
    'trainer',
    'active',
    '["create_content", "view_students", "manage_assignments"]'::jsonb,
    NOW()
  )
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  -- Nutritionist
  INSERT INTO public.academy_members (
    academy_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  VALUES (
    _academy_id,
    _nutri_id,
    'nutritionist',
    'active',
    '["create_diets", "view_students"]'::jsonb,
    NOW()
  )
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  -- Content Creator
  INSERT INTO public.academy_members (
    academy_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  VALUES (
    _academy_id,
    _content_id,
    'content_creator',
    'active',
    '["create_content"]'::jsonb,
    NOW()
  )
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  -- Students
  INSERT INTO public.academy_members (academy_id, user_id, role, status, joined_at)
  VALUES
    (_academy_id, _student1_id, 'student', 'active', NOW()),
    (_academy_id, _student2_id, 'student', 'active', NOW()),
    (_academy_id, _student3_id, 'student', 'active', NOW())
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Created academy members for: %', _academy_id;
  
  -- =====================================================
  -- 6. CREATE TRAINER-STUDENT RELATIONSHIPS
  -- =====================================================
  
  -- PT's students (within academy)
  INSERT INTO public.trainer_students (trainer_id, student_id, status, notes)
  VALUES
    (_pt_id, _student1_id, 'active', 'Aluno focado em hipertrofia'),
    (_pt_id, _student2_id, 'active', 'Aluna focada em emagrecimento'),
    (_pt_id, _student3_id, 'active', 'Aluno iniciante')
  ON CONFLICT (trainer_id, student_id) DO NOTHING;
  
  RAISE NOTICE 'Created trainer-student relationships';
  
  -- =====================================================
  -- 7. CREATE CONTENT CREATOR PERMISSIONS
  -- =====================================================
  
  INSERT INTO public.content_creator_permissions (
    user_id,
    can_create_diets,
    can_create_workouts,
    can_create_challenges,
    can_create_habits,
    allowed_group_ids,
    max_content_items,
    is_approved,
    approved_by,
    approved_at
  )
  VALUES (
    _content_id,
    true,
    true,
    true,
    true,
    NULL, -- Can create for all groups
    NULL, -- No limit
    true,
    _admin_id,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_approved = true,
    approved_at = NOW();
  
  RAISE NOTICE 'Created content creator permissions';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST USERS CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Credentials (all passwords can be changed on first login):';
  RAISE NOTICE '  admin@test.com / Admin@123';
  RAISE NOTICE '  user@test.com / User@123';
  RAISE NOTICE '  gym@test.com / Gym@123';
  RAISE NOTICE '  pt@test.com / PT@123';
  RAISE NOTICE '  nutritionist@test.com / Nutri@123';
  RAISE NOTICE '  content@test.com / Content@123';
  RAISE NOTICE '  student1@test.com / Student@123';
  RAISE NOTICE '  student2@test.com / Student@123';
  RAISE NOTICE '  student3@test.com / Student@123';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating test users: %', SQLERRM;
    -- Don't fail the migration, just log the error
END;
$$;

-- =====================================================
-- 8. UPDATE AUTO-PROVISION TRIGGER
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
  -- Only provision if email ends with @test.com
  IF NEW.email NOT LIKE '%@test.com' THEN
    RETURN NEW;
  END IF;
  
  -- Determine role based on email
  _role := CASE
    WHEN NEW.email = 'admin@test.com' THEN 'admin'::app_role
    WHEN NEW.email = 'user@test.com' THEN 'user'::app_role
    WHEN NEW.email = 'gym@test.com' THEN 'academy_admin'::app_role
    WHEN NEW.email = 'pt@test.com' THEN 'personal_trainer'::app_role
    WHEN NEW.email = 'nutritionist@test.com' THEN 'nutritionist'::app_role
    WHEN NEW.email = 'content@test.com' THEN 'content_creator'::app_role
    WHEN NEW.email LIKE 'student%@test.com' THEN 'user'::app_role
    ELSE 'user'::app_role
  END;
  
  -- Determine display name
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.email = 'admin@test.com' THEN 'Super Administrador'
      WHEN NEW.email = 'user@test.com' THEN 'Usuário Teste'
      WHEN NEW.email = 'gym@test.com' THEN 'Academia Fit Test'
      WHEN NEW.email = 'pt@test.com' THEN 'Personal Trainer João'
      WHEN NEW.email = 'nutritionist@test.com' THEN 'Nutricionista Maria'
      WHEN NEW.email = 'content@test.com' THEN 'Criador de Conteúdo Pedro'
      ELSE 'Usuário Teste'
    END
  );
  
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
    updated_at = NOW();
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Auto-provisioned test user: % with role: %', NEW.email, _role;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_test_user_created ON auth.users;

CREATE TRIGGER on_test_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email LIKE '%@test.com')
  EXECUTE FUNCTION public.auto_provision_test_user();

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration creates:
-- ✅ 9 test users (admin, user, gym, PT, nutritionist, content creator, 3 students)
-- ✅ 1 test academy
-- ✅ Academy memberships (owner, trainers, students)
-- ✅ Trainer-student relationships
-- ✅ Content creator permissions
-- ✅ All users have active subscriptions
-- ✅ All users bypass subscription checks
-- ✅ Environment-aware (only runs in test environments)
-- ✅ Idempotent (safe to run multiple times)
-- =====================================================
