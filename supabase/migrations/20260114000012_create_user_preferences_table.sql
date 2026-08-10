-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
-- Create table for user preferences (theme, PWA, etc)
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Theme preferences
  theme_mode TEXT DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  
  -- PWA preferences
  pwa_install_dismissed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

-- Create RLS policies
CREATE POLICY "Users can view own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON public.user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_pwa_dismissed 
ON public.user_preferences(user_id, pwa_install_dismissed);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.user_preferences IS 
'User preferences for theme, PWA install, and other UI settings';

COMMENT ON COLUMN public.user_preferences.theme_mode IS 
'User preferred theme: light, dark, or system (follows OS)';

COMMENT ON COLUMN public.user_preferences.pwa_install_dismissed IS 
'Tracks if user manually dismissed the PWA install button. If true, button should not appear again.';
