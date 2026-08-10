-- ============================================
-- SISTEMA AVANÇADO DE TREINOS E EXERCÍCIOS
-- ============================================
-- Evolução completa do sistema de treinos com:
-- - Grupos musculares com imagens/GIFs
-- - Exercícios independentes e reutilizáveis
-- - Séries semanais (A, B, C...)
-- - Tracking de execução por aluno
-- - Feedback por exercício e treino
-- - Multi-tenant (academia/personal)
-- Created: 2026-01-14

-- ============================================
-- 1. ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE workout_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_equipment AS ENUM (
    'none',           -- Sem equipamento (peso corporal)
    'dumbbell',       -- Halteres
    'barbell',        -- Barra
    'cable',          -- Cabo/Polia
    'machine',        -- Máquina
    'kettlebell',     -- Kettlebell
    'resistance_band',-- Elástico
    'bodyweight',     -- Peso corporal
    'smith_machine',  -- Smith Machine
    'trx',            -- TRX/Suspensão
    'medicine_ball',  -- Medicine Ball
    'foam_roller',    -- Foam Roller
    'other'           -- Outro
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_feedback_mood AS ENUM (
    'very_easy',      -- Muito fácil
    'easy',           -- Fácil
    'moderate',       -- Ok/Moderado
    'hard',           -- Difícil
    'very_hard'       -- Muito difícil
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workout_session_status AS ENUM (
    'in_progress',    -- Em andamento
    'paused',         -- Pausado
    'completed',      -- Concluído
    'abandoned'       -- Abandonado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_creator_type AS ENUM (
    'admin',    -- Admin (global)
    'academy',        -- Academia
    'personal',       -- Personal Trainer
    'user'            -- Usuário (conteúdo próprio)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. MUSCLE GROUPS (GRUPOS MUSCULARES)
-- ============================================

-- Garantir que a tabela base existe (correção para migrações fora de sincronia)
CREATE TABLE IF NOT EXISTS public.muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  category TEXT CHECK (category IN ('upper', 'lower', 'core', 'full')),
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Seed básico se estiver vazia
INSERT INTO public.muscle_groups (name, name_en, category, sort_order) 
SELECT name, name_en, category, sort_order FROM (
  VALUES 
    ('Peito', 'Chest', 'upper', 1),
    ('Costas', 'Back', 'upper', 2),
    ('Ombros', 'Shoulders', 'upper', 3),
    ('Bíceps', 'Biceps', 'upper', 4),
    ('Tríceps', 'Triceps', 'upper', 5),
    ('Antebraço', 'Forearm', 'upper', 6),
    ('Quadríceps', 'Quadriceps', 'lower', 7),
    ('Posterior', 'Hamstrings', 'lower', 8),
    ('Glúteos', 'Glutes', 'lower', 9),
    ('Panturrilha', 'Calves', 'lower', 10),
    ('Abdômen', 'Abs', 'core', 11),
    ('Lombar', 'Lower Back', 'core', 12),
    ('Core', 'Core', 'core', 13),
    ('Corpo Inteiro', 'Full Body', 'full', 14)
) AS v(name, name_en, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.muscle_groups)
ON CONFLICT (name) DO NOTHING;

-- Evolução da tabela existente

-- Adicionar colunas se não existirem
DO $$ BEGIN
  ALTER TABLE public.muscle_groups 
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS gif_url TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_by_type content_creator_type DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS academy_id UUID,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- Criar slug para registros existentes
UPDATE public.muscle_groups 
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), 'ç', 'c'))
WHERE slug IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_muscle_groups_slug ON public.muscle_groups(slug);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_category ON public.muscle_groups(category);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_active ON public.muscle_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_academy ON public.muscle_groups(academy_id);

-- RLS
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active muscle groups" ON public.muscle_groups;
CREATE POLICY "Everyone can view active muscle groups"
ON public.muscle_groups FOR SELECT
USING (
  is_active = true
  AND (
    created_by_type = 'admin'
    OR created_by_id = auth.uid()
    OR academy_id = ANY(public.get_user_academy_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins can manage muscle groups" ON public.muscle_groups;
CREATE POLICY "Admins can manage muscle groups"
ON public.muscle_groups FOR ALL
USING (
  public.is_admin()
  OR (created_by_type = 'academy' AND academy_id = ANY(public.get_user_academy_ids(auth.uid())))
  OR (created_by_type = 'personal' AND created_by_id = auth.uid())
);

-- ============================================
-- 3. EXERCISES (EXERCÍCIOS INDEPENDENTES)
-- ============================================

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  instructions TEXT,
  
  -- Mídia
  image_url TEXT,
  gif_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Classificação
  primary_muscle_group_id UUID REFERENCES public.muscle_groups(id),
  equipment exercise_equipment DEFAULT 'none',
  difficulty workout_difficulty DEFAULT 'intermediate',
  
  -- Parâmetros padrão
  default_sets INTEGER DEFAULT 3,
  default_reps TEXT DEFAULT '12',  -- Pode ser "12", "8-12", "até falha"
  default_rest_seconds INTEGER DEFAULT 60,
  default_tempo TEXT,              -- Ex: "3-1-2-0" (eccentric-pause-concentric-pause)
  
  -- Multi-tenant
  created_by_type content_creator_type DEFAULT 'admin',
  created_by_id UUID REFERENCES auth.users(id),
  academy_id UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_compound BOOLEAN DEFAULT false,  -- Exercício composto?
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON public.exercises(primary_muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON public.exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_academy ON public.exercises(academy_id);
CREATE INDEX IF NOT EXISTS idx_exercises_creator ON public.exercises(created_by_type, created_by_id);

-- RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active exercises" ON public.exercises;
CREATE POLICY "Everyone can view active exercises"
ON public.exercises FOR SELECT
USING (
  is_active = true
  AND (
    created_by_type = 'admin'
    OR created_by_id = auth.uid()
    OR academy_id = ANY(public.get_user_academy_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins and trainers can manage exercises" ON public.exercises;
CREATE POLICY "Admins and trainers can manage exercises"
ON public.exercises FOR ALL
USING (
  public.is_admin()
  OR (created_by_type = 'academy' AND public.is_academy_admin(auth.uid(), academy_id))
  OR (created_by_type = 'personal' AND created_by_id = auth.uid())
  OR (created_by_type = 'user' AND created_by_id = auth.uid())
);

-- ============================================
-- 4. EXERCISE SECONDARY MUSCLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.exercise_secondary_muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
  involvement_level INTEGER DEFAULT 50 CHECK (involvement_level BETWEEN 1 AND 100),
  UNIQUE(exercise_id, muscle_group_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_secondary_muscles_exercise ON public.exercise_secondary_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_secondary_muscles_muscle ON public.exercise_secondary_muscles(muscle_group_id);

-- ============================================
-- 5. WORKOUT SERIES (SÉRIES SEMANAIS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workout_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,                     -- Ex: "Série A", "Série B"
  code TEXT NOT NULL,                     -- Ex: "A", "B", "C"
  description TEXT,
  
  -- Vínculo com treino principal
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  
  -- Dias da semana (0=Dom, 1=Seg, ..., 6=Sab)
  scheduled_days INTEGER[] DEFAULT '{}',  -- Ex: {1, 4} = Segunda e Quinta
  
  -- Ordem
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workout_id, code)
);

CREATE INDEX IF NOT EXISTS idx_workout_series_workout ON public.workout_series(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_series_active ON public.workout_series(is_active);

-- RLS
ALTER TABLE public.workout_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workout series" ON public.workout_series;
CREATE POLICY "Users can view workout series"
ON public.workout_series FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workouts w 
    WHERE w.id = workout_id AND w.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can manage workout series" ON public.workout_series;
CREATE POLICY "Admins can manage workout series"
ON public.workout_series FOR ALL
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.workouts w 
    WHERE w.id = workout_id AND w.created_by = auth.uid()
  )
);

-- ============================================
-- 6. SERIES EXERCISES (EXERCÍCIOS DA SÉRIE)
-- ============================================

CREATE TABLE IF NOT EXISTS public.series_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculos
  series_id UUID NOT NULL REFERENCES public.workout_series(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  
  -- Parâmetros específicos desta série
  sets INTEGER,
  reps TEXT,                              -- "12", "8-12", "até falha"
  rest_seconds INTEGER,
  tempo TEXT,
  load_suggestion TEXT,                   -- "60% 1RM", "20kg", "moderado"
  
  -- Instruções específicas
  notes TEXT,
  
  -- Ordem
  display_order INTEGER DEFAULT 0,
  
  -- Superset/Circuit
  superset_group TEXT,                    -- Exercícios com mesmo grupo são superset
  is_dropset BOOLEAN DEFAULT false,
  is_rest_pause BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(series_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_series_exercises_series ON public.series_exercises(series_id);
CREATE INDEX IF NOT EXISTS idx_series_exercises_exercise ON public.series_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_series_exercises_order ON public.series_exercises(series_id, display_order);

-- RLS (herda da série)
ALTER TABLE public.series_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view series exercises" ON public.series_exercises;
CREATE POLICY "Users can view series exercises"
ON public.series_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workout_series ws 
    WHERE ws.id = series_id AND ws.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can manage series exercises" ON public.series_exercises;
CREATE POLICY "Admins can manage series exercises"
ON public.series_exercises FOR ALL
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.workout_series ws
    JOIN public.workouts w ON w.id = ws.workout_id
    WHERE ws.id = series_id AND w.created_by = auth.uid()
  )
);

-- ============================================
-- 7. WORKOUT SESSIONS (SESSÕES DE TREINO)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem está treinando
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- O que está treinando
  workout_id UUID NOT NULL REFERENCES public.workouts(id),
  series_id UUID REFERENCES public.workout_series(id),
  
  -- Contexto multi-tenant
  academy_id UUID,
  trainer_id UUID REFERENCES auth.users(id),
  
  -- Status
  status workout_session_status DEFAULT 'in_progress',
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  active_duration_seconds INTEGER,        -- Tempo efetivo (sem pausas)
  
  -- Progresso
  total_exercises INTEGER DEFAULT 0,
  completed_exercises INTEGER DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  completed_sets INTEGER DEFAULT 0,
  
  -- Métricas
  total_volume_kg DECIMAL(10,2),          -- Peso total levantado
  estimated_calories INTEGER,
  
  -- Feedback geral
  overall_mood exercise_feedback_mood,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  notes TEXT,
  
  -- Metadata
  device_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout ON public.workout_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_academy ON public.workout_sessions(academy_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_trainer ON public.workout_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, started_at DESC);

-- RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.workout_sessions;
CREATE POLICY "Users can manage own sessions"
ON public.workout_sessions FOR ALL
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can view student sessions" ON public.workout_sessions;
CREATE POLICY "Trainers can view student sessions"
ON public.workout_sessions FOR SELECT
USING (
  public.is_admin()
  OR trainer_id = auth.uid()
  OR (academy_id IS NOT NULL AND public.is_academy_admin(auth.uid(), academy_id))
  OR EXISTS (
    SELECT 1 FROM public.trainer_students ts
    WHERE ts.trainer_id = auth.uid() AND ts.student_id = workout_sessions.user_id
    AND ts.status = 'active'
  )
);

-- ============================================
-- 8. SESSION EXERCISES (EXERCÍCIOS DA SESSÃO)
-- ============================================

CREATE TABLE IF NOT EXISTS public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculos
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  series_exercise_id UUID REFERENCES public.series_exercises(id),
  
  -- Ordem
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Feedback do exercício
  mood exercise_feedback_mood,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  like_dislike TEXT CHECK (like_dislike IN ('like', 'dislike', 'neutral')),
  comment TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON public.session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise ON public.session_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_completed ON public.session_exercises(session_id, is_completed);

-- RLS (herda da sessão)
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own session exercises" ON public.session_exercises;
CREATE POLICY "Users can manage own session exercises"
ON public.session_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = session_id AND ws.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Trainers can view student session exercises" ON public.session_exercises;
CREATE POLICY "Trainers can view student session exercises"
ON public.session_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = session_id
    AND (
      public.is_admin()
      OR ws.trainer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trainer_students ts
        WHERE ts.trainer_id = auth.uid() AND ts.student_id = ws.user_id
        AND ts.status = 'active'
      )
    )
  )
);

-- ============================================
-- 9. SESSION SETS (SÉRIES EXECUTADAS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculos
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  
  -- Número da série
  set_number INTEGER NOT NULL,
  
  -- Planejado vs Executado
  planned_reps INTEGER,
  actual_reps INTEGER,
  planned_weight_kg DECIMAL(6,2),
  actual_weight_kg DECIMAL(6,2),
  
  -- Tempo
  rest_seconds_taken INTEGER,
  time_under_tension_seconds INTEGER,
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  is_warmup BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  
  -- RPE (Rate of Perceived Exertion) 1-10
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON public.session_sets(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_completed ON public.session_sets(session_exercise_id, is_completed);

-- RLS (herda do exercício da sessão)
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own session sets" ON public.session_sets;
CREATE POLICY "Users can manage own session sets"
ON public.session_sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.workout_sessions ws ON ws.id = se.session_id
    WHERE se.id = session_exercise_id AND ws.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Trainers can view student session sets" ON public.session_sets;
CREATE POLICY "Trainers can view student session sets"
ON public.session_sets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.workout_sessions ws ON ws.id = se.session_id
    WHERE se.id = session_exercise_id
    AND (
      public.is_admin()
      OR ws.trainer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trainer_students ts
        WHERE ts.trainer_id = auth.uid() AND ts.student_id = ws.user_id
        AND ts.status = 'active'
      )
    )
  )
);

-- ============================================
-- 10. WORKOUT STREAKS (SEQUÊNCIAS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workout_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Streak atual
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Datas
  last_workout_date DATE,
  streak_started_date DATE,
  
  -- Stats
  total_workouts INTEGER DEFAULT 0,
  total_workout_minutes INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_streaks_user ON public.workout_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_streaks_current ON public.workout_streaks(current_streak DESC);

-- RLS
ALTER TABLE public.workout_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON public.workout_streaks;
CREATE POLICY "Users can view own streak"
ON public.workout_streaks FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage streaks" ON public.workout_streaks;
CREATE POLICY "System can manage streaks"
ON public.workout_streaks FOR ALL
WITH CHECK (true);

-- ============================================
-- 11. STUDENT WORKOUT PARAMS (PERSONALIZAÇÃO)
-- ============================================
-- Parâmetros personalizados por aluno para cada exercício

CREATE TABLE IF NOT EXISTS public.student_workout_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- O que
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  
  -- Quem personalizou
  set_by UUID REFERENCES auth.users(id),
  
  -- Parâmetros personalizados
  custom_sets INTEGER,
  custom_reps TEXT,
  custom_rest_seconds INTEGER,
  custom_tempo TEXT,
  custom_load_kg DECIMAL(6,2),
  custom_load_percent INTEGER,            -- % do 1RM
  
  -- Instruções
  special_instructions TEXT,
  video_url TEXT,
  
  -- 1RM tracking
  estimated_1rm_kg DECIMAL(6,2),
  last_1rm_test_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: precisa ter exercise_id ou workout_id
  CHECK (exercise_id IS NOT NULL OR workout_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_student_workout_params_student ON public.student_workout_params(student_id);
CREATE INDEX IF NOT EXISTS idx_student_workout_params_exercise ON public.student_workout_params(exercise_id);
CREATE INDEX IF NOT EXISTS idx_student_workout_params_workout ON public.student_workout_params(workout_id);

-- RLS
ALTER TABLE public.student_workout_params ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own params" ON public.student_workout_params;
CREATE POLICY "Students can view own params"
ON public.student_workout_params FOR SELECT
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can manage student params" ON public.student_workout_params;
CREATE POLICY "Trainers can manage student params"
ON public.student_workout_params FOR ALL
USING (
  public.is_admin()
  OR set_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trainer_students ts
    WHERE ts.trainer_id = auth.uid() AND ts.student_id = student_workout_params.student_id
    AND ts.status = 'active'
  )
);

-- ============================================
-- 12. TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_workout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exercises_updated_at ON public.exercises;
CREATE TRIGGER trg_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION update_workout_updated_at();

DROP TRIGGER IF EXISTS trg_workout_series_updated_at ON public.workout_series;
CREATE TRIGGER trg_workout_series_updated_at
BEFORE UPDATE ON public.workout_series
FOR EACH ROW EXECUTE FUNCTION update_workout_updated_at();

DROP TRIGGER IF EXISTS trg_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER trg_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW EXECUTE FUNCTION update_workout_updated_at();

DROP TRIGGER IF EXISTS trg_session_exercises_updated_at ON public.session_exercises;
CREATE TRIGGER trg_session_exercises_updated_at
BEFORE UPDATE ON public.session_exercises
FOR EACH ROW EXECUTE FUNCTION update_workout_updated_at();

-- ============================================
-- 13. FUNCTIONS
-- ============================================

-- Função para iniciar uma sessão de treino
CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_workout_id UUID,
  p_series_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_exercise RECORD;
  v_order INTEGER := 0;
BEGIN
  -- Criar sessão
  INSERT INTO public.workout_sessions (
    user_id, workout_id, series_id, status, started_at
  )
  VALUES (
    auth.uid(), p_workout_id, p_series_id, 'in_progress', NOW()
  )
  RETURNING id INTO v_session_id;
  
  -- Se tem série, usar exercícios da série
  IF p_series_id IS NOT NULL THEN
    FOR v_exercise IN
      SELECT se.exercise_id, se.display_order
      FROM public.series_exercises se
      WHERE se.series_id = p_series_id
      ORDER BY se.display_order
    LOOP
      INSERT INTO public.session_exercises (
        session_id, exercise_id, series_exercise_id, display_order
      )
      VALUES (
        v_session_id, v_exercise.exercise_id, v_exercise.id, v_exercise.display_order
      );
      v_order := v_order + 1;
    END LOOP;
  ELSE
    -- Usar exercícios do treino legado (workout_exercises)
    FOR v_exercise IN
      SELECT we.id, we.name
      FROM public.workout_exercises we
      WHERE we.workout_id = p_workout_id
      ORDER BY we.exercise_order
    LOOP
      v_order := v_order + 1;
      -- Tentar encontrar exercício correspondente ou criar inline
      INSERT INTO public.session_exercises (
        session_id, exercise_id, display_order
      )
      SELECT 
        v_session_id,
        COALESCE(
          (SELECT e.id FROM public.exercises e WHERE LOWER(e.name) = LOWER(v_exercise.name) LIMIT 1),
          gen_random_uuid()
        ),
        v_order;
    END LOOP;
  END IF;
  
  -- Atualizar contagem de exercícios
  UPDATE public.workout_sessions
  SET total_exercises = v_order
  WHERE id = v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Função para completar um exercício
CREATE OR REPLACE FUNCTION public.complete_session_exercise(
  p_session_exercise_id UUID,
  p_mood exercise_feedback_mood DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL,
  p_like_dislike TEXT DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID;
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_xp_gained INTEGER := 10; -- XP base por exercício
BEGIN
  -- Obter session_id e verificar ownership
  SELECT se.session_id, ws.user_id INTO v_session_id, v_user_id
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = p_session_exercise_id;
  
  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Não autorizado');
  END IF;
  
  -- Atualizar exercício
  UPDATE public.session_exercises
  SET 
    is_completed = true,
    completed_at = NOW(),
    mood = p_mood,
    rating = p_rating,
    like_dislike = p_like_dislike,
    comment = p_comment
  WHERE id = p_session_exercise_id;
  
  -- Contar exercícios completados
  SELECT 
    COUNT(*) FILTER (WHERE is_completed),
    COUNT(*)
  INTO v_completed_count, v_total_count
  FROM public.session_exercises
  WHERE session_id = v_session_id;
  
  -- Atualizar sessão
  UPDATE public.workout_sessions
  SET 
    completed_exercises = v_completed_count,
    total_exercises = v_total_count
  WHERE id = v_session_id;
  
  -- Adicionar XP
  PERFORM public.add_xp_to_user(
    v_user_id,
    v_xp_gained,
    'exercise_completed',
    jsonb_build_object('session_exercise_id', p_session_exercise_id)
  );
  
  -- Verificar conquistas
  PERFORM public.check_achievement_progress(v_user_id, 'exercises_completed', 1);
  
  RETURN jsonb_build_object(
    'success', true,
    'completed', v_completed_count,
    'total', v_total_count,
    'xp_gained', v_xp_gained
  );
END;
$$;

-- Função para completar sessão de treino
CREATE OR REPLACE FUNCTION public.complete_workout_session(
  p_session_id UUID,
  p_overall_mood exercise_feedback_mood DEFAULT NULL,
  p_overall_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_duration_seconds INTEGER;
  v_xp_gained INTEGER := 50; -- XP base por treino completo
  v_streak_bonus INTEGER := 0;
  v_current_streak INTEGER;
BEGIN
  -- Obter sessão
  SELECT * INTO v_session
  FROM public.workout_sessions
  WHERE id = p_session_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sessão não encontrada');
  END IF;
  
  -- Calcular duração
  v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_session.started_at))::INTEGER;
  
  -- Atualizar sessão
  UPDATE public.workout_sessions
  SET 
    status = 'completed',
    completed_at = NOW(),
    total_duration_seconds = v_duration_seconds,
    overall_mood = p_overall_mood,
    overall_rating = p_overall_rating,
    notes = p_notes
  WHERE id = p_session_id;
  
  -- Atualizar streak
  INSERT INTO public.workout_streaks (user_id, current_streak, longest_streak, last_workout_date, streak_started_date, total_workouts)
  VALUES (auth.uid(), 1, 1, CURRENT_DATE, CURRENT_DATE, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak = CASE 
      WHEN workout_streaks.last_workout_date = CURRENT_DATE - 1 THEN workout_streaks.current_streak + 1
      WHEN workout_streaks.last_workout_date = CURRENT_DATE THEN workout_streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      workout_streaks.longest_streak,
      CASE 
        WHEN workout_streaks.last_workout_date = CURRENT_DATE - 1 THEN workout_streaks.current_streak + 1
        WHEN workout_streaks.last_workout_date = CURRENT_DATE THEN workout_streaks.current_streak
        ELSE 1
      END
    ),
    last_workout_date = CURRENT_DATE,
    streak_started_date = CASE 
      WHEN workout_streaks.last_workout_date < CURRENT_DATE - 1 THEN CURRENT_DATE
      ELSE workout_streaks.streak_started_date
    END,
    total_workouts = workout_streaks.total_workouts + 1,
    updated_at = NOW()
  RETURNING current_streak INTO v_current_streak;
  
  -- Bônus de streak
  IF v_current_streak >= 7 THEN
    v_streak_bonus := 25;
  ELSIF v_current_streak >= 3 THEN
    v_streak_bonus := 10;
  END IF;
  
  -- Adicionar XP
  PERFORM public.add_xp_to_user(
    auth.uid(),
    v_xp_gained + v_streak_bonus,
    'workout_completed',
    jsonb_build_object(
      'session_id', p_session_id,
      'duration_seconds', v_duration_seconds,
      'streak', v_current_streak
    )
  );
  
  -- Verificar conquistas
  PERFORM public.check_achievement_progress(auth.uid(), 'workouts_completed', 1);
  PERFORM public.check_achievement_progress(auth.uid(), 'streak_days', 1);
  
  -- Registrar no diário (se existir a tabela)
  BEGIN
    INSERT INTO public.diary_entries (
      user_id, date, entry_type, source, reference_id, title, duration_minutes
    )
    VALUES (
      auth.uid(), CURRENT_DATE, 'workout', 'session', p_session_id,
      (SELECT w.title FROM public.workouts w WHERE w.id = v_session.workout_id),
      v_duration_seconds / 60
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora se não conseguir registrar
    NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'duration_seconds', v_duration_seconds,
    'xp_gained', v_xp_gained + v_streak_bonus,
    'streak', v_current_streak,
    'streak_bonus', v_streak_bonus
  );
END;
$$;

-- Função para obter estatísticas do aluno para dashboard
CREATE OR REPLACE FUNCTION public.get_student_workout_stats(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_sessions', COUNT(*),
    'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
    'total_duration_minutes', COALESCE(SUM(total_duration_seconds) / 60, 0),
    'avg_session_duration_minutes', COALESCE(AVG(total_duration_seconds) / 60, 0)::INTEGER,
    'avg_mood', MODE() WITHIN GROUP (ORDER BY overall_mood),
    'avg_rating', ROUND(AVG(overall_rating), 1),
    'current_streak', (SELECT current_streak FROM workout_streaks WHERE user_id = p_student_id),
    'longest_streak', (SELECT longest_streak FROM workout_streaks WHERE user_id = p_student_id),
    'workouts_by_day', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', d.date,
        'count', d.count
      ))
      FROM (
        SELECT DATE(started_at) as date, COUNT(*) as count
        FROM workout_sessions
        WHERE user_id = p_student_id
        AND started_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE(started_at)
        ORDER BY date
      ) d
    )
  )
  FROM workout_sessions
  WHERE user_id = p_student_id
  AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- ============================================
-- 14. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION public.start_workout_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_exercise(UUID, exercise_feedback_mood, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID, exercise_feedback_mood, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_workout_stats(UUID, INTEGER) TO authenticated;

-- ============================================
-- 15. COMMENTS
-- ============================================

COMMENT ON TABLE public.exercises IS 'Exercícios independentes e reutilizáveis';
COMMENT ON TABLE public.workout_series IS 'Séries semanais (A, B, C) de um treino';
COMMENT ON TABLE public.series_exercises IS 'Exercícios que compõem cada série';
COMMENT ON TABLE public.workout_sessions IS 'Sessões de treino executadas pelos alunos';
COMMENT ON TABLE public.session_exercises IS 'Exercícios executados em uma sessão';
COMMENT ON TABLE public.session_sets IS 'Séries executadas de cada exercício';
COMMENT ON TABLE public.workout_streaks IS 'Sequências de treino dos usuários';
COMMENT ON TABLE public.student_workout_params IS 'Parâmetros personalizados por aluno';

COMMENT ON FUNCTION public.start_workout_session(UUID, UUID) IS 'Inicia uma nova sessão de treino';
COMMENT ON FUNCTION public.complete_session_exercise(UUID, exercise_feedback_mood, INTEGER, TEXT, TEXT) IS 'Marca um exercício como concluído';
COMMENT ON FUNCTION public.complete_workout_session(UUID, exercise_feedback_mood, INTEGER, TEXT) IS 'Finaliza uma sessão de treino';
COMMENT ON FUNCTION public.get_student_workout_stats(UUID, INTEGER) IS 'Obtém estatísticas de treino do aluno';
