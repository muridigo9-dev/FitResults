-- =====================================================
-- Migration: Multi-Tenant Base Tables
-- Description: Criar estrutura base para modo academia/personal
--              SEM quebrar o sistema existente (feature flag controlled)
-- =====================================================

-- =====================================================
-- 1. ENUM UPDATES: Adicionar novos roles
-- =====================================================

-- Adicionar role de nutricionista
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nutritionist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'nutritionist';
  END IF;
END$$;

-- Adicionar role de academy_admin (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'academy_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'academy_admin';
  END IF;
END$$;

-- Adicionar role de multi_academy_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'multi_academy_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'multi_academy_admin';
  END IF;
END$$;

-- Adicionar role de student (moderno, deprecar 'aluno' futuramente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'student';
  END IF;
END$$;

-- =====================================================
-- 2. TABELA: academies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  
  -- Contato
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'BR',
  
  -- Settings gerais
  settings JSONB DEFAULT '{}'::JSONB,
  
  -- Branding (cores, logos personalizados)
  branding JSONB DEFAULT '{}'::JSONB,
  
  -- Billing (referência ao Stripe)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  
  -- Plan limits (definidos pelo Super Admin)
  plan_type TEXT DEFAULT 'starter' CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'custom')),
  max_trainers INT DEFAULT 1,
  max_nutritionists INT DEFAULT 0,
  max_students INT DEFAULT 50,
  max_content_creators INT DEFAULT 0,
  allow_multi_academy_professionals BOOLEAN DEFAULT false,
  
  -- Feature flags específicas da academia (sobrescreve global)
  features JSONB DEFAULT '{}'::JSONB,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'pending', 'trial')),
  
  -- Trial
  trial_ends_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_academies_slug ON public.academies(slug);
CREATE INDEX IF NOT EXISTS idx_academies_status ON public.academies(status);
CREATE INDEX IF NOT EXISTS idx_academies_stripe_customer ON public.academies(stripe_customer_id);

-- Comentários
COMMENT ON TABLE public.academies IS 'Academias/Organizações no modo multi-tenant';
COMMENT ON COLUMN public.academies.plan_type IS 'Tipo de plano contratado pela academia';
COMMENT ON COLUMN public.academies.allow_multi_academy_professionals IS 'Se permite que trainers/nutricionistas atendam múltiplas academias';

-- =====================================================
-- 3. TABELA: academy_members
-- =====================================================

CREATE TABLE IF NOT EXISTS public.academy_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role dentro da academia
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'trainer', 'nutritionist', 'student', 'content_creator')),
  
  -- Permissions (JSONB para flexibilidade, usado por roles admin/owner)
  permissions JSONB DEFAULT '[]'::JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_invite')),
  
  -- Metadata
  notes TEXT,
  custom_data JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: um usuário só pode ter uma role por academia
  UNIQUE(academy_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_academy_members_academy ON public.academy_members(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_user ON public.academy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_role ON public.academy_members(role);
CREATE INDEX IF NOT EXISTS idx_academy_members_status ON public.academy_members(status);
CREATE INDEX IF NOT EXISTS idx_academy_members_academy_role ON public.academy_members(academy_id, role) WHERE status = 'active';

COMMENT ON TABLE public.academy_members IS 'Membros de uma academia (many-to-many com roles)';

-- =====================================================
-- 4. TABELA: professional_academy_links
-- =====================================================

CREATE TABLE IF NOT EXISTS public.professional_academy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  
  professional_type TEXT NOT NULL CHECK (professional_type IN ('trainer', 'nutritionist', 'content_creator')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'rejected')),
  
  -- Permissions/Settings específicos por academia
  can_create_content BOOLEAN DEFAULT true,
  can_assign_content BOOLEAN DEFAULT true,
  can_view_all_students BOOLEAN DEFAULT false, -- Se false, vê apenas seus alunos atribuídos
  can_manage_students BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  settings JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  UNIQUE(professional_id, academy_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prof_academy_links_prof ON public.professional_academy_links(professional_id);
CREATE INDEX IF NOT EXISTS idx_prof_academy_links_academy ON public.professional_academy_links(academy_id);
CREATE INDEX IF NOT EXISTS idx_prof_academy_links_type ON public.professional_academy_links(professional_type);
CREATE INDEX IF NOT EXISTS idx_prof_academy_links_status ON public.professional_academy_links(status);

COMMENT ON TABLE public.professional_academy_links IS 'Vínculo de profissionais com múltiplas academias';

-- =====================================================
-- 5. TABELA: invites
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Context
  invite_type TEXT NOT NULL CHECK (invite_type IN ('academy_trainer', 'academy_nutritionist', 'trainer_student', 'academy_student', 'academy_content_creator')),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Role to be assigned
  target_role TEXT NOT NULL CHECK (target_role IN ('personal_trainer', 'nutritionist', 'student', 'academy_admin', 'content_creator')),
  
  -- Token (used in URL)
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  
  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_academy ON public.invites(academy_id);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON public.invites(expires_at) WHERE status = 'pending';

COMMENT ON TABLE public.invites IS 'Convites para entrar em academias ou se tornar aluno de um trainer';

-- =====================================================
-- 6. ATUALIZAR TABELAS EXISTENTES (colunas opcionais)
-- =====================================================

-- profiles: adicionar primary_academy_id (opcional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_primary_academy ON public.profiles(primary_academy_id) WHERE primary_academy_id IS NOT NULL;

-- trainer_students: adicionar academy_id (contexto)
ALTER TABLE public.trainer_students
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trainer_students_academy ON public.trainer_students(academy_id) WHERE academy_id IS NOT NULL;

-- content_assignments: adicionar academy_id
ALTER TABLE public.content_assignments
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_assignments_academy ON public.content_assignments(academy_id) WHERE academy_id IS NOT NULL;

-- diets: adicionar academy_id, created_by, visibility
ALTER TABLE public.diets
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'academy', 'private'));

CREATE INDEX IF NOT EXISTS idx_diets_academy ON public.diets(academy_id) WHERE academy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diets_created_by ON public.diets(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diets_visibility ON public.diets(visibility);

-- workouts: adicionar academy_id, created_by, visibility
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'academy', 'private'));

CREATE INDEX IF NOT EXISTS idx_workouts_academy ON public.workouts(academy_id) WHERE academy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_created_by ON public.workouts(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_visibility ON public.workouts(visibility);

-- challenges: adicionar academy_id, created_by, visibility
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'academy', 'private'));

CREATE INDEX IF NOT EXISTS idx_challenges_academy ON public.challenges(academy_id) WHERE academy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON public.challenges(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_visibility ON public.challenges(visibility);

-- habits: adicionar academy_id, visibility (created_by já existe)
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'academy', 'private'));

CREATE INDEX IF NOT EXISTS idx_habits_academy ON public.habits(academy_id) WHERE academy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habits_visibility ON public.habits(visibility);

-- =====================================================
-- 7. TRIGGERS: updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academy_members_updated_at
  BEFORE UPDATE ON public.academy_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_academy_links_updated_at
  BEFORE UPDATE ON public.professional_academy_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invites_updated_at
  BEFORE UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. FEATURE FLAG: multi_tenant_mode_enabled
-- =====================================================

INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'multi_tenant_mode_enabled',
  'Ativa o modo multi-tenant (academias isoladas). Quando desativado, sistema opera em modo SaaS padrão.',
  false, -- DEFAULT: OFF (modo SaaS)
  false,
  '["auth", "content", "users", "billing", "rls"]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  affects = EXCLUDED.affects;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Permitir leitura para roles autenticados (RLS controlará acesso real)
GRANT SELECT ON public.academies TO authenticated;
GRANT SELECT ON public.academy_members TO authenticated;
GRANT SELECT ON public.professional_academy_links TO authenticated;
GRANT SELECT ON public.invites TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

COMMENT ON SCHEMA public IS 'Multi-tenant base tables created. Feature flag OFF by default (SaaS mode). Enable multi_tenant_mode_enabled to activate academy isolation.';
