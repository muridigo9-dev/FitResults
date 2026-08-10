-- =============================================
-- CREATE EXERCISE RELATIONSHIP TABLES
-- =============================================

-- 1. Tabala de Relacionamento Exercícios x Grupos Musculares
-- Esta tabela substitui/complementa o primary_muscle_group_id para permitir múltiplos grupos
CREATE TABLE IF NOT EXISTS public.exercise_muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exercise_id, muscle_group_id)
);

-- 2. Migrar dados existentes se houver (de primary_muscle_group_id)
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
SELECT id, primary_muscle_group_id, true
FROM public.exercises
WHERE primary_muscle_group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. RLS para exercise_muscle_groups
ALTER TABLE public.exercise_muscle_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view exercise_muscle_groups" ON public.exercise_muscle_groups;
CREATE POLICY "Everyone can view exercise_muscle_groups"
ON public.exercise_muscle_groups FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage exercise_muscle_groups" ON public.exercise_muscle_groups;
CREATE POLICY "Admins can manage exercise_muscle_groups"
ON public.exercise_muscle_groups FOR ALL
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_id
    AND (e.created_by_id = auth.uid() OR e.created_by_type = 'admin')
  )
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_ex_mg_exercise_id ON public.exercise_muscle_groups(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ex_mg_muscle_id ON public.exercise_muscle_groups(muscle_group_id);

-- 5. Comentários para PostgREST cache refresh
COMMENT ON TABLE public.exercise_muscle_groups IS 'Relacionamento N:N entre exercícios e grupos musculares.';
