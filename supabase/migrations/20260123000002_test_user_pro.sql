-- ============================================================
-- USUÁRIO DE TESTE COM PLANO PRO
-- Migration: 20260123000002_test_user_pro.sql
-- ============================================================
-- Atualiza trigger de auto-provisão para criar pro@test.com com plano Pro
-- ============================================================

-- ============================================
-- PART 1: FUNÇÃO DE PROVISÃO PARA PRO TEST USER
-- ============================================

CREATE OR REPLACE FUNCTION public.provision_pro_test_user()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Buscar usuário pelo email
  SELECT id INTO _user_id FROM auth.users WHERE email = 'pro@test.com';
  
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User pro@test.com not found in auth.users - will be provisioned on signup';
    RETURN;
  END IF;
  
  -- Atualizar/criar profile com plano Pro
  INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status, current_plan_id)
  VALUES (
    _user_id,
    'pro@test.com',
    'Usuário Pro Teste',
    'active',
    'active',
    '00000000-0000-0000-0000-000000000002'  -- Plano Pro
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    subscription_status = 'active',
    account_status = 'active',
    current_plan_id = '00000000-0000-0000-0000-000000000002',
    updated_at = now();
  
  -- Garantir role user (não admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Provisioned pro@test.com with Pro plan';
END;
$$;

-- ============================================
-- PART 2: ATUALIZAR TRIGGER DE AUTO-PROVISÃO
-- ============================================
-- Inclui pro@test.com com plano Pro

CREATE OR REPLACE FUNCTION public.auto_provision_test_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _plan_id uuid;
  _full_name text;
BEGIN
  -- Determinar role e plano baseado no email
  _role := CASE
    WHEN NEW.email = 'admin@admin.com' THEN 'admin'::app_role
    WHEN NEW.email = 'pro@test.com' THEN 'user'::app_role
    WHEN NEW.email = 'user@test.com' THEN 'user'::app_role
    WHEN NEW.email = 'aluno@test.com' THEN 'aluno'::app_role
    WHEN NEW.email = 'gym@test.com' THEN 'academy_admin'::app_role
    WHEN NEW.email = 'pt@test.com' THEN 'personal_trainer'::app_role
    WHEN NEW.email = 'content@test.com' THEN 'content_creator'::app_role
    WHEN NEW.email LIKE '%@test.com' THEN 'user'::app_role
    ELSE NULL
  END;
  
  -- Determinar plano
  _plan_id := CASE
    WHEN NEW.email = 'pro@test.com' THEN '00000000-0000-0000-0000-000000000002'::uuid  -- PRO
    WHEN NEW.email = 'admin@admin.com' THEN NULL  -- Admin não precisa de plano
    ELSE '00000000-0000-0000-0000-000000000001'::uuid  -- FREE para todos os outros
  END;
  
  -- Determinar nome
  _full_name := CASE
    WHEN NEW.email = 'admin@admin.com' THEN 'Administrador'
    WHEN NEW.email = 'pro@test.com' THEN 'Usuário Pro Teste'
    WHEN NEW.email = 'user@test.com' THEN 'Usuário Free Teste'
    WHEN NEW.email = 'aluno@test.com' THEN 'Aluno Teste'
    WHEN NEW.email = 'gym@test.com' THEN 'Academia Teste'
    WHEN NEW.email = 'pt@test.com' THEN 'Personal Trainer Teste'
    WHEN NEW.email = 'content@test.com' THEN 'Criador de Conteúdo Teste'
    ELSE COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário Teste')
  END;
  
  -- Provisionar apenas se é um usuário de teste conhecido
  IF _role IS NOT NULL THEN
    -- Criar profile com plano
    INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status, current_plan_id)
    VALUES (NEW.id, NEW.email, _full_name, 'active', 'active', _plan_id)
    ON CONFLICT (id) DO UPDATE SET
      subscription_status = 'active',
      account_status = 'active',
      current_plan_id = COALESCE(EXCLUDED.current_plan_id, profiles.current_plan_id),
      updated_at = now();
    
    -- Atribuir role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Auto-provisioned test user: % with role: % and plan: %', NEW.email, _role, _plan_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_test_user_created ON auth.users;
CREATE TRIGGER on_test_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_test_user();

-- ============================================
-- PART 3: ATUALIZAR USER@TEST.COM PARA FREE
-- ============================================
-- Garantir que user@test.com tenha plano Free explicitamente

DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = 'user@test.com';
  
  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET current_plan_id = '00000000-0000-0000-0000-000000000001',
        updated_at = now()
    WHERE id = _user_id;
    
    RAISE NOTICE 'Updated user@test.com to Free plan';
  END IF;
END;
$$;

-- ============================================
-- PART 4: PROVISIONAR PRO@TEST.COM SE EXISTIR
-- ============================================

DO $$ BEGIN PERFORM public.provision_pro_test_user(); END; $$;

-- ============================================
-- DONE
-- ============================================
DO $$ BEGIN 
  RAISE NOTICE 'Test user pro migration completed';
  RAISE NOTICE 'pro@test.com will have Pro plan';
  RAISE NOTICE 'user@test.com will have Free plan';
END $$;
