-- =========================================================
-- PERSONAL TRAINER MODE - PHASE 1B: TABLES AND POLICIES
-- Uses enum values added in previous migration
-- =========================================================

-- =========================================================
-- 1. USER GROUPS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Policies for user_groups
DROP POLICY IF EXISTS "Admins full access to groups" ON public.user_groups;
CREATE POLICY "Admins full access to groups"
  ON public.user_groups
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Content creators can view groups they created" ON public.user_groups;
CREATE POLICY "Content creators can view groups they created"
  ON public.user_groups
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'content_creator') 
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Content creators can manage groups they created" ON public.user_groups;
CREATE POLICY "Content creators can manage groups they created"
  ON public.user_groups
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'content_creator') 
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'content_creator') 
    AND created_by = auth.uid()
  );

-- =========================================================
-- 2. USER GROUP MEMBERS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_group group_member_role DEFAULT 'student',
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for user_group_members
DROP POLICY IF EXISTS "Admins full access to group members" ON public.user_group_members;
CREATE POLICY "Admins full access to group members"
  ON public.user_group_members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Content creators can manage members of their groups" ON public.user_group_members;
CREATE POLICY "Content creators can manage members of their groups"
  ON public.user_group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_groups ug
      WHERE ug.id = group_id
      AND ug.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'content_creator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_groups ug
      WHERE ug.id = group_id
      AND ug.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'content_creator')
    )
  );

DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.user_group_members;
CREATE POLICY "Users can view their own group memberships"
  ON public.user_group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================
-- 3. ADD ASSIGNMENT COLUMNS TO CONTENT TABLES
-- =========================================================

-- Diets table
ALTER TABLE public.diets
  ADD COLUMN IF NOT EXISTS assigned_to_type content_assignment_type DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID;

-- Workouts table
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS assigned_to_type content_assignment_type DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID;

-- Challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS assigned_to_type content_assignment_type DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID;

-- Habits table
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS assigned_to_type content_assignment_type DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- =========================================================
-- 4. HELPER FUNCTIONS FOR PERSONAL TRAINER MODE
-- =========================================================

-- Check if personal trainer mode is enabled
CREATE OR REPLACE FUNCTION public.is_personal_trainer_mode_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'personal_trainer_mode_enabled'),
    false
  );
$$;

-- Check if user has content_creator role
CREATE OR REPLACE FUNCTION public.is_content_creator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'content_creator'
  );
$$;

-- Get user's groups (for content visibility)
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(group_id),
    ARRAY[]::UUID[]
  )
  FROM public.user_group_members
  WHERE user_id = _user_id;
$$;

-- Check if user can see content (considering assignment)
CREATE OR REPLACE FUNCTION public.can_user_see_content(
  _user_id UUID,
  _assigned_to_type content_assignment_type,
  _assigned_to_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Personal trainer mode disabled = everyone sees global content only
    NOT public.is_personal_trainer_mode_enabled() 
    AND (_assigned_to_type IS NULL OR _assigned_to_type = 'global')
    
    OR 
    
    -- Personal trainer mode enabled
    (
      public.is_personal_trainer_mode_enabled()
      AND (
        -- Global content visible to all
        _assigned_to_type IS NULL OR _assigned_to_type = 'global'
        -- Content assigned to this user
        OR (_assigned_to_type = 'user' AND _assigned_to_id = _user_id)
        -- Content assigned to a group the user belongs to
        OR (_assigned_to_type = 'group' AND _assigned_to_id = ANY(public.get_user_group_ids(_user_id)))
      )
    )
    
    OR
    
    -- Admins see everything
    public.has_role(_user_id, 'admin')
    
    OR
    
    -- Content creators see content they created
    public.is_content_creator(_user_id);
$$;

-- =========================================================
-- 5. CONTENT CREATOR PERMISSION SCOPES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.content_creator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_create_diets BOOLEAN DEFAULT true,
  can_create_workouts BOOLEAN DEFAULT true,
  can_create_challenges BOOLEAN DEFAULT true,
  can_create_habits BOOLEAN DEFAULT true,
  allowed_group_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.content_creator_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage content creator permissions
DROP POLICY IF EXISTS "Admins manage content creator permissions" ON public.content_creator_permissions;
CREATE POLICY "Admins manage content creator permissions"
  ON public.content_creator_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Content creators can view their own permissions
DROP POLICY IF EXISTS "Content creators view own permissions" ON public.content_creator_permissions;
CREATE POLICY "Content creators view own permissions"
  ON public.content_creator_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================
-- 6. UPDATE RLS POLICIES FOR CONTENT TABLES
-- =========================================================

-- Drop and recreate diets RLS for personal trainer mode
DROP POLICY IF EXISTS "Anyone reads active diets" ON public.diets;
DROP POLICY IF EXISTS "Users read accessible diets" ON public.diets;

CREATE POLICY "Users read accessible diets"
  ON public.diets
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.can_user_see_content(auth.uid(), assigned_to_type, assigned_to_id)
  );

DROP POLICY IF EXISTS "Content creators manage own diets" ON public.diets;
CREATE POLICY "Content creators manage own diets"
  ON public.diets
  FOR ALL
  TO authenticated
  USING (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  );

-- Drop and recreate workouts RLS for personal trainer mode
DROP POLICY IF EXISTS "Anyone reads active workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users read accessible workouts" ON public.workouts;

CREATE POLICY "Users read accessible workouts"
  ON public.workouts
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.can_user_see_content(auth.uid(), assigned_to_type, assigned_to_id)
  );

DROP POLICY IF EXISTS "Content creators manage own workouts" ON public.workouts;
CREATE POLICY "Content creators manage own workouts"
  ON public.workouts
  FOR ALL
  TO authenticated
  USING (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  );

-- Drop and recreate challenges RLS for personal trainer mode
DROP POLICY IF EXISTS "Anyone reads active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users read accessible challenges" ON public.challenges;

CREATE POLICY "Users read accessible challenges"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.can_user_see_content(auth.uid(), assigned_to_type, assigned_to_id)
  );

DROP POLICY IF EXISTS "Content creators manage own challenges" ON public.challenges;
CREATE POLICY "Content creators manage own challenges"
  ON public.challenges
  FOR ALL
  TO authenticated
  USING (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  );

-- Habits RLS
DROP POLICY IF EXISTS "Users read accessible habits" ON public.habits;
CREATE POLICY "Users read accessible habits"
  ON public.habits
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.can_user_see_content(auth.uid(), assigned_to_type, assigned_to_id)
  );

DROP POLICY IF EXISTS "Content creators manage own habits" ON public.habits;
CREATE POLICY "Content creators manage own habits"
  ON public.habits
  FOR ALL
  TO authenticated
  USING (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_content_creator(auth.uid())
    AND created_by = auth.uid()
  );

-- =========================================================
-- 7. INSERT DEFAULT FEATURE FLAG
-- =========================================================

INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'personal_trainer_mode_enabled',
  'Ativa o Modo Personal Trainer: conteúdo pode ser segmentado por usuário ou grupo, gerenciado por Admins e Criadores de Conteúdo',
  false,
  false,
  '["diets", "workouts", "challenges", "habits"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 8. INDEXES FOR PERFORMANCE
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_user_groups_created_by ON public.user_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_diets_assignment ON public.diets(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_workouts_assignment ON public.workouts(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_challenges_assignment ON public.challenges(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_habits_assignment ON public.habits(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_content_creator_permissions_user ON public.content_creator_permissions(user_id);

-- =========================================================
-- 9. GRANT EXECUTE PERMISSIONS
-- =========================================================

GRANT EXECUTE ON FUNCTION public.is_personal_trainer_mode_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_content_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_group_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_see_content(UUID, content_assignment_type, UUID) TO authenticated;
