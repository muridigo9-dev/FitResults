-- ===========================================
-- Content Images Storage Buckets & Policies
-- ===========================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can create content for a feature
CREATE OR REPLACE FUNCTION public.can_create_user_content(feature_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can always create
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if feature flag allows user content creation
  RETURN EXISTS (
    SELECT 1 FROM public.feature_flags 
    WHERE key = feature_key 
    AND enabled = TRUE 
    AND allow_user_content = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 1. DIET IMAGES BUCKET
-- ===========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diet-images',
  'diet-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Diet images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'diet-images');

-- Admin can upload/manage all diet images
CREATE POLICY "Admins can upload diet images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diet-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can update diet images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'diet-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can delete diet images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diet-images' 
  AND public.is_admin()
);

-- Users can upload to their own folder when feature flag allows
CREATE POLICY "Users can upload own diet images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diet-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.can_create_user_content('user_custom_diets')
);

CREATE POLICY "Users can update own diet images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'diet-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own diet images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diet-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ===========================================
-- 2. WORKOUT IMAGES BUCKET
-- ===========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workout-images',
  'workout-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Workout images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'workout-images');

-- Admin can upload/manage all workout images
CREATE POLICY "Admins can upload workout images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workout-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can update workout images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workout-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can delete workout images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workout-images' 
  AND public.is_admin()
);

-- Users can upload to their own folder when feature flag allows
CREATE POLICY "Users can upload own workout images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workout-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.can_create_user_content('user_custom_workouts')
);

CREATE POLICY "Users can update own workout images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workout-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own workout images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workout-images'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ===========================================
-- 3. CHALLENGE IMAGES BUCKET
-- ===========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-images',
  'challenge-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Challenge images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-images');

-- Only admins can manage challenge images (challenges are system-only)
CREATE POLICY "Admins can upload challenge images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can update challenge images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

CREATE POLICY "Admins can delete challenge images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'challenge-images' 
  AND public.is_admin()
);

-- ===========================================
-- Add image_path column to content tables
-- ===========================================

-- Diets table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'diets' 
    AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.diets ADD COLUMN image_path TEXT NULL;
    COMMENT ON COLUMN public.diets.image_path IS 'Path to image in Supabase Storage (diet-images bucket)';
  END IF;
END $$;

-- Workouts table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.workouts ADD COLUMN image_path TEXT NULL;
    COMMENT ON COLUMN public.workouts.image_path IS 'Path to image in Supabase Storage (workout-images bucket)';
  END IF;
END $$;

-- Challenges table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'challenges' 
    AND column_name = 'image_url') 
  THEN
    ALTER TABLE public.challenges ADD COLUMN image_url TEXT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'challenges' 
    AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.challenges ADD COLUMN image_path TEXT NULL;
    COMMENT ON COLUMN public.challenges.image_path IS 'Path to image in Supabase Storage (challenge-images bucket)';
  END IF;
END $$;

-- User diets table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_diets' 
    AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.user_diets ADD COLUMN image_path TEXT NULL;
    COMMENT ON COLUMN public.user_diets.image_path IS 'Path to image in Supabase Storage (diet-images bucket, user folder)';
  END IF;
END $$;

-- User workouts table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_workouts' 
    AND column_name = 'image_path') 
  THEN
    ALTER TABLE public.user_workouts ADD COLUMN image_path TEXT NULL;
    COMMENT ON COLUMN public.user_workouts.image_path IS 'Path to image in Supabase Storage (workout-images bucket, user folder)';
  END IF;
END $$;
