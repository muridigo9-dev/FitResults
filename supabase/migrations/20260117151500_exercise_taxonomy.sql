-- =============================================
-- TAXONOMY: EXERCISE TYPES AND LEVELS
-- =============================================

-- 1. Create Lookup Tables
CREATE TABLE IF NOT EXISTS public.exercise_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color_code TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add Foreign Keys to Exercises
ALTER TABLE public.exercises 
    ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.exercise_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES public.exercise_levels(id) ON DELETE SET NULL;

-- 3. Indexes for Filtering
CREATE INDEX IF NOT EXISTS idx_exercises_taxonomy ON public.exercises(type_id, level_id);

-- 4. Sample Data (Successors of legacy fields)
INSERT INTO public.exercise_types (slug, name, icon) VALUES 
('strength', 'Força', 'dumbbell'),
('cardio', 'Cardio', 'activity'),
('mobility', 'Mobilidade', 'stretch'),
('functional', 'Funcional', 'user')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercise_levels (slug, name, color_code) VALUES 
('beginner', 'Iniciante', '#10B981'),
('intermediate', 'Intermediário', '#F59E0B'),
('advanced', 'Avançado', '#EF4444')
ON CONFLICT (slug) DO NOTHING;

-- 5. Data Migration Strategy: Sync existing 'difficulty' to new 'level_id'
UPDATE public.exercises e
SET level_id = l.id
FROM public.exercise_levels l
WHERE e.difficulty::text = l.slug
AND e.level_id IS NULL;

-- 6. RLS Policies
ALTER TABLE public.exercise_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_levels ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Allow read access for all authenticated users"
ON public.exercise_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for all authenticated users"
ON public.exercise_levels FOR SELECT
TO authenticated
USING (true);

-- Full access for admins only
CREATE POLICY "Allow all access for admins"
ON public.exercise_types FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
  )
);

CREATE POLICY "Allow all access for admins"
ON public.exercise_levels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
  )
);
