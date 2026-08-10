-- Add goals columns to user_preferences
-- Created: 2026-01-26
-- Idempotent: safe to run multiple times

ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS water_goal_ml INTEGER DEFAULT 2500,
ADD COLUMN IF NOT EXISTS meals_goal_count INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS calorie_target INTEGER DEFAULT 2000;

COMMENT ON COLUMN public.user_preferences.water_goal_ml IS 'Daily water goal in ml';
COMMENT ON COLUMN public.user_preferences.meals_goal_count IS 'Daily meals goal count';
COMMENT ON COLUMN public.user_preferences.calorie_target IS 'Daily calorie target (visual preference)';
