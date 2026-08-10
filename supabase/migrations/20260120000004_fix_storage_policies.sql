-- ============================================
-- FIX STORAGE POLICIES FOR STUDENT ACCESS
-- ============================================
-- This migration ensures that authenticated users (students) can view images
-- in the muscle-groups, exercises-media, and workouts-media buckets.

-- 1. muscle-groups
DROP POLICY IF EXISTS "Authenticated users can view muscle-groups" ON storage.objects;
CREATE POLICY "Authenticated users can view muscle-groups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'muscle-groups');

-- Also ensure public access is maintained (if it was intended) or explicit public policy
DROP POLICY IF EXISTS "Public can view muscle-groups" ON storage.objects;
CREATE POLICY "Public can view muscle-groups"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'muscle-groups');

-- 2. exercises-media
DROP POLICY IF EXISTS "Authenticated users can view exercises-media" ON storage.objects;
CREATE POLICY "Authenticated users can view exercises-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exercises-media');

DROP POLICY IF EXISTS "Public can view exercises-media" ON storage.objects;
CREATE POLICY "Public can view exercises-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercises-media');

-- 3. workouts-media
DROP POLICY IF EXISTS "Authenticated users can view workouts-media" ON storage.objects;
CREATE POLICY "Authenticated users can view workouts-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'workouts-media');

DROP POLICY IF EXISTS "Public can view workouts-media" ON storage.objects;
CREATE POLICY "Public can view workouts-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workouts-media');
