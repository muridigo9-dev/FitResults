-- =========================================================
-- PERSONAL TRAINER / ACADEMIA MODE - ADVANCED FEATURES
-- Feature flags, academies, invites, anamnesis, feedback
-- Muscle groups, billing settings, and more
-- =========================================================

-- =========================================================
-- 1. NEW FEATURE FLAGS
-- =========================================================

-- Main personal mode flag
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'personal_mode_enabled',
  'Ativa o Modo Personal Trainer / Academia no sistema. Alunos só podem existir vinculados a um trainer ou academia.',
  false,
  false,
  '["auth", "content", "users"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Billing mode flag
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'personal_billing_mode',
  'Modo de cobrança: personal_pays (personal paga por pacote/alunos) ou student_pays (cada aluno paga sua assinatura)',
  false,
  false,
  '["billing", "stripe"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Custom content flag
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'personal_custom_content_enabled',
  'Permite conteúdos exclusivos personalizados por aluno ou grupo',
  true,
  false,
  '["content", "diets", "workouts", "challenges"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 2. NEW ROLES: personal_trainer, academy_admin
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'academy_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'academy_admin';
  END IF;
END$$;

-- =========================================================
-- 3. ACADEMIES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Settings
  max_trainers INTEGER DEFAULT 10,
  max_students INTEGER DEFAULT 100,
  
  -- Billing
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  billing_plan TEXT, -- 'starter', 'professional', 'enterprise'
  
  -- Contact
  email TEXT,
  phone TEXT,
  address TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

-- Academy-Trainer relationship
CREATE TABLE IF NOT EXISTS public.academy_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'trainer' CHECK (role IN ('trainer', 'manager', 'owner')),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(academy_id, trainer_id)
);

ALTER TABLE public.academy_trainers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Academy owners/managers can manage academy"
  ON public.academies
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM academy_trainers at 
      WHERE at.academy_id = id 
      AND at.trainer_id = auth.uid() 
      AND at.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Academy trainers can view their academy"
  ON public.academy_trainers
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Academy managers can manage trainers"
  ON public.academy_trainers
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM academy_trainers at2 
      WHERE at2.academy_id = academy_id 
      AND at2.trainer_id = auth.uid() 
      AND at2.role IN ('owner', 'manager')
    )
  );

-- =========================================================
-- 4. STUDENT INVITES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.student_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who sent the invite
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  
  -- Invite details
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Group assignment (optional)
  group_id UUID REFERENCES user_groups(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  
  -- When accepted
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  message TEXT, -- Personal message from trainer
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_student_invites_token ON public.student_invites(token);
CREATE INDEX idx_student_invites_email ON public.student_invites(email);
CREATE INDEX idx_student_invites_status ON public.student_invites(status);

-- Policies
CREATE POLICY "Trainers can manage their invites"
  ON public.student_invites
  FOR ALL TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (academy_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM academy_trainers at 
      WHERE at.academy_id = student_invites.academy_id 
      AND at.trainer_id = auth.uid()
    ))
  );

-- Function: Validate and accept invite
CREATE OR REPLACE FUNCTION public.accept_student_invite(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_result JSONB;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM student_invites
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  -- Create trainer-student relationship
  INSERT INTO trainer_students (trainer_id, student_id, status)
  VALUES (v_invite.invited_by, p_user_id, 'active')
  ON CONFLICT (trainer_id, student_id) DO UPDATE SET status = 'active';
  
  -- Add to group if specified
  IF v_invite.group_id IS NOT NULL THEN
    INSERT INTO user_group_members (group_id, user_id, role_in_group, added_by)
    VALUES (v_invite.group_id, p_user_id, 'student', v_invite.invited_by)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  -- Set user role to aluno
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'aluno')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update invite status
  UPDATE student_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_invite.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'trainer_id', v_invite.invited_by,
    'group_id', v_invite.group_id
  );
END;
$$;

-- =========================================================
-- 5. ANAMNESIS (Health Assessment)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Assessment info
  assessment_type TEXT DEFAULT 'initial' CHECK (assessment_type IN ('initial', 'followup', 'monthly', 'quarterly')),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Personal data
  birth_date DATE,
  occupation TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  
  -- Health history
  medical_conditions TEXT[], -- Array of conditions
  medications TEXT[],
  allergies TEXT[],
  injuries TEXT[],
  surgeries TEXT[],
  
  -- Lifestyle
  sleep_hours NUMERIC(3,1),
  sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  stress_level TEXT CHECK (stress_level IN ('low', 'moderate', 'high', 'very_high')),
  alcohol_frequency TEXT CHECK (alcohol_frequency IN ('never', 'rarely', 'weekly', 'daily')),
  smoking_status TEXT CHECK (smoking_status IN ('never', 'former', 'current')),
  
  -- Physical assessment
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  chest_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  thigh_cm NUMERIC(5,1),
  
  -- Fitness assessment
  resting_heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  flexibility_test TEXT,
  strength_test TEXT,
  endurance_test TEXT,
  
  -- Goals
  primary_goal TEXT,
  secondary_goals TEXT[],
  target_weight_kg NUMERIC(5,2),
  target_body_fat NUMERIC(4,1),
  
  -- Observations
  observations TEXT,
  recommendations TEXT,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_anamnesis_user ON public.anamnesis(user_id);
CREATE INDEX idx_anamnesis_date ON public.anamnesis(assessment_date DESC);

-- Policies
CREATE POLICY "Trainers can manage student anamnesis"
  ON public.anamnesis
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid() -- Students can view their own
  );

-- =========================================================
-- 6. STUDENT FEEDBACK
-- =========================================================

CREATE TABLE IF NOT EXISTS public.student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- What are they rating
  content_type TEXT NOT NULL CHECK (content_type IN ('diet', 'workout', 'challenge', 'exercise', 'assignment')),
  content_id UUID NOT NULL,
  assignment_id UUID REFERENCES content_assignments(id) ON DELETE SET NULL,
  
  -- Rating
  rating TEXT NOT NULL CHECK (rating IN ('like', 'dislike', 'neutral')),
  comment TEXT,
  
  -- Additional feedback
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, content_type, content_id)
);

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_student_feedback_content ON public.student_feedback(content_type, content_id);
CREATE INDEX idx_student_feedback_user ON public.student_feedback(user_id);

-- Policies
CREATE POLICY "Users manage their own feedback"
  ON public.student_feedback
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trainers view student feedback"
  ON public.student_feedback
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR user_id = auth.uid()
  );

-- =========================================================
-- 7. EXERCISE MUSCLE GROUPS
-- =========================================================

-- Muscle groups reference table
CREATE TABLE IF NOT EXISTS public.muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  category TEXT CHECK (category IN ('upper', 'lower', 'core', 'full')),
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Seed muscle groups
INSERT INTO public.muscle_groups (name, name_en, category, sort_order) VALUES
  ('Peito', 'Chest', 'upper', 1),
  ('Costas', 'Back', 'upper', 2),
  ('Ombros', 'Shoulders', 'upper', 3),
  ('Bíceps', 'Biceps', 'upper', 4),
  ('Tríceps', 'Triceps', 'upper', 5),
  ('Antebraço', 'Forearm', 'upper', 6),
  ('Quadríceps', 'Quadriceps', 'lower', 7),
  ('Posterior', 'Hamstrings', 'lower', 8),
  ('Glúteos', 'Glutes', 'lower', 9),
  ('Panturrilha', 'Calves', 'lower', 10),
  ('Abdômen', 'Abs', 'core', 11),
  ('Lombar', 'Lower Back', 'core', 12),
  ('Core', 'Core', 'core', 13),
  ('Corpo Inteiro', 'Full Body', 'full', 14)
ON CONFLICT (name) DO NOTHING;

-- Exercise-muscle relationship (many-to-many)
CREATE TABLE IF NOT EXISTS public.exercise_muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL, -- References exercises table
  muscle_group_id UUID NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true, -- Primary or secondary muscle
  UNIQUE(exercise_id, muscle_group_id)
);

CREATE INDEX idx_exercise_muscles ON public.exercise_muscle_groups(exercise_id);
CREATE INDEX idx_muscle_exercises ON public.exercise_muscle_groups(muscle_group_id);

-- =========================================================
-- 8. PERSONALIZED WORKOUT PARAMETERS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.student_exercise_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL,
  assignment_id UUID REFERENCES content_assignments(id) ON DELETE CASCADE,
  
  -- Custom parameters
  sets INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_seconds INTEGER,
  tempo TEXT, -- e.g., "3-1-2-0"
  load_kg NUMERIC(6,2),
  load_percent NUMERIC(4,1), -- Percentage of 1RM
  
  -- Instructions
  notes TEXT,
  video_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id, exercise_id, assignment_id)
);

ALTER TABLE public.student_exercise_params ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Trainers manage student params"
  ON public.student_exercise_params
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR student_id = auth.uid()
  );

-- =========================================================
-- 9. BILLING SETTINGS (per trainer/academy)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.personal_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (trainer or academy)
  owner_type TEXT NOT NULL CHECK (owner_type IN ('trainer', 'academy')),
  owner_id UUID NOT NULL,
  
  -- Billing config
  billing_mode TEXT DEFAULT 'personal_pays' CHECK (billing_mode IN ('personal_pays', 'student_pays')),
  
  -- Package settings (if personal_pays + package model)
  max_students INTEGER DEFAULT 10,
  student_package_tiers JSONB DEFAULT '[
    {"name": "Starter", "max_students": 10, "price_cents": 9900},
    {"name": "Pro", "max_students": 50, "price_cents": 29900},
    {"name": "Enterprise", "max_students": 200, "price_cents": 79900}
  ]'::jsonb,
  
  -- Per-student pricing (if personal_pays + per-student model)
  price_per_student_cents INTEGER DEFAULT 500,
  
  -- Student subscription (if student_pays)
  student_monthly_price_cents INTEGER DEFAULT 4900,
  student_plan_stripe_price_id TEXT,
  
  -- Current status
  current_students_count INTEGER DEFAULT 0,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(owner_type, owner_id)
);

ALTER TABLE public.personal_billing_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage their billing"
  ON public.personal_billing_settings
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- =========================================================
-- 10. HELPER FUNCTIONS
-- =========================================================

-- Check if user can add more students
CREATE OR REPLACE FUNCTION public.can_add_student(p_trainer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get billing settings
  SELECT * INTO v_settings
  FROM personal_billing_settings
  WHERE owner_id = p_trainer_id;
  
  -- If no settings, allow (no billing set up)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- If student pays mode, always allow
  IF v_settings.billing_mode = 'student_pays' THEN
    RETURN true;
  END IF;
  
  -- Check subscription is active
  IF v_settings.subscription_status NOT IN ('active', 'trialing') THEN
    RETURN false;
  END IF;
  
  -- Count current active students
  SELECT COUNT(*) INTO v_current_count
  FROM trainer_students
  WHERE trainer_id = p_trainer_id
  AND status = 'active';
  
  RETURN v_current_count < v_settings.max_students;
END;
$$;

-- Get trainer's student limit info
CREATE OR REPLACE FUNCTION public.get_trainer_student_limit(p_trainer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_current_count INTEGER;
BEGIN
  SELECT * INTO v_settings
  FROM personal_billing_settings
  WHERE owner_id = p_trainer_id;
  
  SELECT COUNT(*) INTO v_current_count
  FROM trainer_students
  WHERE trainer_id = p_trainer_id
  AND status = 'active';
  
  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'max_students', COALESCE(v_settings.max_students, 999),
    'billing_mode', COALESCE(v_settings.billing_mode, 'none'),
    'can_add_more', COALESCE(v_current_count < v_settings.max_students, true),
    'subscription_status', COALESCE(v_settings.subscription_status, 'none')
  );
END;
$$;

-- Get student's anamnesis history
CREATE OR REPLACE FUNCTION public.get_student_anamnesis_history(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  assessment_type TEXT,
  assessment_date DATE,
  weight_kg NUMERIC,
  body_fat_percentage NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.assessment_type,
    a.assessment_date,
    a.weight_kg,
    a.body_fat_percentage,
    a.created_at
  FROM anamnesis a
  WHERE a.user_id = p_student_id
  ORDER BY a.assessment_date DESC
  LIMIT p_limit;
$$;

-- Get content feedback summary
CREATE OR REPLACE FUNCTION public.get_content_feedback_summary(
  p_content_type TEXT,
  p_content_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'likes', COUNT(*) FILTER (WHERE rating = 'like'),
    'dislikes', COUNT(*) FILTER (WHERE rating = 'dislike'),
    'avg_difficulty', ROUND(AVG(difficulty_rating), 1),
    'recommend_pct', ROUND(100.0 * COUNT(*) FILTER (WHERE would_recommend) / NULLIF(COUNT(*), 0), 1)
  )
  FROM student_feedback
  WHERE content_type = p_content_type
  AND content_id = p_content_id;
$$;

-- =========================================================
-- 11. EXTENDED trainer_students for better tracking
-- =========================================================

ALTER TABLE public.trainer_students 
  ADD COLUMN IF NOT EXISTS invite_id UUID REFERENCES student_invites(id),
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id),
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active';

-- =========================================================
-- 12. INDEXES FOR PERFORMANCE
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_academies_owner ON public.academies(owner_id);
CREATE INDEX IF NOT EXISTS idx_academy_trainers_academy ON public.academy_trainers(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_trainers_trainer ON public.academy_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_anamnesis_created_by ON public.anamnesis(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.student_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_billing_owner ON public.personal_billing_settings(owner_id);

-- =========================================================
-- 13. GRANT PERMISSIONS
-- =========================================================

GRANT EXECUTE ON FUNCTION public.accept_student_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_student_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_anamnesis_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_feedback_summary(TEXT, UUID) TO authenticated;

GRANT SELECT ON public.muscle_groups TO authenticated;
