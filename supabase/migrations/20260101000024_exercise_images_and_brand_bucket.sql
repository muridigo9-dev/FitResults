-- =============================================
-- Exercise Images + Brand Assets Bucket Fix
-- =============================================

-- 1. Create brand-assets bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Brand assets are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload brand assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update brand assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete brand assets" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Brand assets policies
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 2. Add image columns to workout_exercises table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.workout_exercises ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND column_name = 'image_path'
  ) THEN
    ALTER TABLE public.workout_exercises ADD COLUMN image_path TEXT;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN public.workout_exercises.image_url IS 'External image/gif URL for the exercise';
COMMENT ON COLUMN public.workout_exercises.image_path IS 'Storage path in workout-images bucket for exercise image/gif';
