-- ============================================
-- MULTI-LANGUAGE COLUMNS FOR THE REMAINING CONTENT TYPES
-- ============================================
-- Description: Extends the _en / _es translation pattern (base column = pt-BR,
--              suffixed columns = translations, blank falls back to the base)
--              from exercises and workouts to every other content type an admin
--              creates: dishes, ingredients, diet plans and their meals,
--              challenges and their tasks, habits, and achievements.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260816090138_content_i18n_columns.sql

-- 1. DISHES (meals shown to students)
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- 2. INGREDIENTS
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

-- 3. DIET PLANS and their meal sections
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT,
  ADD COLUMN IF NOT EXISTS objective_en TEXT,
  ADD COLUMN IF NOT EXISTS objective_es TEXT;

ALTER TABLE public.diet_plan_meals
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

-- 4. CHALLENGES and their tasks
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

ALTER TABLE public.challenge_tasks
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_es TEXT;

-- 5. HABITS
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT;

-- 6. ACHIEVEMENTS
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- 7. COMMENTS
COMMENT ON COLUMN public.dishes.title_en IS 'English title; falls back to title (pt-BR) when null';
COMMENT ON COLUMN public.diet_plans.title_en IS 'English title; falls back to title (pt-BR) when null';
COMMENT ON COLUMN public.challenges.name_en IS 'English name; falls back to name (pt-BR) when null';

NOTIFY pgrst, 'reload schema';
