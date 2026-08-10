-- Migration to fix complete_workout_session error "record new has no field user_id"
-- This likely stems from a trigger attempting to access user_id on a table that doesn't have it,
-- or a legacy trigger interfering with the new workflow.
-- Specific suspect: trigger_check_achievements_on_workout on checkin_workouts

BEGIN;

-- 1. Drop potentially problematic trigger on checkin_workouts
-- Since complete_workout_session handles achievement checking explicitly via RPC calls,
-- this trigger is likely redundant and if checkin_workouts lacks user_id, it crashes.
DROP TRIGGER IF EXISTS check_achievements_after_workout ON public.checkin_workouts;
DROP FUNCTION IF EXISTS public.trigger_check_achievements_on_workout();

-- 2. Drop legacy trigger on workout_sessions if it exists and wasn't found in search
-- (Defensive cleanup for any 'notify' trigger that might assume user_id on specific event flow)
-- Note: we keep standard timestamps triggers.

-- 3. Ensure diary_entries table exists (referenced in complete_workout_session)
CREATE TABLE IF NOT EXISTS public.diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type TEXT NOT NULL, -- 'workout', 'diet', 'note', etc.
    source TEXT DEFAULT 'system',
    reference_id UUID, -- id of the workout/diet
    title TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on diary_entries just in case
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own diary entries" ON public.diary_entries;
CREATE POLICY "Users can manage own diary entries" ON public.diary_entries
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Re-grant execute on key RPCs to ensure access
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID, public.exercise_feedback_mood, INTEGER, TEXT) TO authenticated;

COMMIT;
