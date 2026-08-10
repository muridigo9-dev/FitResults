-- Allow workout_id to be null for ad-hoc/standalone sessions
ALTER TABLE public.workout_sessions ALTER COLUMN workout_id DROP NOT NULL;

-- Update RLS policies if needed (usually checking workout_id IS NOT NULL in some places?)
-- Checking existing policies... "Trainers can view student sessions" uses workout_sessions directly.
-- "Users can manage own sessions" uses user_id.
-- Seems safe.

-- Add a comment explaining usage
COMMENT ON COLUMN public.workout_sessions.workout_id IS 'Reference to the workout plan. Can be NULL for ad-hoc/standalone sessions.';
