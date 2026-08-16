-- ============================================
-- MULTI-LANGUAGE COLUMNS FOR TRAINING CONTENT
-- ============================================
-- Description: Adds _en / _es translation columns to the exercise and workout
--              content tables, mirroring the pattern already used by
--              feature_flags (20260205190500_feature_flags_multilang.sql):
--              the base column stays pt-BR and the suffixed columns hold the
--              translation, with the app falling back to the base when empty.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times
-- Dependencies: exercises, workouts, workout_exercises, muscle_groups,
--               exercise_types, exercise_levels

-- 1. EXERCISE LIBRARY
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT,
  ADD COLUMN IF NOT EXISTS instructions_en TEXT,
  ADD COLUMN IF NOT EXISTS instructions_es TEXT;

-- 2. WORKOUTS
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- 3. WORKOUT EXERCISES
-- These rows carry their own name/description (a workout may rename a library
-- exercise, or not reference the library at all), so they need translations too.
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- 4. MUSCLE GROUPS (name_en already exists from the workout system evolution)
ALTER TABLE public.muscle_groups
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

-- 5. TAXONOMY (type / level labels shown in filters and cards)
ALTER TABLE public.exercise_types
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

ALTER TABLE public.exercise_levels
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

-- 6. COMMENTS
COMMENT ON COLUMN public.exercises.name_en IS 'English name; falls back to name (pt-BR) when null';
COMMENT ON COLUMN public.exercises.name_es IS 'Spanish name; falls back to name (pt-BR) when null';
COMMENT ON COLUMN public.workouts.title_en IS 'English title; falls back to title (pt-BR) when null';
COMMENT ON COLUMN public.workouts.title_es IS 'Spanish title; falls back to title (pt-BR) when null';

-- 7. Force refresh of the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
