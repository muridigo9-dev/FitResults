-- =====================================================
-- COMPLETE STRIPE SUBSCRIPTION SYSTEM MIGRATION
-- =====================================================
-- File: 20260110000001_stripe_subscription_system.sql
-- 
-- Copy this to: supabase/migrations/20260110000001_stripe_subscription_system.sql
--
-- Secrets required in Supabase:
--   - STRIPE_SECRET_KEY (sk_test_xxx or sk_live_xxx)
--   - STRIPE_WEBHOOK_SECRET (whsec_xxx)
-- =====================================================

-- =====================================================
-- PART 1: Add subscription columns to profiles table
-- =====================================================

-- Add Stripe-related columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'pending';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Subscription status: none, active, trialing, past_due, cancelled, unpaid, incomplete, expired';
COMMENT ON COLUMN public.profiles.account_status IS 'Account status: pending, active, cancelled, suspended';

-- Create index for faster lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON public.profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON public.profiles(subscription_status);

-- =====================================================
-- PART 2: Stripe Settings Table (Admin Configuration)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stripe_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_mode text NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
    is_connected boolean NOT NULL DEFAULT false,
    trial_days integer NOT NULL DEFAULT 7 CHECK (trial_days >= 0 AND trial_days <= 365),
    trial_enabled boolean NOT NULL DEFAULT true,
    trial_message text DEFAULT '7 dias grátis',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on stripe_settings
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_settings (admin only)
DROP POLICY IF EXISTS "Admins can read stripe settings" ON public.stripe_settings;
CREATE POLICY "Admins can read stripe settings"
ON public.stripe_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can update stripe settings" ON public.stripe_settings;
CREATE POLICY "Admins can update stripe settings"
ON public.stripe_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can insert stripe settings" ON public.stripe_settings;
CREATE POLICY "Admins can insert stripe settings"
ON public.stripe_settings FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Insert default stripe settings if not exists
INSERT INTO public.stripe_settings (stripe_mode, is_connected, trial_days, trial_enabled, trial_message)
SELECT 'test', false, 7, true, '7 dias grátis'
WHERE NOT EXISTS (SELECT 1 FROM public.stripe_settings LIMIT 1);

-- =====================================================
-- PART 3: Stripe Events Logging Table
-- =====================================================

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

-- Create indexes for stripe_events
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events(created_at DESC);

-- Enable RLS on stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access stripe_events (for edge functions)
DROP POLICY IF EXISTS "Service role only for stripe_events" ON public.stripe_events;
CREATE POLICY "Service role only for stripe_events"
ON public.stripe_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view stripe events (read-only)
DROP POLICY IF EXISTS "Admins can view stripe events" ON public.stripe_events;
CREATE POLICY "Admins can view stripe events"
ON public.stripe_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Function to check if user has active subscription
-- IMPORTANT: Admins always return true (bypass subscription check)
CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
    sub_status text;
    acc_status text;
BEGIN
    -- First check if user is admin (admins bypass subscription check)
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    ) INTO is_admin;
    
    IF is_admin THEN
        RETURN true;
    END IF;
    
    -- For non-admins, check subscription status
    SELECT subscription_status, account_status
    INTO sub_status, acc_status
    FROM public.profiles
    WHERE id = check_user_id;
    
    -- Return false if account is cancelled
    IF acc_status = 'cancelled' THEN
        RETURN false;
    END IF;
    
    -- Return true if subscription is active or trialing
    RETURN sub_status IN ('active', 'trialing');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;

-- Function to log stripe events (for edge functions)
CREATE OR REPLACE FUNCTION public.log_stripe_event(
    p_event_id text,
    p_event_type text,
    p_payload jsonb,
    p_processed boolean DEFAULT false,
    p_error text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO public.stripe_events (stripe_event_id, event_type, payload, processed, error_message, processed_at)
    VALUES (
        p_event_id, 
        p_event_type, 
        p_payload, 
        p_processed, 
        p_error,
        CASE WHEN p_processed THEN now() ELSE NULL END
    )
    ON CONFLICT (stripe_event_id) DO UPDATE SET
        processed = EXCLUDED.processed,
        error_message = EXCLUDED.error_message,
        processed_at = CASE WHEN EXCLUDED.processed THEN now() ELSE stripe_events.processed_at END
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Grant execute to service_role only (edge functions)
GRANT EXECUTE ON FUNCTION public.log_stripe_event(text, text, jsonb, boolean, text) TO service_role;

-- Function to update user subscription status (for edge functions)
CREATE OR REPLACE FUNCTION public.update_user_subscription(
    p_user_id uuid,
    p_customer_id text,
    p_subscription_id text,
    p_subscription_status text,
    p_account_status text DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        stripe_customer_id = COALESCE(p_customer_id, stripe_customer_id),
        stripe_subscription_id = COALESCE(p_subscription_id, stripe_subscription_id),
        subscription_status = p_subscription_status,
        account_status = p_account_status,
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION public.update_user_subscription(uuid, text, text, text, text) TO service_role;

-- =====================================================
-- PART 5: Trigger for updated_at (if not exists)
-- =====================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create updated_at trigger for stripe_settings
DROP TRIGGER IF EXISTS update_stripe_settings_updated_at ON public.stripe_settings;
CREATE TRIGGER update_stripe_settings_updated_at
    BEFORE UPDATE ON public.stripe_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Tables created:
--   - stripe_settings: Admin configuration for Stripe
--   - stripe_events: Webhook event logging
--
-- Columns added to profiles:
--   - stripe_customer_id
--   - stripe_subscription_id
--   - subscription_status
--   - account_status
--
-- Functions created:
--   - has_active_subscription(uuid): Check if user has active sub (admins always true)
--   - log_stripe_event(...): Log webhook events
--   - update_user_subscription(...): Update user subscription data
--
-- RLS Policies:
--   - stripe_settings: Admin only (read/write)
--   - stripe_events: Service role + Admin read
--
-- =====================================================
