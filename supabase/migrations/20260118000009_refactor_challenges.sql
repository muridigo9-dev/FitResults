-- =========================================================
-- REFACTOR CHALLENGES MODULE (v2)
-- =========================================================

-- 1. Backup Existing Tables (Renaming)
ALTER TABLE IF EXISTS public.challenges RENAME TO challenges_old;
ALTER TABLE IF EXISTS public.challenge_days RENAME TO challenge_days_old;
ALTER TABLE IF EXISTS public.challenge_tasks RENAME TO challenge_tasks_old;
ALTER TABLE IF EXISTS public.user_challenge_progress RENAME TO user_challenge_progress_old;

-- 2. Create New Challenges Table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    
    -- Admin Type
    type TEXT DEFAULT 'global' CHECK (type IN ('global', 'academy')),
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Scheduling
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    duration_days INTEGER NOT NULL DEFAULT 30,
    
    -- Config
    is_active BOOLEAN DEFAULT true,
    visibility_type TEXT DEFAULT 'public' CHECK (visibility_type IN ('public', 'plan_based', 'invite_only')),
    requirements JSONB DEFAULT '{}'::jsonb, -- e.g. {"allowed_plans": ["pro"], "min_level": 1}
    
    -- Rewards
    xp_reward INTEGER DEFAULT 500,
    badge_id UUID, -- Future: REFERENCES badges(id)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Days Table
CREATE TABLE IF NOT EXISTS public.challenge_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    xp_bonus INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, day_number)
);

-- 4. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.challenge_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_day_id UUID NOT NULL REFERENCES public.challenge_days(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('workout', 'diet', 'habit', 'checkin', 'custom')),
    title TEXT NOT NULL,
    
    -- Polymorphic Content Reference
    content_id UUID, -- ID of workout, diet, or habit
    content_type TEXT CHECK (content_type IN ('workouts', 'diets', 'habits', 'custom')),
    
    config JSONB DEFAULT '{}'::jsonb, -- {"min_duration": 30, "target_value": 2}
    
    is_mandatory BOOLEAN DEFAULT true,
    xp_reward INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Participation (Enrollment)
CREATE TABLE IF NOT EXISTS public.user_challenge_participations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES public.academies(id), -- Academy context snapshot
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    current_day INTEGER DEFAULT 1,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, challenge_id)
);

-- 6. User Progress (Daily Log)
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participation_id UUID NOT NULL REFERENCES public.user_challenge_participations(id) ON DELETE CASCADE,
    challenge_day_id UUID NOT NULL REFERENCES public.challenge_days(id) ON DELETE CASCADE,
    
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    tasks_completed JSONB DEFAULT '[]'::jsonb, -- Array of task IDs completed
    
    UNIQUE(participation_id, challenge_day_id)
);


-- 6.5. Helper Function for RLS
CREATE OR REPLACE FUNCTION public.has_role_in_academy(
    p_academy_id UUID,
    p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.academy_members 
        WHERE academy_id = p_academy_id 
          AND user_id = auth.uid() 
          AND role = p_role 
          AND status = 'active'
    );
$$;

-- 7. Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- 8. Policies

-- Challenges:
-- Admins/System can manage
CREATE POLICY "Admins manage challenges" ON public.challenges
    FOR ALL TO authenticated
    USING (public.is_admin() OR (type = 'academy' AND public.has_role_in_academy(academy_id, 'owner')))
    WITH CHECK (public.is_admin() OR (type = 'academy' AND public.has_role_in_academy(academy_id, 'owner')));

-- Users can read visible challenges
CREATE POLICY "Users read challenges" ON public.challenges
    FOR SELECT TO authenticated
    USING (
        is_active = true 
        AND (
            type = 'global' 
            OR (type = 'academy' AND EXISTS (SELECT 1 FROM public.academy_members am WHERE am.user_id = auth.uid() AND am.academy_id = challenges.academy_id))
        )
    );

-- Days/Tasks: Inherit visibility from Challenges (Simplified for read)
CREATE POLICY "Read challenge days" ON public.challenge_days
    FOR SELECT TO authenticated USING (true);
    
CREATE POLICY "Read challenge tasks" ON public.challenge_tasks
    FOR SELECT TO authenticated USING (true);

-- Admin Management for Days/Tasks
CREATE POLICY "Admins manage days" ON public.challenge_days
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND (public.is_admin() OR c.created_by = auth.uid())));
    
CREATE POLICY "Admins manage tasks" ON public.challenge_tasks
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.challenge_days d JOIN public.challenges c ON d.challenge_id = c.id WHERE d.id = challenge_day_id AND (public.is_admin() OR c.created_by = auth.uid())));

-- Participation:
CREATE POLICY "Users manage participation" ON public.user_challenge_participations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view participation" ON public.user_challenge_participations
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Progress:
CREATE POLICY "Users manage progress" ON public.user_challenge_progress
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_challenge_participations p WHERE p.id = participation_id AND p.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_challenge_participations p WHERE p.id = participation_id AND p.user_id = auth.uid()));

-- 9. Migration (Best Effort)
INSERT INTO public.challenges (id, name, description, duration_days, is_active, created_by, type, visibility_type)
SELECT id, name, description, total_days, is_active, created_by, 'global', 'public'
FROM public.challenges_old;

-- Note: Complex day/task migration is skipped as structure changed significantly. Old tables are kept for reference.
