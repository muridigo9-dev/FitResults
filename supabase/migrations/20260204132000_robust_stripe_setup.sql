-- Final robustness check for Stripe integration
-- Follows PRINCIPLE Nº 6 — MIGRATIONS INQUEBRÁVEIS

-- 1. Ensure Profiles table has all necessary Stripe columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
    ALTER TABLE public.profiles ADD COLUMN account_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_plan_id') THEN
    ALTER TABLE public.profiles ADD COLUMN current_plan_id uuid;
  END IF;
END $$;

-- 2. Robust RLS for stripe_settings
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage stripe settings" ON public.stripe_settings;
DROP POLICY IF EXISTS "Admins can read stripe settings" ON public.stripe_settings;
DROP POLICY IF EXISTS "Admins can update stripe settings" ON public.stripe_settings;
DROP POLICY IF EXISTS "Admins can insert stripe settings" ON public.stripe_settings;

-- Use a more standard role check if has_role exists, otherwise fallback to user_roles table
CREATE POLICY "Admins manage stripe settings"
ON public.stripe_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 3. Ensure stripe_events table exists and is secure
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id text UNIQUE NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean NOT NULL DEFAULT false,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view stripe events" ON public.stripe_events;
CREATE POLICY "Admins view stripe events"
ON public.stripe_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 4. Default row for stripe_settings if none exists
INSERT INTO public.stripe_settings (stripe_mode, is_connected)
SELECT 'test', false
WHERE NOT EXISTS (SELECT 1 FROM public.stripe_settings LIMIT 1);
