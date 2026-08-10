-- =========================================================
-- PERSONAL TRAINER MODE - COMPLETE IMPLEMENTATION
-- Phase 2: Trainer-Student Relationship (roles added in 27.9)
-- Phase 3: Time-based Content Assignments with History
-- Phase 4: Student Progress Views
-- Phase 5: Community Mode + Ranking
-- =========================================================

-- =========================================================
-- PHASE 2: TRAINER-STUDENT RELATIONSHIP
-- (Roles 'personal_trainer' and 'aluno' already added in migration 27.9)
-- =========================================================

-- Trainer-Student Relationship Table
CREATE TABLE IF NOT EXISTS public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainer_id, student_id)
);

-- Enable RLS
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

-- Policies for trainer_students
CREATE POLICY "Admins full access to trainer_students"
  ON public.trainer_students
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers manage their own students"
  ON public.trainer_students
  FOR ALL
  TO authenticated
  USING (
    trainer_id = auth.uid()
    AND (public.has_role(auth.uid(), 'personal_trainer') OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    trainer_id = auth.uid()
    AND (public.has_role(auth.uid(), 'personal_trainer') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Students view their trainer relationship"
  ON public.trainer_students
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Helper function: Check if user is personal trainer
CREATE OR REPLACE FUNCTION public.is_personal_trainer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'personal_trainer'
  );
$$;

-- Helper function: Get trainer's student IDs
CREATE OR REPLACE FUNCTION public.get_trainer_student_ids(_trainer_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(student_id),
    ARRAY[]::UUID[]
  )
  FROM public.trainer_students
  WHERE trainer_id = _trainer_id
  AND status = 'active';
$$;

-- Helper function: Get student's trainer ID
CREATE OR REPLACE FUNCTION public.get_student_trainer_id(_student_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trainer_id
  FROM public.trainer_students
  WHERE student_id = _student_id
  AND status = 'active'
  LIMIT 1;
$$;

-- =========================================================
-- PHASE 3: TIME-BASED CONTENT ASSIGNMENTS WITH HISTORY
-- =========================================================

-- Assignment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
  END IF;
END$$;

-- Content type enum for assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('diet', 'workout', 'challenge', 'habit');
  END IF;
END$$;

-- Content Assignments Table (with time periods)
CREATE TABLE IF NOT EXISTS public.content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What content is being assigned
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  
  -- Who is it assigned to
  assigned_to_type content_assignment_type NOT NULL DEFAULT 'user',
  assigned_to_id UUID NOT NULL, -- user_id or group_id
  
  -- Who assigned it
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Time period
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status and metadata
  status assignment_status NOT NULL DEFAULT 'active',
  title TEXT, -- Custom title for this assignment period
  notes TEXT, -- Instructions for the student
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for content_assignments
CREATE POLICY "Admins full access to assignments"
  ON public.content_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers manage assignments for their students"
  ON public.content_assignments
  FOR ALL
  TO authenticated
  USING (
    assigned_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'personal_trainer') 
      OR public.has_role(auth.uid(), 'content_creator')
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    assigned_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'personal_trainer') 
      OR public.has_role(auth.uid(), 'content_creator')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users view their own assignments"
  ON public.content_assignments
  FOR SELECT
  TO authenticated
  USING (
    (assigned_to_type = 'user' AND assigned_to_id = auth.uid())
    OR (assigned_to_type = 'group' AND assigned_to_id = ANY(public.get_user_group_ids(auth.uid())))
  );

-- Helper function: Get user's active assignments
CREATE OR REPLACE FUNCTION public.get_user_active_assignments(_user_id UUID)
RETURNS TABLE (
  id UUID,
  content_type content_type,
  content_id UUID,
  title TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  status assignment_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ca.id,
    ca.content_type,
    ca.content_id,
    ca.title,
    ca.notes,
    ca.start_date,
    ca.end_date,
    ca.status
  FROM public.content_assignments ca
  WHERE 
    ca.status IN ('active', 'scheduled')
    AND (
      (ca.assigned_to_type = 'user' AND ca.assigned_to_id = _user_id)
      OR (ca.assigned_to_type = 'group' AND ca.assigned_to_id = ANY(public.get_user_group_ids(_user_id)))
    )
  ORDER BY ca.start_date DESC;
$$;

-- Helper function: Get user's assignment history
CREATE OR REPLACE FUNCTION public.get_user_assignment_history(
  _user_id UUID,
  _content_type content_type DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type content_type,
  content_id UUID,
  title TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  status assignment_status,
  period_label TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ca.id,
    ca.content_type,
    ca.content_id,
    ca.title,
    ca.notes,
    ca.start_date,
    ca.end_date,
    ca.status,
    TO_CHAR(ca.start_date, 'TMMonth YYYY') AS period_label
  FROM public.content_assignments ca
  WHERE 
    (
      (ca.assigned_to_type = 'user' AND ca.assigned_to_id = _user_id)
      OR (ca.assigned_to_type = 'group' AND ca.assigned_to_id = ANY(public.get_user_group_ids(_user_id)))
    )
    AND (_content_type IS NULL OR ca.content_type = _content_type)
  ORDER BY ca.start_date DESC;
$$;

-- =========================================================
-- PHASE 4: STUDENT PROGRESS VIEWS FOR TRAINERS
-- =========================================================

-- View: Trainer's student summary
CREATE OR REPLACE VIEW public.trainer_student_summary AS
SELECT 
  ts.trainer_id,
  ts.student_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url AS student_avatar,
  ts.status,
  ts.started_at,
  
  -- Streak and XP
  COALESCE(ux.current_streak, 0) AS current_streak,
  COALESCE(ux.longest_streak, 0) AS longest_streak,
  COALESCE(ux.total_xp, 0) AS total_xp,
  COALESCE(lv.level_number, 1) AS level,
  ux.last_checkin_date,
  
  -- Recent activity (last 7 days)
  (
    SELECT COUNT(*) FROM daily_checkins dc 
    WHERE dc.user_id = ts.student_id 
    AND dc.date >= CURRENT_DATE - INTERVAL '7 days'
  ) AS checkins_last_7_days,
  
  -- Active assignments count
  (
    SELECT COUNT(*) FROM content_assignments ca 
    WHERE (
      (ca.assigned_to_type = 'user' AND ca.assigned_to_id = ts.student_id)
      OR (ca.assigned_to_type = 'group' AND ca.assigned_to_id = ANY(public.get_user_group_ids(ts.student_id)))
    )
    AND ca.status = 'active'
  ) AS active_assignments
  
FROM public.trainer_students ts
JOIN public.profiles p ON p.id = ts.student_id
LEFT JOIN public.user_xp ux ON ux.user_id = ts.student_id
LEFT JOIN public.levels lv ON lv.id = ux.current_level_id
WHERE ts.status = 'active';

-- View: Student detailed progress
CREATE OR REPLACE VIEW public.student_detailed_progress AS
SELECT 
  dc.user_id,
  dc.date,
  
  -- Checkin data
  dc.mood,
  dc.notes AS mood_notes,
  dc.weight,
  dc.water_current AS water_ml,
  dc.water_goal AS water_goal_ml,
  
  -- Completion rates
  CASE WHEN dc.water_goal > 0 
    THEN ROUND((dc.water_current::NUMERIC / dc.water_goal) * 100, 1)
    ELSE 0 
  END AS water_completion_pct,
  
  -- Related data
  (SELECT COUNT(*) FROM habit_logs hl WHERE hl.user_id = dc.user_id AND hl.date = dc.date) AS habits_completed,
  (SELECT COUNT(*) FROM checkin_workouts cw WHERE cw.checkin_id = dc.id AND cw.completed = true) AS workouts_completed,
  (SELECT COUNT(*) FROM checkin_meals cm WHERE cm.checkin_id = dc.id) AS meals_logged
  
FROM public.daily_checkins dc
ORDER BY dc.date DESC;

-- Function: Get complete student progress for a trainer
CREATE OR REPLACE FUNCTION public.get_student_progress(
  _trainer_id UUID,
  _student_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  mood TEXT,
  weight NUMERIC,
  water_ml INTEGER,
  water_goal_ml INTEGER,
  water_completion_pct NUMERIC,
  habits_completed BIGINT,
  workouts_completed BIGINT,
  meals_logged BIGINT,
  checkin_exists BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify trainer has access to this student
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_students ts
    WHERE ts.trainer_id = _trainer_id
    AND ts.student_id = _student_id
    AND ts.status = 'active'
  ) AND NOT public.has_role(_trainer_id, 'admin') THEN
    RAISE EXCEPTION 'Access denied: not authorized to view this student';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.date,
    dc.mood,
    dc.weight,
    dc.water_current AS water_ml,
    dc.water_goal AS water_goal_ml,
    CASE WHEN dc.water_goal > 0 
      THEN ROUND((dc.water_current::NUMERIC / dc.water_goal) * 100, 1)
      ELSE 0 
    END,
    COALESCE((SELECT COUNT(*) FROM habit_logs hl WHERE hl.user_id = _student_id AND hl.date = d.date), 0),
    COALESCE((SELECT COUNT(*) FROM checkin_workouts cw JOIN daily_checkins dc2 ON dc2.id = cw.checkin_id WHERE dc2.user_id = _student_id AND dc2.date = d.date AND cw.completed = true), 0),
    COALESCE((SELECT COUNT(*) FROM checkin_meals cm JOIN daily_checkins dc2 ON dc2.id = cm.checkin_id WHERE dc2.user_id = _student_id AND dc2.date = d.date), 0),
    dc.id IS NOT NULL
  FROM generate_series(_start_date, _end_date, INTERVAL '1 day') AS d(date)
  LEFT JOIN daily_checkins dc ON dc.user_id = _student_id AND dc.date = d.date::DATE
  ORDER BY d.date DESC;
END;
$$;

-- =========================================================
-- PHASE 5: COMMUNITY MODE + RANKING
-- =========================================================

-- Add community mode feature flag
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'personal_community_mode',
  'Ativa o Modo Comunidade: ranking entre alunos, competição saudável e gamificação avançada',
  false,
  false,
  '["gamification", "ranking"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Community Ranking Table (cached for performance)
CREATE TABLE IF NOT EXISTS public.community_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope (trainer's community or global)
  trainer_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = global ranking
  
  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,
  period_end DATE,
  
  -- Ranking data (JSONB for flexibility)
  rankings JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_rankings ENABLE ROW LEVEL SECURITY;

-- Policies for community_rankings
CREATE POLICY "Everyone can view rankings"
  ON public.community_rankings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only system can manage rankings"
  ON public.community_rankings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function: Calculate ranking points for a user in a period
CREATE OR REPLACE FUNCTION public.calculate_user_ranking_points(
  _user_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      -- Check-ins: 10 points each
      (SELECT COUNT(*) * 10 FROM daily_checkins dc WHERE dc.user_id = _user_id AND dc.date BETWEEN _start_date AND _end_date)
      
      -- Workouts completed: 25 points each (from checkin_workouts)
      + (SELECT COUNT(*) * 25 FROM checkin_workouts cw 
         JOIN daily_checkins dc ON dc.id = cw.checkin_id 
         WHERE dc.user_id = _user_id AND dc.date BETWEEN _start_date AND _end_date AND cw.completed = true)
      
      -- Diets followed: 15 points each
      + (SELECT COUNT(*) * 15 FROM user_diets ud WHERE ud.user_id = _user_id AND DATE(ud.created_at) BETWEEN _start_date AND _end_date)
      
      -- Habits completed: 5 points each
      + (SELECT COUNT(*) * 5 FROM habit_logs hl WHERE hl.user_id = _user_id AND hl.date BETWEEN _start_date AND _end_date)
      
      -- Challenge days completed: 20 points each
      + (SELECT COUNT(*) * 20 FROM user_challenge_progress ucp WHERE ucp.user_id = _user_id AND DATE(ucp.completed_at) BETWEEN _start_date AND _end_date)
      
      -- Water goal met: 8 points each day
      + (SELECT COUNT(*) * 8 FROM daily_checkins dc WHERE dc.user_id = _user_id AND dc.date BETWEEN _start_date AND _end_date AND dc.water_current >= dc.water_goal AND dc.water_goal > 0)
    ),
    0
  )::INTEGER;
$$;

-- Function: Get trainer's community ranking
CREATE OR REPLACE FUNCTION public.get_trainer_ranking(
  _trainer_id UUID,
  _period_type TEXT DEFAULT 'weekly'
)
RETURNS TABLE (
  rank_position INTEGER,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER,
  checkins INTEGER,
  workouts INTEGER,
  habits INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_date DATE;
  _end_date DATE := CURRENT_DATE;
BEGIN
  -- Calculate period start
  _start_date := CASE _period_type
    WHEN 'weekly' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'monthly' THEN CURRENT_DATE - INTERVAL '30 days'
    ELSE '1970-01-01'::DATE
  END;
  
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) DESC)::INTEGER,
    ts.student_id,
    p.full_name,
    p.avatar_url,
    public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date),
    (SELECT COUNT(*)::INTEGER FROM daily_checkins dc WHERE dc.user_id = ts.student_id AND dc.date BETWEEN _start_date AND _end_date),
    (SELECT COUNT(*)::INTEGER FROM checkin_workouts cw JOIN daily_checkins dc ON dc.id = cw.checkin_id WHERE dc.user_id = ts.student_id AND dc.date BETWEEN _start_date AND _end_date AND cw.completed = true),
    (SELECT COUNT(*)::INTEGER FROM habit_logs hl WHERE hl.user_id = ts.student_id AND hl.date BETWEEN _start_date AND _end_date)
  FROM public.trainer_students ts
  JOIN public.profiles p ON p.id = ts.student_id
  WHERE ts.trainer_id = _trainer_id
  AND ts.status = 'active'
  ORDER BY public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) DESC
  LIMIT 100;
END;
$$;

-- Function: Get user's ranking position
CREATE OR REPLACE FUNCTION public.get_user_ranking_position(
  _user_id UUID,
  _trainer_id UUID DEFAULT NULL,
  _period_type TEXT DEFAULT 'weekly'
)
RETURNS TABLE (
  rank_position INTEGER,
  total_participants INTEGER,
  points INTEGER,
  points_to_next INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_date DATE;
  _end_date DATE := CURRENT_DATE;
  _user_points INTEGER;
  _user_position INTEGER;
  _total INTEGER;
  _next_points INTEGER;
BEGIN
  -- Calculate period start
  _start_date := CASE _period_type
    WHEN 'weekly' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'monthly' THEN CURRENT_DATE - INTERVAL '30 days'
    ELSE '1970-01-01'::DATE
  END;
  
  -- Get user's points
  _user_points := public.calculate_user_ranking_points(_user_id, _start_date, _end_date);
  
  IF _trainer_id IS NOT NULL THEN
    -- Trainer's community ranking
    SELECT COUNT(*) INTO _total
    FROM public.trainer_students ts
    WHERE ts.trainer_id = _trainer_id AND ts.status = 'active';
    
    SELECT COUNT(*) + 1 INTO _user_position
    FROM public.trainer_students ts
    WHERE ts.trainer_id = _trainer_id
    AND ts.status = 'active'
    AND public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) > _user_points;
    
    -- Points needed for next position
    SELECT public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) INTO _next_points
    FROM public.trainer_students ts
    WHERE ts.trainer_id = _trainer_id
    AND ts.status = 'active'
    AND public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) > _user_points
    ORDER BY public.calculate_user_ranking_points(ts.student_id, _start_date, _end_date) ASC
    LIMIT 1;
  ELSE
    -- Global ranking (all users)
    SELECT COUNT(*) INTO _total FROM public.profiles;
    
    SELECT COUNT(*) + 1 INTO _user_position
    FROM public.profiles p
    WHERE public.calculate_user_ranking_points(p.id, _start_date, _end_date) > _user_points;
    
    SELECT public.calculate_user_ranking_points(p.id, _start_date, _end_date) INTO _next_points
    FROM public.profiles p
    WHERE public.calculate_user_ranking_points(p.id, _start_date, _end_date) > _user_points
    ORDER BY public.calculate_user_ranking_points(p.id, _start_date, _end_date) ASC
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT 
    _user_position,
    _total,
    _user_points,
    COALESCE(_next_points - _user_points, 0);
END;
$$;

-- =========================================================
-- INDEXES FOR PERFORMANCE
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer ON public.trainer_students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_student ON public.trainer_students(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_status ON public.trainer_students(status);

CREATE INDEX IF NOT EXISTS idx_content_assignments_content ON public.content_assignments(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_assigned_to ON public.content_assignments(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_assigned_by ON public.content_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_content_assignments_dates ON public.content_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_content_assignments_status ON public.content_assignments(status);

CREATE INDEX IF NOT EXISTS idx_community_rankings_trainer ON public.community_rankings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_community_rankings_period ON public.community_rankings(period_type, period_start);

-- =========================================================
-- GRANT EXECUTE PERMISSIONS
-- =========================================================

GRANT EXECUTE ON FUNCTION public.is_personal_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_student_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_trainer_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_assignment_history(UUID, content_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_ranking_points(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_ranking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ranking_position(UUID, UUID, TEXT) TO authenticated;

-- Grant view access
GRANT SELECT ON public.trainer_student_summary TO authenticated;
GRANT SELECT ON public.student_detailed_progress TO authenticated;
