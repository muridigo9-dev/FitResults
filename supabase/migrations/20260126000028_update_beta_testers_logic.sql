-- Update auto-provisioning logic to handle Beta Testers
-- and correct existing beta accounts

-- 1. Update the trigger function to verify 'is_beta_tester' metadata
CREATE OR REPLACE FUNCTION public.auto_provision_test_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _full_name text;
  _is_beta boolean;
  _free_plan_id uuid;
BEGIN
  -- Get Free Plan ID safely
  SELECT id INTO _free_plan_id FROM public.plans WHERE name = 'Plano Free' LIMIT 1;

  -- Check metadata
  _is_beta := COALESCE((NEW.raw_user_meta_data->>'is_beta_tester')::boolean, false);

  -- Determine role based on email or metadata
  _role := CASE
    WHEN NEW.email = 'admin@admin.com' THEN 'admin'::app_role
    WHEN NEW.email = 'user@test.com' THEN 'user'::app_role
    WHEN NEW.email = 'pt@test.com' THEN 'personal_trainer'::app_role
    WHEN NEW.email = 'content@test.com' THEN 'content_creator'::app_role
    WHEN NEW.email LIKE '%@test.com' THEN 'user'::app_role
    WHEN _is_beta THEN 'user'::app_role -- Beta testers are Users
    ELSE NULL
  END;
  
  -- Only provision if it's a test user or beta tester
  IF _role IS NOT NULL THEN
    -- Determine display name
    _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário Teste');
    
    -- Create profile with active subscription and Free Plan
    INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status, current_plan_id)
    VALUES (
      NEW.id,
      NEW.email,
      _full_name,
      'active',
      'active',
      _free_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
      subscription_status = 'active',
      account_status = 'active',
      current_plan_id = _free_plan_id,
      updated_at = now();
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Auto-provisioned user: % with role: % (Beta: %)', NEW.email, _role, _is_beta;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Fix existing Beta Testers (update their profiles to Active + Free Plan)
DO $$
DECLARE
  _free_plan_id uuid;
  _beta_email text;
  _beta_emails text[] := ARRAY[
    'jailtonssam@gmail.com',
    'robertocmoreno@hotmail.com',
    'ronycamargo38@gmail.com',
    'maodeobrarural@hotmail.com',
    'rcolnago@gmail.com',
    'lianydelrosario@gmail.com',
    'rodriguesdacostadouglas1@gmail.com',
    'izildo@gmail.com',
    'ptripode@gmail.com',
    'dfaria.ti@gmail.com'
  ];
BEGIN
  SELECT id INTO _free_plan_id FROM public.plans WHERE name = 'Plano Free' LIMIT 1;
  
  IF _free_plan_id IS NOT NULL THEN
    FOREACH _beta_email IN ARRAY _beta_emails
    LOOP
        -- Update Profile if exists
        UPDATE public.profiles
        SET 
            subscription_status = 'active',
            account_status = 'active',
            current_plan_id = _free_plan_id,
            updated_at = now()
        WHERE email = _beta_email;
        
        -- Ensure role exists
        INSERT INTO public.user_roles (user_id, role)
        SELECT id, 'user'
        FROM auth.users
        WHERE email = _beta_email
        ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
