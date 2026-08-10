-- =============================================
-- FIX: STORAGE POLICIES AND EXERCISE RELATIONS
-- =============================================

-- 1. ADICIONAR POLÍTICAS DE SELECT/UPDATE/DELETE PARA BUCKETS
-- Atualmente só existe INSERT, o que impede visualização e remoção.

-- Bucket: exercises-media
DROP POLICY IF EXISTS "Public exercises-media access" ON storage.objects;
CREATE POLICY "Public exercises-media access"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'exercises-media');

DROP POLICY IF EXISTS "Admins can manage exercises-media" ON storage.objects;
CREATE POLICY "Admins can manage exercises-media"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'exercises-media'
  AND (
    public.is_admin()
    OR public.check_is_academy_staff_safe(auth.uid())
  )
);

-- Bucket: workouts-media
DROP POLICY IF EXISTS "Public workouts-media access" ON storage.objects;
CREATE POLICY "Public workouts-media access"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'workouts-media');

DROP POLICY IF EXISTS "Admins can manage workouts-media" ON storage.objects;
CREATE POLICY "Admins can manage workouts-media"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'workouts-media'
  AND (
    public.is_admin()
    OR public.check_is_academy_staff_safe(auth.uid())
  )
);

-- 2. CORREÇÃO NAS RELAÇÕES DE EXERCÍCIOS
-- Garante que possamos deletar exercícios sem erros de foreign key se eles não estiverem em treinos.
-- (Treinos usam workout_exercises que tem sua própria lógica, mas relações diretas devem ser seguras)

ALTER TABLE public.exercise_muscle_groups 
  DROP CONSTRAINT IF EXISTS exercise_muscle_groups_exercise_id_fkey,
  ADD CONSTRAINT exercise_muscle_groups_exercise_id_fkey 
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

ALTER TABLE public.exercise_plans 
  DROP CONSTRAINT IF EXISTS exercise_plans_exercise_id_fkey,
  ADD CONSTRAINT exercise_plans_exercise_id_fkey 
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
