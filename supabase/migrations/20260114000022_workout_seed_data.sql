-- ============================================
-- SEED DATA PARA SISTEMA DE TREINOS
-- ============================================
-- Dados iniciais para:
-- - Atualização de muscle_groups com slugs
-- - Exercícios base (globais)
-- - Feature flags
-- Created: 2026-01-14

-- ============================================
-- 1. ATUALIZAR MUSCLE GROUPS COM SLUGS
-- ============================================

UPDATE public.muscle_groups SET slug = 'peito', category = 'upper' WHERE name = 'Peito' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'costas', category = 'upper' WHERE name = 'Costas' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'ombros', category = 'upper' WHERE name = 'Ombros' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'biceps', category = 'upper' WHERE name = 'Bíceps' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'triceps', category = 'upper' WHERE name = 'Tríceps' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'antebraco', category = 'upper' WHERE name = 'Antebraço' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'quadriceps', category = 'lower' WHERE name = 'Quadríceps' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'posterior', category = 'lower' WHERE name = 'Posterior' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'gluteos', category = 'lower' WHERE name = 'Glúteos' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'panturrilha', category = 'lower' WHERE name = 'Panturrilha' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'abdomen', category = 'core' WHERE name = 'Abdômen' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'lombar', category = 'core' WHERE name = 'Lombar' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'core', category = 'core' WHERE name = 'Core' AND slug IS NULL;
UPDATE public.muscle_groups SET slug = 'corpo-inteiro', category = 'full' WHERE name = 'Corpo Inteiro' AND slug IS NULL;

-- ============================================
-- 2. EXERCÍCIOS BASE (PEITO)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Supino Reto com Barra',
  'supino-reto-barra',
  'Exercício fundamental para desenvolvimento do peitoral',
  'Deite no banco, segure a barra com pegada um pouco mais larga que os ombros. Desça a barra controladamente até o peito e empurre de volta.',
  mg.id,
  'barbell',
  'intermediate',
  4,
  '8',
  90,
  true,
  ARRAY['peito', 'composto', 'força']
FROM public.muscle_groups mg WHERE mg.slug = 'peito'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Supino Inclinado com Halteres',
  'supino-inclinado-halteres',
  'Foco na parte superior do peitoral',
  'Ajuste o banco em 30-45 graus. Segure os halteres e empurre para cima, juntando-os no topo do movimento.',
  mg.id,
  'dumbbell',
  'intermediate',
  4,
  '10',
  60,
  true,
  ARRAY['peito', 'composto', 'superior']
FROM public.muscle_groups mg WHERE mg.slug = 'peito'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Crucifixo na Máquina',
  'crucifixo-maquina',
  'Isolamento para peitoral',
  'Sente-se na máquina com as costas apoiadas. Traga os braços para frente em um movimento de abraço.',
  mg.id,
  'machine',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['peito', 'isolamento']
FROM public.muscle_groups mg WHERE mg.slug = 'peito'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Flexão de Braços',
  'flexao-bracos',
  'Exercício clássico de peso corporal para peito',
  'Posicione as mãos um pouco mais largas que os ombros. Desça o corpo mantendo-o reto e empurre de volta.',
  mg.id,
  'bodyweight',
  'beginner',
  3,
  '15',
  45,
  true,
  ARRAY['peito', 'peso-corporal', 'composto']
FROM public.muscle_groups mg WHERE mg.slug = 'peito'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Crossover no Cabo',
  'crossover-cabo',
  'Isolamento para definição do peitoral',
  'Posicione-se entre as polias altas. Traga os cabos para baixo e para frente em um movimento cruzado.',
  mg.id,
  'cable',
  'intermediate',
  3,
  '12',
  45,
  false,
  ARRAY['peito', 'isolamento', 'definição']
FROM public.muscle_groups mg WHERE mg.slug = 'peito'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. EXERCÍCIOS BASE (COSTAS)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Puxada Frontal',
  'puxada-frontal',
  'Exercício fundamental para largura das costas',
  'Segure a barra com pegada aberta. Puxe a barra até a altura do queixo, contraindo as escápulas.',
  mg.id,
  'cable',
  'beginner',
  4,
  '10',
  60,
  true,
  ARRAY['costas', 'composto', 'largura']
FROM public.muscle_groups mg WHERE mg.slug = 'costas'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Remada Curvada',
  'remada-curvada',
  'Exercício para espessura das costas',
  'Incline o tronco para frente, segure a barra e puxe em direção ao abdômen.',
  mg.id,
  'barbell',
  'intermediate',
  4,
  '8',
  90,
  true,
  ARRAY['costas', 'composto', 'espessura']
FROM public.muscle_groups mg WHERE mg.slug = 'costas'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Remada Unilateral com Halter',
  'remada-unilateral-halter',
  'Trabalho unilateral para equilíbrio muscular',
  'Apoie uma mão e joelho no banco. Puxe o halter em direção ao quadril.',
  mg.id,
  'dumbbell',
  'beginner',
  3,
  '10',
  45,
  true,
  ARRAY['costas', 'unilateral', 'composto']
FROM public.muscle_groups mg WHERE mg.slug = 'costas'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Barra Fixa',
  'barra-fixa',
  'Exercício clássico de peso corporal para costas',
  'Pendure-se na barra com pegada pronada. Puxe o corpo até o queixo ultrapassar a barra.',
  mg.id,
  'bodyweight',
  'advanced',
  3,
  '6',
  90,
  true,
  ARRAY['costas', 'peso-corporal', 'força']
FROM public.muscle_groups mg WHERE mg.slug = 'costas'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Pulldown com Triângulo',
  'pulldown-triangulo',
  'Foco na parte inferior do latíssimo',
  'Use o acessório triângulo na polia alta. Puxe em direção ao peito.',
  mg.id,
  'cable',
  'beginner',
  3,
  '12',
  45,
  true,
  ARRAY['costas', 'isolamento']
FROM public.muscle_groups mg WHERE mg.slug = 'costas'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 4. EXERCÍCIOS BASE (OMBROS)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Desenvolvimento com Halteres',
  'desenvolvimento-halteres',
  'Exercício fundamental para ombros',
  'Sentado ou em pé, segure os halteres na altura dos ombros e empurre para cima.',
  mg.id,
  'dumbbell',
  'intermediate',
  4,
  '82',
  60,
  true,
  ARRAY['ombros', 'composto']
FROM public.muscle_groups mg WHERE mg.slug = 'ombros'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Elevação Lateral',
  'elevacao-lateral',
  'Isolamento para deltóide lateral',
  'Em pé, eleve os halteres lateralmente até a altura dos ombros.',
  mg.id,
  'dumbbell',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['ombros', 'isolamento', 'lateral']
FROM public.muscle_groups mg WHERE mg.slug = 'ombros'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Elevação Frontal',
  'elevacao-frontal',
  'Isolamento para deltóide anterior',
  'Em pé, eleve os halteres à frente até a altura dos ombros.',
  mg.id,
  'dumbbell',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['ombros', 'isolamento', 'frontal']
FROM public.muscle_groups mg WHERE mg.slug = 'ombros'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Crucifixo Inverso',
  'crucifixo-inverso',
  'Isolamento para deltóide posterior',
  'Incline o tronco para frente ou use a máquina. Abra os braços lateralmente.',
  mg.id,
  'dumbbell',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['ombros', 'isolamento', 'posterior']
FROM public.muscle_groups mg WHERE mg.slug = 'ombros'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. EXERCÍCIOS BASE (PERNAS)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Agachamento Livre',
  'agachamento-livre',
  'Rei dos exercícios para pernas',
  'Posicione a barra nos trapézios. Desça flexionando os joelhos e quadris, mantendo as costas retas.',
  mg.id,
  'barbell',
  'advanced',
  4,
  '6',
  120,
  true,
  ARRAY['pernas', 'composto', 'força']
FROM public.muscle_groups mg WHERE mg.slug = 'quadriceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Leg Press 45°',
  'leg-press-45',
  'Exercício seguro para desenvolvimento de pernas',
  'Posicione os pés na plataforma. Desça controladamente e empurre de volta.',
  mg.id,
  'machine',
  'beginner',
  4,
  '10',
  90,
  true,
  ARRAY['pernas', 'composto', 'máquina']
FROM public.muscle_groups mg WHERE mg.slug = 'quadriceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Cadeira Extensora',
  'cadeira-extensora',
  'Isolamento para quadríceps',
  'Sente-se na máquina e estenda as pernas completamente.',
  mg.id,
  'machine',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['pernas', 'isolamento', 'quadríceps']
FROM public.muscle_groups mg WHERE mg.slug = 'quadriceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Mesa Flexora',
  'mesa-flexora',
  'Isolamento para posterior de coxa',
  'Deite na máquina e flexione as pernas, trazendo os calcanhares em direção aos glúteos.',
  mg.id,
  'machine',
  'beginner',
  3,
  '12',
  45,
  false,
  ARRAY['pernas', 'isolamento', 'posterior']
FROM public.muscle_groups mg WHERE mg.slug = 'posterior'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Stiff',
  'stiff',
  'Exercício para posterior e glúteos',
  'Segure a barra ou halteres. Desça o tronco mantendo as pernas semi-estendidas.',
  mg.id,
  'barbell',
  'intermediate',
  3,
  '10',
  60,
  true,
  ARRAY['pernas', 'composto', 'posterior', 'glúteos']
FROM public.muscle_groups mg WHERE mg.slug = 'posterior'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Panturrilha em Pé',
  'panturrilha-pe',
  'Exercício para panturrilhas',
  'Posicione-se na máquina com os ombros sob os apoios. Eleve os calcanhares o máximo possível.',
  mg.id,
  'machine',
  'beginner',
  4,
  '15',
  45,
  false,
  ARRAY['pernas', 'isolamento', 'panturrilha']
FROM public.muscle_groups mg WHERE mg.slug = 'panturrilha'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 6. EXERCÍCIOS BASE (BRAÇOS)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Rosca Direta com Barra',
  'rosca-direta-barra',
  'Exercício clássico para bíceps',
  'Em pé, segure a barra com pegada supinada. Flexione os cotovelos trazendo a barra até os ombros.',
  mg.id,
  'barbell',
  'beginner',
  3,
  '10',
  60,
  false,
  ARRAY['bíceps', 'isolamento']
FROM public.muscle_groups mg WHERE mg.slug = 'biceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Rosca Alternada com Halteres',
  'rosca-alternada-halteres',
  'Trabalho unilateral para bíceps',
  'Em pé, alterne a flexão de cada braço com rotação do punho.',
  mg.id,
  'dumbbell',
  'beginner',
  3,
  '10',
  45,
  false,
  ARRAY['bíceps', 'unilateral']
FROM public.muscle_groups mg WHERE mg.slug = 'biceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Rosca Scott',
  'rosca-scott',
  'Isolamento máximo para bíceps',
  'Apoie os braços no banco Scott e flexione os cotovelos.',
  mg.id,
  'barbell',
  'intermediate',
  3,
  '10-12',
  45,
  false,
  ARRAY['bíceps', 'isolamento', 'scott']
FROM public.muscle_groups mg WHERE mg.slug = 'biceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Tríceps Pulley',
  'triceps-pulley',
  'Exercício clássico para tríceps',
  'Na polia alta, empurre a barra para baixo estendendo os cotovelos.',
  mg.id,
  'cable',
  'beginner',
  3,
  '12-15',
  45,
  false,
  ARRAY['tríceps', 'isolamento']
FROM public.muscle_groups mg WHERE mg.slug = 'triceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Tríceps Francês',
  'triceps-frances',
  'Exercício para cabeça longa do tríceps',
  'Deitado ou sentado, estenda os braços acima da cabeça e flexione os cotovelos.',
  mg.id,
  'dumbbell',
  'intermediate',
  3,
  '10-12',
  45,
  false,
  ARRAY['tríceps', 'isolamento', 'cabeça-longa']
FROM public.muscle_groups mg WHERE mg.slug = 'triceps'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Mergulho em Paralelas',
  'mergulho-paralelas',
  'Exercício composto para tríceps e peito',
  'Apoie-se nas paralelas e desça o corpo flexionando os cotovelos.',
  mg.id,
  'bodyweight',
  'intermediate',
  3,
  '8-12',
  60,
  true,
  ARRAY['tríceps', 'composto', 'peso-corporal']
FROM public.muscle_groups mg WHERE mg.slug = 'triceps'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 7. EXERCÍCIOS BASE (CORE)
-- ============================================

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Abdominal Crunch',
  'abdominal-crunch',
  'Exercício básico para abdômen',
  'Deitado, eleve os ombros do chão contraindo o abdômen.',
  mg.id,
  'bodyweight',
  'beginner',
  3,
  '15-20',
  30,
  false,
  ARRAY['abdômen', 'isolamento']
FROM public.muscle_groups mg WHERE mg.slug = 'abdomen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Prancha Frontal',
  'prancha-frontal',
  'Exercício isométrico para core',
  'Apoie-se nos antebraços e pontas dos pés. Mantenha o corpo reto.',
  mg.id,
  'bodyweight',
  'beginner',
  3,
  '30-60s',
  45,
  false,
  ARRAY['core', 'isométrico']
FROM public.muscle_groups mg WHERE mg.slug = 'core'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Elevação de Pernas',
  'elevacao-pernas',
  'Exercício para abdômen inferior',
  'Deitado ou pendurado, eleve as pernas mantendo-as estendidas.',
  mg.id,
  'bodyweight',
  'intermediate',
  3,
  '12-15',
  45,
  false,
  ARRAY['abdômen', 'inferior']
FROM public.muscle_groups mg WHERE mg.slug = 'abdomen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.exercises (name, slug, description, instructions, primary_muscle_group_id, equipment, difficulty, default_sets, default_reps, default_rest_seconds, is_compound, tags)
SELECT 
  'Russian Twist',
  'russian-twist',
  'Exercício para oblíquos',
  'Sentado com os pés elevados, gire o tronco de um lado para o outro.',
  mg.id,
  'bodyweight',
  'intermediate',
  3,
  '20-30',
  45,
  false,
  ARRAY['abdômen', 'oblíquos', 'rotação']
FROM public.muscle_groups mg WHERE mg.slug = 'abdomen'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 8. FEATURE FLAGS
-- ============================================

INSERT INTO public.feature_flags (key, enabled, description, affects)
VALUES 
  ('workout_execution_enabled', true, 'Habilita sistema de execução guiada de treinos', '["workouts"]'::jsonb),
  ('workout_series_enabled', true, 'Habilita séries semanais (A, B, C) nos treinos', '["workouts"]'::jsonb),
  ('exercise_feedback_enabled', true, 'Habilita feedback por exercício durante treino', '["workouts", "feedback"]'::jsonb),
  ('rest_timer_enabled', true, 'Habilita timer de descanso entre séries', '["workouts"]'::jsonb),
  ('workout_gamification_enabled', true, 'Habilita XP e conquistas em treinos', '["workouts", "gamification"]'::jsonb),
  ('academy_workout_dashboard_enabled', true, 'Habilita dashboard de treinos para academias', '["workouts", "academy"]'::jsonb),
  ('user_workout_creation_enabled', false, 'Permite usuários criarem próprios treinos', '["workouts", "user_content"]'::jsonb),
  ('workout_streaks_enabled', true, 'Habilita sistema de sequências de treino', '["workouts", "gamification"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 9. ACHIEVEMENTS PARA TREINOS
-- ============================================

INSERT INTO public.achievements (key, name, description, category, rarity, condition_type, condition_value, xp_reward, icon, color, is_active)
VALUES
  ('first_workout_session', 'Primeiro Treino', 'Complete sua primeira sessão de treino', 'workout', 'common', 'workout_sessions', 1, 50, 'Dumbbell', '#10B981', true),
  ('10_workout_sessions', 'Dedicado', 'Complete 10 sessões de treino', 'workout', 'common', 'workout_sessions', 10, 100, 'Target', '#3B82F6', true),
  ('50_workout_sessions', 'Atleta', 'Complete 50 sessões de treino', 'workout', 'rare', 'workout_sessions', 50, 250, 'Medal', '#8B5CF6', true),
  ('100_workout_sessions', 'Lenda', 'Complete 100 sessões de treino', 'workout', 'epic', 'workout_sessions', 100, 500, 'Trophy', '#F59E0B', true),
  ('3_day_streak', 'Consistente', 'Treine 3 dias seguidos', 'workout', 'common', 'workout_streak', 3, 75, 'Flame', '#EF4444', true),
  ('7_day_streak', 'Imparável', 'Treine 7 dias seguidos', 'workout', 'rare', 'workout_streak', 7, 150, 'Zap', '#F97316', true),
  ('30_day_streak', 'Máquina', 'Treine 30 dias seguidos', 'workout', 'legendary', 'workout_streak', 30, 1000, 'Crown', '#FFD700', true),
  ('complete_all_exercises', 'Completista', 'Complete todos os exercícios de um treino', 'workout', 'common', 'workout_completion', 100, 25, 'CheckCircle', '#22C55E', true),
  ('give_feedback', 'Comunicativo', 'Dê feedback em 10 exercícios', 'engagement', 'common', 'exercise_feedback', 10, 50, 'MessageSquare', '#6366F1', true),
  ('early_bird', 'Madrugador', 'Treine antes das 7h', 'workout', 'rare', 'early_workout', 1, 100, 'Sunrise', '#FBBF24', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 10. COMMENTS
-- ============================================

COMMENT ON TABLE public.exercises IS 'Base de exercícios globais do sistema';
