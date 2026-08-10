-- ============================================
-- FIX: Achievements Schema
-- ============================================
-- Description: Adiciona colunas faltantes na tabela achievements
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Fixes: 20260114000006_advanced_gamification_system.sql
-- Problem: Tabela achievements já existia sem as novas colunas

-- ============================================
-- ENUMS (criar se não existirem)
-- ============================================

DO $$
BEGIN
  CREATE TYPE achievement_category AS ENUM (
    'workout',
    'health',
    'challenge',
    'engagement',
    'social',
    'milestone'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE achievement_rarity AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ADD MISSING COLUMNS TO ACHIEVEMENTS
-- ============================================

-- Add updated_at column first to avoid trigger errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add key column (unique identifier)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'key'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN key TEXT;
    -- Populate key from name for existing records
    UPDATE public.achievements SET key = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g')) WHERE key IS NULL;
    -- Make it NOT NULL and UNIQUE after populating
    ALTER TABLE public.achievements ALTER COLUMN key SET NOT NULL;
    ALTER TABLE public.achievements ADD CONSTRAINT achievements_key_unique UNIQUE (key);
  END IF;
END $$;

-- Add category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN category achievement_category DEFAULT 'milestone';
    -- Update default to NOT NULL after adding
    ALTER TABLE public.achievements ALTER COLUMN category SET NOT NULL;
  END IF;
END $$;

-- Add rarity column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'rarity'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN rarity achievement_rarity DEFAULT 'common' NOT NULL;
  END IF;
END $$;

-- Add condition_type column (rename from requirement_type if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'condition_type'
  ) THEN
    -- Check if old column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'achievements' 
        AND column_name = 'requirement_type'
    ) THEN
      ALTER TABLE public.achievements RENAME COLUMN requirement_type TO condition_type;
    ELSE
      ALTER TABLE public.achievements ADD COLUMN condition_type TEXT DEFAULT 'manual' NOT NULL;
    END IF;
  END IF;
END $$;

-- Add condition_value column (rename from requirement_value if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'condition_value'
  ) THEN
    -- Check if old column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'achievements' 
        AND column_name = 'requirement_value'
    ) THEN
      ALTER TABLE public.achievements RENAME COLUMN requirement_value TO condition_value;
    ELSE
      ALTER TABLE public.achievements ADD COLUMN condition_value INTEGER DEFAULT 1 NOT NULL;
    END IF;
  END IF;
END $$;

-- Add condition_metadata column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'condition_metadata'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN condition_metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add badge_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'badge_id'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN badge_id UUID;
  END IF;
END $$;

-- Add is_hidden column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add send_notification column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'send_notification'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN send_notification BOOLEAN DEFAULT true;
  END IF;
END $$;


-- Remove old requirement column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'achievements' 
      AND column_name = 'requirement'
  ) THEN
    ALTER TABLE public.achievements DROP COLUMN requirement;
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES (IF NOT EXISTS)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON public.achievements(key);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON public.achievements(rarity);

-- ============================================
-- CREATE TRIGGER FOR updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_achievements_updated_at ON public.achievements;

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIX USER_ACHIEVEMENTS TABLE
-- ============================================
-- NOTE: Tabela user_achievements já existe desde 20260101000002_domain_tables.sql
-- Precisa adicionar colunas faltantes

-- Add updated_at column first to avoid trigger errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add current_progress column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'current_progress'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN current_progress INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add target_progress column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'target_progress'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN target_progress INTEGER DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add is_unlocked column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'is_unlocked'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN is_unlocked BOOLEAN DEFAULT false;
    -- Mark existing achievements as unlocked (they have earned_at)
    UPDATE public.user_achievements SET is_unlocked = true WHERE earned_at IS NOT NULL;
  END IF;
END $$;

-- Add unlocked_at column (rename from earned_at if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'unlocked_at'
  ) THEN
    -- Check if old column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_achievements' 
        AND column_name = 'earned_at'
    ) THEN
      ALTER TABLE public.user_achievements RENAME COLUMN earned_at TO unlocked_at;
    ELSE
      ALTER TABLE public.user_achievements ADD COLUMN unlocked_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Add notification_sent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'notification_sent'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN notification_sent BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add metadata column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add created_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_achievements' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_achievements ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;


-- Create indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(user_id, is_unlocked);
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON public.user_achievements(user_id, current_progress);

-- Create trigger for user_achievements updated_at
DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON public.user_achievements;

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_id_achievement_id_key'
  ) THEN
    ALTER TABLE public.user_achievements 
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
    UNIQUE (user_id, achievement_id);
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.achievements IS 
'Achievements (conquistas) that users can unlock by completing specific actions or reaching milestones';

COMMENT ON COLUMN public.achievements.key IS 
'Unique identifier for the achievement (e.g., "first_workout", "100_workouts")';

COMMENT ON COLUMN public.achievements.category IS 
'Category of the achievement: workout, health, challenge, engagement, social, or milestone';

COMMENT ON COLUMN public.achievements.rarity IS 
'Rarity level: common, rare, epic, or legendary';

COMMENT ON COLUMN public.achievements.condition_type IS 
'Type of condition to unlock (e.g., "workout_count", "streak_days", "weight_lost")';

COMMENT ON COLUMN public.achievements.condition_value IS 
'Target value for the condition (e.g., 1, 10, 100)';

COMMENT ON COLUMN public.achievements.condition_metadata IS 
'Additional metadata for complex conditions (JSON)';

COMMENT ON COLUMN public.achievements.badge_id IS 
'Optional badge awarded when achievement is unlocked';

COMMENT ON COLUMN public.achievements.is_hidden IS 
'Whether this is a secret achievement (hidden until unlocked)';

COMMENT ON COLUMN public.achievements.send_notification IS 
'Whether to send a push notification when unlocked';

COMMENT ON TABLE public.user_achievements IS 
'Tracks user progress and unlocked achievements';

COMMENT ON COLUMN public.user_achievements.current_progress IS 
'Current progress towards unlocking the achievement';

COMMENT ON COLUMN public.user_achievements.target_progress IS 
'Target progress needed to unlock the achievement';

COMMENT ON COLUMN public.user_achievements.is_unlocked IS 
'Whether the achievement has been unlocked';

COMMENT ON COLUMN public.user_achievements.unlocked_at IS 
'Timestamp when the achievement was unlocked';

COMMENT ON COLUMN public.user_achievements.notification_sent IS 
'Whether a notification was sent when unlocked';
