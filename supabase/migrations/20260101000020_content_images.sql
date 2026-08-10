-- ================================================
-- CONTENT IMAGES SYSTEM
-- Storage buckets and image columns for diets, workouts, challenges
-- ================================================

-- ==========================================
-- 1. CREATE STORAGE BUCKETS (idempotent)
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('diet-images', 'diet-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('workout-images', 'workout-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('challenge-images', 'challenge-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. STORAGE POLICIES (idempotent with DROP IF EXISTS)
-- ==========================================

-- Diet Images Policies
DROP POLICY IF EXISTS "Public read diet images" ON storage.objects;
CREATE POLICY "Public read diet images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diet-images');

DROP POLICY IF EXISTS "Admin upload diet images" ON storage.objects;
CREATE POLICY "Admin upload diet images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diet-images' 
  AND (
    public.is_admin() 
    OR (
      public.is_feature_enabled('user_custom_diets') 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

DROP POLICY IF EXISTS "Admin update diet images" ON storage.objects;
CREATE POLICY "Admin update diet images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diet-images' 
  AND (
    public.is_admin() 
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Admin delete diet images" ON storage.objects;
CREATE POLICY "Admin delete diet images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'diet-images' 
  AND (
    public.is_admin() 
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Workout Images Policies
DROP POLICY IF EXISTS "Public read workout images" ON storage.objects;
CREATE POLICY "Public read workout images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workout-images');

DROP POLICY IF EXISTS "Admin upload workout images" ON storage.objects;
CREATE POLICY "Admin upload workout images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-images' 
  AND (
    public.is_admin() 
    OR (
      public.is_feature_enabled('user_custom_workouts') 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

DROP POLICY IF EXISTS "Admin update workout images" ON storage.objects;
CREATE POLICY "Admin update workout images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workout-images' 
  AND (
    public.is_admin() 
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Admin delete workout images" ON storage.objects;
CREATE POLICY "Admin delete workout images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-images' 
  AND (
    public.is_admin() 
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Challenge Images Policies
DROP POLICY IF EXISTS "Public read challenge images" ON storage.objects;
CREATE POLICY "Public read challenge images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'challenge-images');

DROP POLICY IF EXISTS "Admin upload challenge images" ON storage.objects;
CREATE POLICY "Admin upload challenge images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admin update challenge images" ON storage.objects;
CREATE POLICY "Admin update challenge images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admin delete challenge images" ON storage.objects;
CREATE POLICY "Admin delete challenge images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

-- ==========================================
-- 3. ADD IMAGE COLUMNS TO TABLES (idempotent)
-- ==========================================

-- Diets table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'diets' AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.diets ADD COLUMN image_path TEXT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'diets' AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.diets ADD COLUMN image_url TEXT NULL;
  END IF;
END $$;

-- Workouts table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workouts' AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.workouts ADD COLUMN image_path TEXT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workouts' AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.workouts ADD COLUMN image_url TEXT NULL;
  END IF;
END $$;

-- Challenges table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.challenges ADD COLUMN image_path TEXT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.challenges ADD COLUMN image_url TEXT NULL;
  END IF;
END $$;

-- User Diets table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_diets' AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.user_diets ADD COLUMN image_path TEXT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_diets' AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.user_diets ADD COLUMN image_url TEXT NULL;
  END IF;
END $$;

-- User Workouts table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_workouts' AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.user_workouts ADD COLUMN image_path TEXT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_workouts' AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.user_workouts ADD COLUMN image_url TEXT NULL;
  END IF;
END $$;

-- ==========================================
-- 4. COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN public.diets.image_path IS 'Path to image in Supabase Storage (diet-images bucket)';
COMMENT ON COLUMN public.diets.image_url IS 'External URL for diet image';
COMMENT ON COLUMN public.workouts.image_path IS 'Path to image in Supabase Storage (workout-images bucket)';
COMMENT ON COLUMN public.workouts.image_url IS 'External URL for workout image';
COMMENT ON COLUMN public.challenges.image_path IS 'Path to image in Supabase Storage (challenge-images bucket)';
COMMENT ON COLUMN public.challenges.image_url IS 'External URL for challenge image';
