-- ============================================
-- BRAND SETTINGS EXTENDED FOR WHITE LABEL
-- ============================================
-- Extends brand_settings with light/dark theme support

-- Add light/dark theme columns to brand_settings
ALTER TABLE brand_settings
ADD COLUMN IF NOT EXISTS dark_primary_color TEXT,
ADD COLUMN IF NOT EXISTS dark_secondary_color TEXT,
ADD COLUMN IF NOT EXISTS dark_tertiary_color TEXT,
ADD COLUMN IF NOT EXISTS dark_quaternary_color TEXT,
ADD COLUMN IF NOT EXISTS dark_accent_color TEXT,
ADD COLUMN IF NOT EXISTS dark_text_primary TEXT,
ADD COLUMN IF NOT EXISTS dark_text_secondary TEXT,
ADD COLUMN IF NOT EXISTS dark_text_muted TEXT,
ADD COLUMN IF NOT EXISTS dark_background TEXT,
ADD COLUMN IF NOT EXISTS dark_surface TEXT,
ADD COLUMN IF NOT EXISTS dark_surface_elevated TEXT,
ADD COLUMN IF NOT EXISTS light_background TEXT,
ADD COLUMN IF NOT EXISTS light_surface TEXT,
ADD COLUMN IF NOT EXISTS light_surface_elevated TEXT;

-- Add Stripe configuration columns
ALTER TABLE brand_settings
ADD COLUMN IF NOT EXISTS stripe_secret_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS stripe_connection_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS stripe_last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test';

-- ============================================
-- HABITS TABLE FOR ADMIN AND USERS
-- ============================================

-- Create habits table if not exists
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Target',
  color TEXT DEFAULT 'water',
  unit TEXT NOT NULL,
  default_goal NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  external_id TEXT UNIQUE,
  content_origin TEXT DEFAULT 'system' CHECK (content_origin IN ('system', 'user')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY "Admins can manage habits" ON habits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can read system habits
CREATE POLICY "Users can view system habits" ON habits
  FOR SELECT TO authenticated
  USING (content_origin = 'system' AND is_active = true);

-- Users can manage their own habits
CREATE POLICY "Users can manage own habits" ON habits
  FOR ALL TO authenticated
  USING (
    content_origin = 'user' AND created_by = auth.uid()
  )
  WITH CHECK (
    content_origin = 'user' AND created_by = auth.uid()
  );

-- ============================================
-- USER HABITS (Personal habits)
-- ============================================

CREATE TABLE IF NOT EXISTS user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  custom_goal NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id)
);

ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own user_habits" ON user_habits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- USER PREFERENCES (Theme preference)
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme_mode TEXT DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_habits_content_origin ON habits(content_origin);
CREATE INDEX IF NOT EXISTS idx_habits_created_by ON habits(created_by);
CREATE INDEX IF NOT EXISTS idx_habits_is_active ON habits(is_active);
CREATE INDEX IF NOT EXISTS idx_user_habits_user_id ON user_habits(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS habits_updated_at ON habits;
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_habits_updated_at ON user_habits;
CREATE TRIGGER user_habits_updated_at
  BEFORE UPDATE ON user_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
