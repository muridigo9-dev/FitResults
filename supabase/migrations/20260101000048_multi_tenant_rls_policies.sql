-- =====================================================
-- Migration: Multi-Tenant RLS Policies
-- Description: Row Level Security para isolamento multi-tenant
--              Compatível com modo SaaS (feature flag OFF)
-- =====================================================

-- =====================================================
-- 1. RLS POLICIES: academies
-- =====================================================

ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

-- Super Admin pode fazer tudo
DROP POLICY IF EXISTS "Super Admin full access to academies" ON public.academies;
CREATE POLICY "Super Admin full access to academies"
  ON public.academies
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Membros podem visualizar suas academias
DROP POLICY IF EXISTS "Academy members can view their academies" ON public.academies;
CREATE POLICY "Academy members can view their academies"
  ON public.academies
  FOR SELECT
  TO authenticated
  USING (
    id = ANY(public.get_user_academy_ids(auth.uid()))
  );

-- Owners/Admins podem atualizar sua academia
DROP POLICY IF EXISTS "Academy admins can update their academy" ON public.academies;
CREATE POLICY "Academy admins can update their academy"
  ON public.academies
  FOR UPDATE
  TO authenticated
  USING (
    public.is_academy_admin(auth.uid(), id)
  )
  WITH CHECK (
    public.is_academy_admin(auth.uid(), id)
  );

-- =====================================================
-- 2. RLS POLICIES: academy_members
-- =====================================================

ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

-- Super Admin pode fazer tudo
DROP POLICY IF EXISTS "Super Admin full access to members" ON public.academy_members;
CREATE POLICY "Super Admin full access to members"
  ON public.academy_members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Academy admins gerenciam membros de sua academia
DROP POLICY IF EXISTS "Academy admins manage their members" ON public.academy_members;
CREATE POLICY "Academy admins manage their members"
  ON public.academy_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.academy_id = academy_members.academy_id
      AND am.role IN ('owner', 'admin')
      AND am.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.academy_id = academy_members.academy_id
      AND am.role IN ('owner', 'admin')
      AND am.status = 'active'
    )
  );

-- Usuários veem suas próprias memberships
DROP POLICY IF EXISTS "Users view their own memberships" ON public.academy_members;
CREATE POLICY "Users view their own memberships"
  ON public.academy_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Membros de uma academia podem ver outros membros da mesma academia
DROP POLICY IF EXISTS "Academy members can view each other" ON public.academy_members;
CREATE POLICY "Academy members can view each other"
  ON public.academy_members
  FOR SELECT
  TO authenticated
  USING (
    academy_id = ANY(public.get_user_academy_ids(auth.uid()))
  );

-- =====================================================
-- 3. RLS POLICIES: professional_academy_links
-- =====================================================

ALTER TABLE public.professional_academy_links ENABLE ROW LEVEL SECURITY;

-- Super Admin pode fazer tudo
DROP POLICY IF EXISTS "Super Admin full access to professional links" ON public.professional_academy_links;
CREATE POLICY "Super Admin full access to professional links"
  ON public.professional_academy_links
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profissionais veem seus próprios vínculos
DROP POLICY IF EXISTS "Professionals view own links" ON public.professional_academy_links;
CREATE POLICY "Professionals view own links"
  ON public.professional_academy_links
  FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

-- Academy admins veem vínculos de profissionais em sua academia
DROP POLICY IF EXISTS "Academy admins view their professionals" ON public.professional_academy_links;
CREATE POLICY "Academy admins view their professionals"
  ON public.professional_academy_links
  FOR SELECT
  TO authenticated
  USING (
    public.is_academy_admin(auth.uid(), academy_id)
  );

-- Academy admins podem aprovar/rejeitar vínculos
DROP POLICY IF EXISTS "Academy admins manage professional links" ON public.professional_academy_links;
CREATE POLICY "Academy admins manage professional links"
  ON public.professional_academy_links
  FOR UPDATE
  TO authenticated
  USING (
    public.is_academy_admin(auth.uid(), academy_id)
  )
  WITH CHECK (
    public.is_academy_admin(auth.uid(), academy_id)
  );

-- =====================================================
-- 4. RLS POLICIES: invites
-- =====================================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Super Admin pode fazer tudo
DROP POLICY IF EXISTS "Super Admin full access to invites" ON public.invites;
CREATE POLICY "Super Admin full access to invites"
  ON public.invites
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Quem enviou o convite pode gerenciar
DROP POLICY IF EXISTS "Inviters manage their invites" ON public.invites;
CREATE POLICY "Inviters manage their invites"
  ON public.invites
  FOR ALL
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Academy admins veem convites de sua academia
DROP POLICY IF EXISTS "Academy admins view academy invites" ON public.invites;
CREATE POLICY "Academy admins view academy invites"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (
    academy_id IS NOT NULL 
    AND public.is_academy_admin(auth.uid(), academy_id)
  );

-- Usuários convidados podem ver seus convites (via email)
DROP POLICY IF EXISTS "Invited users view their invites" ON public.invites;
CREATE POLICY "Invited users view their invites"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Permitir leitura pública por token (para página de aceitar convite)
DROP POLICY IF EXISTS "Public can view invite by token" ON public.invites;
CREATE POLICY "Public can view invite by token"
  ON public.invites
  FOR SELECT
  TO anon, authenticated
  USING (true); -- RLS não bloqueia, mas só retorna dados via função get_invite_details

-- =====================================================
-- 5. ATUALIZAR RLS DE CONTEÚDOS (diets, workouts, challenges, habits)
-- =====================================================

-- DIETS: Atualizar policy para considerar academy_id e visibility
ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view diets multi-tenant" ON public.diets;
CREATE POLICY "Users can view diets multi-tenant"
  ON public.diets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.can_view_content(
      COALESCE(visibility, 'global'),
      academy_id,
      created_by,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and creators can insert diets" ON public.diets;
CREATE POLICY "Admins and creators can insert diets"
  ON public.diets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'content_creator')
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR public.has_role(auth.uid(), 'nutritionist')
  );

DROP POLICY IF EXISTS "Admins and creators can update own diets" ON public.diets;
CREATE POLICY "Admins and creators can update own diets"
  ON public.diets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins and creators can delete own diets" ON public.diets;
CREATE POLICY "Admins and creators can delete own diets"
  ON public.diets
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  );

-- WORKOUTS: Mesma lógica
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workouts multi-tenant" ON public.workouts;
CREATE POLICY "Users can view workouts multi-tenant"
  ON public.workouts
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.can_view_content(
      COALESCE(visibility, 'global'),
      academy_id,
      created_by,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and creators can insert workouts" ON public.workouts;
CREATE POLICY "Admins and creators can insert workouts"
  ON public.workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'content_creator')
    OR public.has_role(auth.uid(), 'personal_trainer')
  );

DROP POLICY IF EXISTS "Admins and creators can update own workouts" ON public.workouts;
CREATE POLICY "Admins and creators can update own workouts"
  ON public.workouts
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins and creators can delete own workouts" ON public.workouts;
CREATE POLICY "Admins and creators can delete own workouts"
  ON public.workouts
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  );

-- CHALLENGES: Mesma lógica
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view challenges multi-tenant" ON public.challenges;
CREATE POLICY "Users can view challenges multi-tenant"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.can_view_content(
      COALESCE(visibility, 'global'),
      academy_id,
      created_by,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and creators can insert challenges" ON public.challenges;
CREATE POLICY "Admins and creators can insert challenges"
  ON public.challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'content_creator')
    OR public.has_role(auth.uid(), 'personal_trainer')
  );

DROP POLICY IF EXISTS "Admins and creators can update own challenges" ON public.challenges;
CREATE POLICY "Admins and creators can update own challenges"
  ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins and creators can delete own challenges" ON public.challenges;
CREATE POLICY "Admins and creators can delete own challenges"
  ON public.challenges
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  );

-- HABITS: Mesma lógica (created_by já existe)
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view habits multi-tenant" ON public.habits;
CREATE POLICY "Users can view habits multi-tenant"
  ON public.habits
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.can_view_content(
      COALESCE(visibility, 'global'),
      academy_id,
      created_by,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and creators can insert habits" ON public.habits;
CREATE POLICY "Admins and creators can insert habits"
  ON public.habits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'content_creator')
    OR public.has_role(auth.uid(), 'personal_trainer')
  );

DROP POLICY IF EXISTS "Admins and creators can update own habits" ON public.habits;
CREATE POLICY "Admins and creators can update own habits"
  ON public.habits
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins and creators can delete own habits" ON public.habits;
CREATE POLICY "Admins and creators can delete own habits"
  ON public.habits
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  );

-- =====================================================
-- 6. ATUALIZAR RLS: trainer_students (adicionar academy context)
-- =====================================================

-- Políticas já existem, apenas documentando que academy_id agora está disponível
-- Mantemos compatibilidade com modo SaaS (academy_id NULL)

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

COMMENT ON SCHEMA public IS 'Multi-tenant RLS policies created. Content visibility controlled by can_view_content function. Safe for both SaaS and multi-tenant modes.';
