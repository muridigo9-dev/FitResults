-- =====================================================
-- SEED DATA (Dados Iniciais)
-- =====================================================
-- NOTA: app_settings seed já está em 20260101000009_app_settings.sql
-- Este arquivo contém outros seeds que dependem de tabelas já criadas

-- Níveis padrão (usando colunas reais: level_number, name, min_xp, max_xp, color)
INSERT INTO public.levels (level_number, name, min_xp, max_xp, color) VALUES
  (1, 'Iniciante', 0, 99, '#10b981'),
  (2, 'Aprendiz', 100, 299, '#22c55e'),
  (3, 'Praticante', 300, 599, '#3b82f6'),
  (4, 'Dedicado', 600, 999, '#6366f1'),
  (5, 'Atleta', 1000, 1499, '#8b5cf6'),
  (6, 'Veterano', 1500, 2099, '#a855f7'),
  (7, 'Elite', 2100, 2799, '#d946ef'),
  (8, 'Mestre', 2800, 3599, '#ec4899'),
  (9, 'Campeão', 3600, 4499, '#f43f5e'),
  (10, 'Lenda', 4500, 999999, '#eab308')
ON CONFLICT DO NOTHING;

-- Conquistas padrão (usando colunas reais: name, description, icon, xp_reward, requirement_type, requirement_value)
INSERT INTO public.achievements (name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
  ('Primeiro Check-in', 'Complete seu primeiro check-in diário', 'star', 10, 'checkin_count', 1),
  ('Semana Perfeita', 'Complete 7 dias seguidos de check-in', 'flame', 50, 'streak_days', 7),
  ('Mês Dedicado', 'Complete 30 dias seguidos de check-in', 'trophy', 200, 'streak_days', 30),
  ('Primeiro Treino', 'Complete seu primeiro treino', 'dumbbell', 15, 'workout_count', 1),
  ('Mestre da Hidratação', 'Atinja sua meta de água 7 dias seguidos', 'droplet', 30, 'water_streak', 7),
  ('Desafiante', 'Complete seu primeiro desafio', 'medal', 100, 'challenge_count', 1)
ON CONFLICT DO NOTHING;

-- Hábitos padrão (usando colunas reais: name, icon, color, unit, default_goal, display_order)
INSERT INTO public.habits (name, icon, color, unit, default_goal, display_order) VALUES
  ('Beber água', 'droplet', '#3b82f6', 'ml', 2000, 1),
  ('Dormir 8h', 'moon', '#6366f1', 'horas', 8, 2),
  ('Meditar', 'brain', '#8b5cf6', 'minutos', 10, 3),
  ('Ler', 'book', '#22c55e', 'minutos', 15, 4),
  ('Exercitar', 'dumbbell', '#ef4444', 'minutos', 30, 5),
  ('Comer saudável', 'apple', '#10b981', 'refeições', 3, 6)
ON CONFLICT DO NOTHING;
