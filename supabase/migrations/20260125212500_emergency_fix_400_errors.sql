-- Fix missing columns in user_preferences and other 400 errors
-- Created: 2026-01-25 (Emergency Fix)
-- Principle: Idempotent & Safe

-- 1. Ensure user_preferences goals columns exist
DO $$ 
BEGIN
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

-- 2. Fix user_xp missing columns if any
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'current_streak') THEN
        ALTER TABLE public.user_xp ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Ensure achievements table matches expectations
-- (already standard, but ensuring)

-- 4. In-App Notifications missing columns?
-- The head error on user_challenge_progress might be missing status column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_challenge_progress' AND column_name = 'status') THEN
        ALTER TABLE public.user_challenge_progress ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;
