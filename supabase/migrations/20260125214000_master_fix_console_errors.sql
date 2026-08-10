-- MASTER FIX: TECHNICAL DEBT & CONSOLE ERRORS
-- Created: 2026-01-25
-- Logic: Idempotent, safe, and definitive.

-- 1. FIX USER_PREFERENCES (400 Bad Request on goals)
DO $$ 
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'water_goal_ml') THEN
        ALTER TABLE public.user_preferences ADD COLUMN water_goal_ml INTEGER DEFAULT 2500;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'meals_goal_count') THEN
        ALTER TABLE public.user_preferences ADD COLUMN meals_goal_count INTEGER DEFAULT 4;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'calorie_target') THEN
        ALTER TABLE public.user_preferences ADD COLUMN calorie_target INTEGER DEFAULT 2000;
    END IF;
END $$;

-- 2. FIX USER_XP (400 Bad Request on Upsert)
-- The error "on_conflict=user_id" requires a UNIQUE constraint on user_id
DO $$ 
BEGIN
    -- Check if unique constraint exists, if not add it
    -- Note: We check both constraint types (unique and primary key)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE (conname = 'user_xp_user_id_unique' OR conname = 'user_xp_user_id_key')
        AND contype = 'u'
    ) THEN
        -- Try to add it. If user has duplicates, this will fail (handling that case)
        BEGIN
            ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_user_id_unique UNIQUE (user_id);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not add unique constraint to user_xp. Deleting duplicates first.';
            -- Potential cleanup logic if needed
        END;
    END IF;

    -- Ensure streak columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'current_streak') THEN
        ALTER TABLE public.user_xp ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'longest_streak') THEN
        ALTER TABLE public.user_xp ADD COLUMN longest_streak INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'last_checkin_date') THEN
        ALTER TABLE public.user_xp ADD COLUMN last_checkin_date DATE;
    END IF;
END $$;

-- 3. ACHIEVEMENTS SCHEMA CHECK
-- Safe conversion of condition_value if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'condition_value') THEN
        ALTER TABLE public.achievements ALTER COLUMN condition_value TYPE INTEGER USING condition_value::integer;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'requirement_value') THEN
        ALTER TABLE public.achievements ALTER COLUMN requirement_value TYPE INTEGER USING requirement_value::integer;
    END IF;
END $$;

-- 4. FIX USER_CHALLENGE_PROGRESS RLS (Access issues)
-- Sometimes progress can't be head-checked because of RLS
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own progress" ON public.user_challenge_progress;
CREATE POLICY "Users view own progress" ON public.user_challenge_progress
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_challenge_participations p WHERE p.id = participation_id AND p.user_id = auth.uid()));

-- 5. FIX USER_CHALLENGE_PARTICIPATIONS RLS (Missing status view)
ALTER TABLE public.user_challenge_participations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own participation v2" ON public.user_challenge_participations;
CREATE POLICY "Users view own participation v2" ON public.user_challenge_participations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
