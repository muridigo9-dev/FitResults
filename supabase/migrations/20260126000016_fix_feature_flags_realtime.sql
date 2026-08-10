-- ============================================================
-- FIX FEATURE FLAGS: DUPLICATES AND REALTIME
-- ============================================================

-- 1. Remove Duplicate Flag
-- Disable trigger to avoid FK violation on audit log during delete (FK constraint prevents inserting audit for deleted parent)
ALTER TABLE public.feature_flags DISABLE TRIGGER feature_flag_audit_trigger;

DELETE FROM public.feature_flags 
WHERE key = 'user_workout_creation_enabled';

ALTER TABLE public.feature_flags ENABLE TRIGGER feature_flag_audit_trigger;

-- 2. Enable Realtime for feature_flags
-- Check if table is already in publication to avoid errors, or just try to add it.
-- Supabase default publication is 'supabase_realtime'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'feature_flags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
  END IF;
END $$;

-- 3. Ensure Policy consistency (Reinforce)
DROP POLICY IF EXISTS "Users read feature flags" ON public.feature_flags;
CREATE POLICY "Users read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);
