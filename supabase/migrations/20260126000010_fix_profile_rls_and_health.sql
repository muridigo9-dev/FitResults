-- FIX: Profiles RLS and Onboarding Loop
-- Created: 2026-01-26
-- Principle: Ensure users can create their own profiles if trigger fails or in reset scenarios

-- 1. Enable INSERT on profiles for the user themselves
DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;
CREATE POLICY "Profiles insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. Ensure all required columns for onboarding exist (defensive)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Notification system fix (related to onboarding welcome email)
-- Ensure in_app_notifications table is healthy
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure RLS for notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can view own notifications" ON public.in_app_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can update own notifications" ON public.in_app_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Reload schema cache hint
NOTIFY pgrst, 'reload schema';
