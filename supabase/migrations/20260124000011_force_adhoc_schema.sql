-- Force workout_id to be nullable for ad-hoc sessions
DO $$
BEGIN
    ALTER TABLE public.workout_sessions ALTER COLUMN workout_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
