-- ============================================
-- SEED: Gamification Data
-- ============================================
-- Description: Insere dados iniciais de badges e achievements
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260114000017_fix_achievements_schema.sql (colunas devem existir)

-- ============================================
-- INSERT BADGES
-- ============================================

-- Limpar badges anteriores para garantir idempotência (tabela sem unique constraint no name)
DELETE FROM public.badges WHERE name IN ('Iniciante', 'Dedicado', 'Campeão', 'Lenda');

INSERT INTO public.badges (name, description, icon, color, rarity, badge_type) 
VALUES
  ('Iniciante', 'Primeira conquista', 'Star', '#10B981', 'common', 'static'),
  ('Dedicado', 'Conquista de dedicação', 'Zap', '#3B82F6', 'rare', 'static'),
  ('Campeão', 'Conquista épica', 'Trophy', '#F59E0B', 'epic', 'static'),
  ('Lenda', 'Conquista lendária', 'Crown', '#8B5CF6', 'legendary', 'static');

-- ============================================
-- INSERT ACHIEVEMENTS
-- ============================================

INSERT INTO public.achievements (
  key, name, description, category, rarity,
  condition_type, condition_value, xp_reward,
  icon, color, is_active
) VALUES
  -- Workout achievements
  ('first_workout', 'Primeiro Treino', 'Complete seu primeiro treino', 'workout', 'common', 'workout_count', 1, 50, 'Dumbbell', '#8B5CF6', true),
  ('10_workouts', '10 Treinos', 'Complete 10 treinos', 'workout', 'common', 'workout_count', 10, 100, 'Dumbbell', '#8B5CF6', true),
  ('50_workouts', '50 Treinos', 'Complete 50 treinos', 'workout', 'rare', 'workout_count', 50, 500, 'Dumbbell', '#3B82F6', true),
  ('100_workouts', 'Centenário', 'Complete 100 treinos', 'workout', 'epic', 'workout_count', 100, 1000, 'Trophy', '#F59E0B', true),
  ('workout_streak_7', 'Semana Forte', '7 dias consecutivos de treino', 'workout', 'rare', 'workout_streak', 7, 300, 'Flame', '#EF4444', true),
  
  -- Health achievements
  ('first_checkin', 'Primeiro Check-in', 'Faça seu primeiro check-in', 'health', 'common', 'checkin_count', 1, 25, 'Heart', '#EF4444', true),
  ('checkin_streak_7', 'Semana Saudável', '7 dias consecutivos de check-in', 'health', 'rare', 'checkin_streak', 7, 200, 'Heart', '#EF4444', true),
  ('checkin_streak_30', 'Mês Consistente', '30 dias consecutivos de check-in', 'health', 'epic', 'checkin_streak', 30, 1000, 'Heart', '#F59E0B', true),
  ('weight_goal_5kg', 'Transformação 5kg', 'Alcance meta de 5kg', 'health', 'rare', 'weight_change', 5, 500, 'TrendingUp', '#10B981', true),
  
  -- Challenge achievements
  ('first_challenge', 'Desafiador', 'Complete seu primeiro desafio', 'challenge', 'common', 'challenge_count', 1, 75, 'Target', '#F59E0B', true),
  ('10_challenges', 'Competidor', 'Complete 10 desafios', 'challenge', 'rare', 'challenge_count', 10, 500, 'Trophy', '#F59E0B', true),
  ('perfect_challenge', 'Perfeição', 'Complete um desafio sem falhar', 'challenge', 'epic', 'perfect_challenge', 1, 750, 'Medal', '#8B5CF6', true),
  
  -- Engagement achievements
  ('first_week', 'Primeira Semana', 'Uma semana ativa no app', 'engagement', 'common', 'active_days', 7, 100, 'Calendar', '#3B82F6', true),
  ('30_days_active', 'Mês Ativo', '30 dias de atividade', 'engagement', 'rare', 'active_days', 30, 500, 'Calendar', '#3B82F6', true),
  ('level_10', 'Nível 10', 'Alcance o nível 10', 'milestone', 'rare', 'level_reached', 10, 300, 'Star', '#F59E0B', true),
  ('level_25', 'Nível 25', 'Alcance o nível 25', 'milestone', 'epic', 'level_reached', 25, 750, 'Star', '#8B5CF6', true),
  ('level_50', 'Nível 50', 'Alcance o nível 50', 'milestone', 'legendary', 'level_reached', 50, 2000, 'Crown', '#8B5CF6', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.badges IS 
'Badges customizáveis que podem ser associados a achievements';

COMMENT ON TABLE public.achievements IS 
'Conquistas disponíveis no sistema que os usuários podem desbloquear';
