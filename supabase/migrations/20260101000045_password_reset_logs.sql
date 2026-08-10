-- =====================================================
-- Migration: Password Reset Logs
-- Description: Create table to track password reset requests
--              and prevent spam/abuse
-- =====================================================

-- Create password_reset_logs table
CREATE TABLE IF NOT EXISTS public.password_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  requested_by_admin BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'sent_via_supabase', 'failed')),
  resend_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for quick lookups by email
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_email 
  ON public.password_reset_logs(user_email, created_at DESC);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user_id 
  ON public.password_reset_logs(user_id);

-- Enable RLS
ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin can view all password reset logs
CREATE POLICY "Admin can view all password reset logs"
  ON public.password_reset_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Service role can insert (Edge Functions)
-- Note: Edge Functions use service_role key which bypasses RLS

-- User can view their own password reset logs
CREATE POLICY "User can view own password reset logs"
  ON public.password_reset_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_password_reset_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_password_reset_logs_updated_at
  BEFORE UPDATE ON public.password_reset_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_password_reset_logs_updated_at();

-- Function to check if a password reset was sent recently
CREATE OR REPLACE FUNCTION public.can_send_password_reset(target_email TEXT, cooldown_seconds INT DEFAULT 60)
RETURNS TABLE (
  can_send BOOLEAN,
  remaining_seconds INT,
  last_sent_at TIMESTAMPTZ
) AS $$
DECLARE
  last_reset RECORD;
  seconds_since_last INT;
BEGIN
  -- Get the most recent password reset for this email
  SELECT created_at INTO last_reset
  FROM public.password_reset_logs
  WHERE user_email = LOWER(target_email)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF last_reset IS NULL THEN
    RETURN QUERY SELECT true, 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  seconds_since_last := EXTRACT(EPOCH FROM (now() - last_reset.created_at))::INT;
  
  IF seconds_since_last >= cooldown_seconds THEN
    RETURN QUERY SELECT true, 0, last_reset.created_at;
  ELSE
    RETURN QUERY SELECT false, (cooldown_seconds - seconds_since_last), last_reset.created_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_send_password_reset(TEXT, INT) TO authenticated;

-- Comment on table
COMMENT ON TABLE public.password_reset_logs IS 'Tracks password reset requests to prevent spam and provide admin visibility';
COMMENT ON COLUMN public.password_reset_logs.requested_by_admin IS 'True if the reset was requested by an admin on behalf of the user';
COMMENT ON COLUMN public.password_reset_logs.status IS 'Status of the password reset: pending, sent, sent_via_supabase, failed';
