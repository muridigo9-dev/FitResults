-- =============================================
-- FIX: EXERCISE SCHEMA AND STORAGE RECURSION
-- =============================================

-- 1. ADICIONAR COLUNAS FALTANTES EM EXERCISES
-- Resolve o erro: Could not find the 'image_path' column
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS created_by_type TEXT DEFAULT 'admin';

-- 2. FUNÇÕES SECURITY DEFINER PARA QUEBRAR RECURSÃO
-- Estas funções rodam com privilégios de owner (bypass RLS) para evitar loops infinitos

CREATE OR REPLACE FUNCTION public.check_is_academy_admin_safe(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE user_id = _user_id 
    AND academy_id = _academy_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_academy_staff_safe(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE user_id = _user_id 
    AND role IN ('owner', 'admin', 'trainer', 'content_creator')
    AND status = 'active'
  );
$$;

-- 3. CORRIGIR POLICIES DE academy_members
-- Removemos a dependência direta da tabela em si na policy para evitar recursão
DROP POLICY IF EXISTS "Academy admins manage their members" ON public.academy_members;
CREATE POLICY "Academy admins manage their members"
  ON public.academy_members
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR public.check_is_academy_admin_safe(auth.uid(), academy_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.check_is_academy_admin_safe(auth.uid(), academy_id)
  );

-- 4. CORRIGIR POLICIES DE STORAGE (Prevenir recursão ao verificar permissões da academia)

-- Exercícios Media
DROP POLICY IF EXISTS "Trainers can upload exercises-media" ON storage.objects;
CREATE POLICY "Trainers can upload exercises-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercises-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR public.check_is_academy_staff_safe(auth.uid())
    OR (storage.foldername(name))[1] = 'user-content'
  )
);

-- Treinos Media
DROP POLICY IF EXISTS "Trainers can upload workouts-media" ON storage.objects;
CREATE POLICY "Trainers can upload workouts-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workouts-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR public.check_is_academy_staff_safe(auth.uid())
    OR (storage.foldername(name))[1] = 'user-content'
  )
);

-- Muscle Groups Media
DROP POLICY IF EXISTS "Admins can upload muscle-groups" ON storage.objects;
CREATE POLICY "Admins can upload muscle-groups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'muscle-groups'
  AND (
    public.is_admin()
    OR public.check_is_academy_staff_safe(auth.uid())
  )
);

COMMENT ON COLUMN public.exercises.image_path IS 'Caminho do arquivo no bucket exercises-media';
