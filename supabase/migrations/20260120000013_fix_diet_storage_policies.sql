-- ==============================================================================
-- MIGRATION: Fix Diet Storage Policies (Explicit Fix)
-- ==============================================================================
-- Description: Explicitly ensures the 'diet-images' bucket exists and has correct 
-- public/admin policies. This fixes potential issues where previous migrations
-- might have been skipped or policies dropped.
-- ==============================================================================

-- 1. Ensure Bucket Exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('diet-images', 'diet-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true; -- Force public to true

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public read diet images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload diet images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update diet images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete diet images" ON storage.objects;

-- 3. Re-create Policies

-- Public Read
CREATE POLICY "Public read diet images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diet-images');

-- Admin Upload (Insert)
CREATE POLICY "Admin upload diet images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diet-images' 
  AND (
    -- Allow Admins
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Admin Update
CREATE POLICY "Admin update diet images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diet-images' 
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Admin Delete
CREATE POLICY "Admin delete diet images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'diet-images' 
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);
