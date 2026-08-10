-- ==============================================================================
-- MIGRATION: Fix Workout Persistence (Image & Exercises)
-- ==============================================================================

-- 1. Workouts Table: Ensure image_path exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'image_path') THEN
        ALTER TABLE public.workouts ADD COLUMN image_path TEXT;
        COMMENT ON COLUMN public.workouts.image_path IS 'Storage path for the cover image (system/bucket/path)';
    END IF;
END $$;

-- 2. Workout Exercises: Allow NULL exercise_id (Custom exercises or unlinked imports)
ALTER TABLE public.workout_exercises ALTER COLUMN exercise_id DROP NOT NULL;

-- 3. Validation: Ensure RLS allows insert/update for admins (re-asserting)
DROP POLICY IF EXISTS "Admins have full control workout_exercises" ON public.workout_exercises;
CREATE POLICY "Admins have full control workout_exercises" 
ON public.workout_exercises 
FOR ALL 
TO authenticated 
USING (
    public.is_admin() OR 
    public.is_content_creator(auth.uid())
)
WITH CHECK (
    public.is_admin() OR 
    public.is_content_creator(auth.uid())
);
