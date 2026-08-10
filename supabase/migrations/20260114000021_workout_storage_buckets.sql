-- ============================================
-- STORAGE BUCKETS PARA SISTEMA DE TREINOS
-- ============================================
-- Buckets separados para:
-- - muscle-groups: Imagens e GIFs de grupos musculares
-- - exercises-media: Imagens, GIFs e vídeos de exercícios
-- - workouts-media: Imagens de treinos
-- Created: 2026-01-14

-- ============================================
-- 1. BUCKET: muscle-groups
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'muscle-groups',
  'muscle-groups',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies para muscle-groups
DROP POLICY IF EXISTS "Public can view muscle-groups" ON storage.objects;
CREATE POLICY "Public can view muscle-groups"
ON storage.objects FOR SELECT
USING (bucket_id = 'muscle-groups');

DROP POLICY IF EXISTS "Admins can upload muscle-groups" ON storage.objects;
CREATE POLICY "Admins can upload muscle-groups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'muscle-groups'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'trainer')
      AND am.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Admins can update muscle-groups" ON storage.objects;
CREATE POLICY "Admins can update muscle-groups"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'muscle-groups'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
  )
);

DROP POLICY IF EXISTS "Admins can delete muscle-groups" ON storage.objects;
CREATE POLICY "Admins can delete muscle-groups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'muscle-groups'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
  )
);

-- ============================================
-- 2. BUCKET: exercises-media
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercises-media',
  'exercises-media',
  true,
  52428800, -- 50MB (para vídeos)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies para exercises-media
DROP POLICY IF EXISTS "Public can view exercises-media" ON storage.objects;
CREATE POLICY "Public can view exercises-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercises-media');

DROP POLICY IF EXISTS "Trainers can upload exercises-media" ON storage.objects;
CREATE POLICY "Trainers can upload exercises-media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercises-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'trainer', 'content_creator')
      AND am.status = 'active'
    )
    -- Usuários podem fazer upload para pasta própria
    OR (storage.foldername(name))[1] = 'user-content'
  )
);

DROP POLICY IF EXISTS "Trainers can update exercises-media" ON storage.objects;
CREATE POLICY "Trainers can update exercises-media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercises-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR (storage.foldername(name))[1] = 'user-content' AND (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Trainers can delete exercises-media" ON storage.objects;
CREATE POLICY "Trainers can delete exercises-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercises-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR (storage.foldername(name))[1] = 'user-content' AND (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- ============================================
-- 3. BUCKET: workouts-media
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workouts-media',
  'workouts-media',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies para workouts-media
DROP POLICY IF EXISTS "Public can view workouts-media" ON storage.objects;
CREATE POLICY "Public can view workouts-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'workouts-media');

DROP POLICY IF EXISTS "Trainers can upload workouts-media" ON storage.objects;
CREATE POLICY "Trainers can upload workouts-media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workouts-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'trainer', 'content_creator')
      AND am.status = 'active'
    )
    -- Usuários podem fazer upload para pasta própria
    OR (storage.foldername(name))[1] = 'user-content'
  )
);

DROP POLICY IF EXISTS "Trainers can update workouts-media" ON storage.objects;
CREATE POLICY "Trainers can update workouts-media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workouts-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR (storage.foldername(name))[1] = 'user-content' AND (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Trainers can delete workouts-media" ON storage.objects;
CREATE POLICY "Trainers can delete workouts-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workouts-media'
  AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'personal_trainer')
    OR (storage.foldername(name))[1] = 'user-content' AND (storage.foldername(name))[2] = auth.uid()::text
  )
);


