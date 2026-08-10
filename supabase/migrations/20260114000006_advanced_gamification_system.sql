-- ============================================
-- SISTEMA AVANÇADO DE GAMIFICAÇÃO
-- ============================================
-- Sistema completo com conquistas, badges, leaderboard,
-- notificações e eventos
-- Created: 2026-01-14

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE achievement_category AS ENUM (
  'workout',
  'health',
  'challenge',
  'engagement',
  'social',
  'milestone'
);

CREATE TYPE achievement_rarity AS ENUM (
  'common',
  'rare',
  'epic',
  'legendary'
);

CREATE TYPE badge_type AS ENUM (
  'static',
  'animated',
  'special'
);

CREATE TYPE leaderboard_period AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'all_time'
);

-- ============================================
-- ACHIEVEMENTS (CONQUISTAS)
-- ============================================
-- NOTE: Tabela achievements já existe desde 20260101000002_domain_tables.sql
-- A migration 20260114000017_fix_achievements_schema.sql adiciona as colunas faltantes
-- e cria os índices necessários.

-- CREATE TABLE IF NOT EXISTS achievements (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   
--   -- Identification
--   key TEXT NOT NULL UNIQUE, -- ex: "first_workout", "100_workouts"
--   name TEXT NOT NULL,
--   description TEXT NOT NULL,
--   
--   -- Classification
--   category achievement_category NOT NULL,
--   rarity achievement_rarity NOT NULL DEFAULT 'common',
--   
--   -- Requirements
--   condition_type TEXT NOT NULL, -- ex: "workout_count", "streak_days", "weight_lost"
--   condition_value INTEGER NOT NULL, -- ex: 1, 10, 100
--   condition_metadata JSONB DEFAULT '{}', -- extra conditions
--   
--   -- Rewards
--   xp_reward INTEGER NOT NULL DEFAULT 0,
--   badge_id UUID, -- FK to badges (nullable)
--   
--   -- Configuration
--   is_active BOOLEAN DEFAULT true,
--   is_hidden BOOLEAN DEFAULT false, -- secret achievements
--   send_notification BOOLEAN DEFAULT true,
--   
--   -- Display
--   icon TEXT, -- lucide icon name or emoji
--   color TEXT, -- hex color
--   
--   -- Audit
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
-- CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);
-- CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);

-- ============================================
-- BADGES (DISTINTIVOS)
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- Type and display
  badge_type badge_type NOT NULL DEFAULT 'static',
  icon TEXT, -- lucide icon name, emoji, or URL
  icon_url TEXT, -- for custom images
  animation_url TEXT, -- Lottie JSON URL for animated badges
  color TEXT, -- hex color
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);

-- ============================================
-- USER ACHIEVEMENTS (PROGRESSO)
-- ============================================
-- NOTE: Tabela user_achievements já existe desde 20260101000002_domain_tables.sql
-- A migration 20260114000017_fix_achievements_schema.sql adiciona as colunas faltantes
-- e cria os índices necessários.

-- CREATE TABLE IF NOT EXISTS user_achievements (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
--   
--   -- Progress
--   current_progress INTEGER DEFAULT 0,
--   target_progress INTEGER NOT NULL,
--   is_unlocked BOOLEAN DEFAULT false,
--   unlocked_at TIMESTAMPTZ,
--   
--   -- Notification
--   notification_sent BOOLEAN DEFAULT false,
--   
--   -- Metadata
--   metadata JSONB DEFAULT '{}',
--   
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW(),
--   
--   UNIQUE(user_id, achievement_id)
-- );

-- CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);
-- CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON user_achievements(user_id, current_progress);

-- ============================================
-- USER BADGES (BADGES CONQUISTADOS)
-- ============================================

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  
  -- Display
  is_displayed BOOLEAN DEFAULT false, -- show on profile?
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  earned_from TEXT, -- source: "achievement", "manual", "event"
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_displayed ON user_badges(user_id, is_displayed);

-- ============================================
-- LEADERBOARD (RANKING)
-- ============================================

CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores
  total_xp INTEGER NOT NULL DEFAULT 0,
  daily_xp INTEGER NOT NULL DEFAULT 0,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  monthly_xp INTEGER NOT NULL DEFAULT 0,
  
  -- Rankings
  global_rank INTEGER,
  daily_rank INTEGER,
  weekly_rank INTEGER,
  monthly_rank INTEGER,
  
  -- Context (for multi-tenant)
  academy_id UUID, -- FK to academies (nullable)
  
  -- Metadata
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_total_xp ON leaderboard(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_daily_xp ON leaderboard(daily_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_xp ON leaderboard(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_xp ON leaderboard(monthly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_academy ON leaderboard(academy_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);

-- ============================================
-- GAMIFICATION EVENTS (HISTÓRICO)
-- ============================================

CREATE TABLE IF NOT EXISTS gamification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL, -- ex: "workout_completed", "checkin_completed"
  event_data JSONB DEFAULT '{}',
  
  -- Rewards
  xp_gained INTEGER DEFAULT 0,
  achievements_unlocked UUID[], -- array of achievement IDs
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_events_user ON gamification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_events_type ON gamification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_gamification_events_created ON gamification_events(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active achievements"
ON achievements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
ON achievements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active badges"
ON badges FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage badges"
ON badges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- User Achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage user achievements"
ON user_achievements FOR ALL
WITH CHECK (true);

-- User Badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
ON user_badges FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own badge display"
ON user_badges FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can manage user badges"
ON user_badges FOR INSERT
WITH CHECK (true);

-- Leaderboard
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view leaderboard"
ON leaderboard FOR SELECT
USING (true);

CREATE POLICY "System can manage leaderboard"
ON leaderboard FOR ALL
WITH CHECK (true);

-- Gamification Events
ALTER TABLE gamification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
ON gamification_events FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all events"
ON gamification_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert events"
ON gamification_events FOR INSERT
WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_achievements_updated_at ON achievements;
CREATE TRIGGER trg_achievements_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trg_badges_updated_at ON badges;
CREATE TRIGGER trg_badges_updated_at
BEFORE UPDATE ON badges
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trg_user_achievements_updated_at ON user_achievements;
CREATE TRIGGER trg_user_achievements_updated_at
BEFORE UPDATE ON user_achievements
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trg_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER trg_leaderboard_updated_at
BEFORE UPDATE ON leaderboard
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

-- ============================================
-- ADD XP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp INTEGER,
  p_event_type TEXT DEFAULT 'manual',
  p_event_data JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := false;
BEGIN
  -- Get current level
  SELECT level INTO v_old_level
  FROM profiles
  WHERE id = p_user_id;
  
  -- Update profile XP
  UPDATE profiles
  SET 
    xp = xp + p_xp,
    level = FLOOR(POWER((xp + p_xp) / 100.0, 0.5)) + 1,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING level INTO v_new_level;
  
  -- Check if leveled up
  IF v_new_level > v_old_level THEN
    v_level_up := true;
  END IF;
  
  -- Update leaderboard
  INSERT INTO leaderboard (user_id, total_xp, daily_xp, weekly_xp, monthly_xp, last_activity_at)
  VALUES (p_user_id, p_xp, p_xp, p_xp, p_xp, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = leaderboard.total_xp + p_xp,
    daily_xp = leaderboard.daily_xp + p_xp,
    weekly_xp = leaderboard.weekly_xp + p_xp,
    monthly_xp = leaderboard.monthly_xp + p_xp,
    last_activity_at = NOW(),
    updated_at = NOW();
  
  -- Log event
  INSERT INTO gamification_events (user_id, event_type, event_data, xp_gained)
  VALUES (p_user_id, p_event_type, p_event_data, p_xp);
  
  -- Return result
  RETURN jsonb_build_object(
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'xp_gained', p_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CHECK ACHIEVEMENT PROGRESS
-- ============================================

CREATE OR REPLACE FUNCTION check_achievement_progress(
  p_user_id UUID,
  p_achievement_key TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_user_achievement RECORD;
  v_unlocked BOOLEAN := false;
  v_xp_gained INTEGER := 0;
BEGIN
  -- Get achievement
  SELECT * INTO v_achievement
  FROM achievements
  WHERE key = p_achievement_key AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Achievement not found');
  END IF;
  
  -- Get or create user achievement
  INSERT INTO user_achievements (user_id, achievement_id, target_progress, current_progress)
  VALUES (p_user_id, v_achievement.id, v_achievement.condition_value, 0)
  ON CONFLICT (user_id, achievement_id)
  DO NOTHING;
  
  -- Update progress
  UPDATE user_achievements
  SET 
    current_progress = current_progress + p_increment,
    is_unlocked = CASE 
      WHEN current_progress + p_increment >= target_progress THEN true
      ELSE is_unlocked
    END,
    unlocked_at = CASE
      WHEN current_progress + p_increment >= target_progress AND unlocked_at IS NULL 
      THEN NOW()
      ELSE unlocked_at
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id AND achievement_id = v_achievement.id
  RETURNING * INTO v_user_achievement;
  
  -- Check if just unlocked
  IF v_user_achievement.is_unlocked AND v_user_achievement.unlocked_at > NOW() - INTERVAL '1 second' THEN
    v_unlocked := true;
    v_xp_gained := v_achievement.xp_reward;
    
    -- Add XP
    PERFORM add_xp_to_user(
      p_user_id,
      v_achievement.xp_reward,
      'achievement_unlocked',
      jsonb_build_object('achievement_key', p_achievement_key)
    );
    
    -- Award badge if exists
    IF v_achievement.badge_id IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id, earned_from)
      VALUES (p_user_id, v_achievement.badge_id, 'achievement')
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'unlocked', v_unlocked,
    'progress', v_user_achievement.current_progress,
    'target', v_user_achievement.target_progress,
    'xp_gained', v_xp_gained
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REFRESH LEADERBOARD RANKS
-- ============================================

CREATE OR REPLACE FUNCTION refresh_leaderboard_ranks()
RETURNS VOID AS $$
BEGIN
  -- Global ranks
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard l
  SET global_rank = r.rank
  FROM ranked r
  WHERE l.user_id = r.user_id;
  
  -- Daily ranks
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY daily_xp DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard l
  SET daily_rank = r.rank
  FROM ranked r
  WHERE l.user_id = r.user_id;
  
  -- Weekly ranks
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY weekly_xp DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard l
  SET weekly_rank = r.rank
  FROM ranked r
  WHERE l.user_id = r.user_id;
  
  -- Monthly ranks
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY monthly_xp DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard l
  SET monthly_rank = r.rank
  FROM ranked r
  WHERE l.user_id = r.user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RESET PERIODIC XP
-- ============================================

CREATE OR REPLACE FUNCTION reset_daily_xp()
RETURNS VOID AS $$
BEGIN
  UPDATE leaderboard SET daily_xp = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_weekly_xp()
RETURNS VOID AS $$
BEGIN
  UPDATE leaderboard SET weekly_xp = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_monthly_xp()
RETURNS VOID AS $$
BEGIN
  UPDATE leaderboard SET monthly_xp = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DEFAULT ACHIEVEMENTS
-- ============================================
-- NOTE: Seed data movido para migration 20260114000018_seed_gamification_data.sql
-- Isso garante que as colunas sejam criadas antes (migration 017) dos INSERTs

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE achievements IS 'Conquistas disponíveis no sistema';
COMMENT ON TABLE badges IS 'Badges customizáveis pelo admin';
COMMENT ON TABLE user_achievements IS 'Progresso de conquistas por usuário';
COMMENT ON TABLE user_badges IS 'Badges conquistados por usuário';
COMMENT ON TABLE leaderboard IS 'Ranking de usuários por XP';
COMMENT ON TABLE gamification_events IS 'Histórico de eventos de gamificação';

COMMENT ON FUNCTION add_xp_to_user(UUID, INTEGER, TEXT, JSONB) IS 'Adiciona XP ao usuário e atualiza leaderboard';
COMMENT ON FUNCTION check_achievement_progress(UUID, TEXT, INTEGER) IS 'Verifica e atualiza progresso de conquista';
COMMENT ON FUNCTION refresh_leaderboard_ranks() IS 'Recalcula ranks do leaderboard';
