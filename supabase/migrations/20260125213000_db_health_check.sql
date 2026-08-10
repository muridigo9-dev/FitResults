-- Ensure user_xp and user_preferences tables are healthy
-- Addressing 400 Bad Request errors

-- 1. Check user_xp uniqueness and columns
DO $$ 
BEGIN
    -- Ensure user_id has unique constraint for upsert
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_xp_user_id_key' OR conname = 'user_xp_user_id_unique'
    ) THEN
        -- Safely try to add unique constraint if there are no duplicates
        -- If duplicates exist, it will fail but we'll try to handle it
        ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_user_id_unique UNIQUE (user_id);
    END IF;

    -- Ensure last_checkin_date exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'last_checkin_date') THEN
        ALTER TABLE public.user_xp ADD COLUMN last_checkin_date DATE;
    END IF;

    -- Ensure longest_streak exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'longest_streak') THEN
        ALTER TABLE public.user_xp ADD COLUMN longest_streak INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. User Preferences RLS fix (sometimes 400 is policy violation)
-- Ensure selecting from user_preferences is allowed
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own preferences v2" ON public.user_preferences;
CREATE POLICY "Users can view own preferences v2" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Achievements table fix
-- Safe conversion of condition_value if it exists
DO $$ 
BEGIN
    -- This column was requirement_value in older versions, renamed to condition_value in 20260114000017
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'condition_value') THEN
        ALTER TABLE public.achievements ALTER COLUMN condition_value TYPE INTEGER USING condition_value::integer;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'requirement_value') THEN
        ALTER TABLE public.achievements ALTER COLUMN requirement_value TYPE INTEGER USING requirement_value::integer;
    END IF;
END $$;
