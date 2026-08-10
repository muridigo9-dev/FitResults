-- Migration: Add content linking columns to challenge_tasks
-- Description: Allows linking tasks to specific dishes, diets, workouts, or exercises.

DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'challenge_tasks' AND column_name = 'dish_id') THEN
        ALTER TABLE public.challenge_tasks ADD COLUMN dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'challenge_tasks' AND column_name = 'diet_plan_id') THEN
        ALTER TABLE public.challenge_tasks ADD COLUMN diet_plan_id UUID REFERENCES public.diet_plans(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'challenge_tasks' AND column_name = 'workout_id') THEN
        ALTER TABLE public.challenge_tasks ADD COLUMN workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'challenge_tasks' AND column_name = 'exercise_id') THEN
        ALTER TABLE public.challenge_tasks ADD COLUMN exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_dish_id ON public.challenge_tasks(dish_id);
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_diet_plan_id ON public.challenge_tasks(diet_plan_id);
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_workout_id ON public.challenge_tasks(workout_id);
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_exercise_id ON public.challenge_tasks(exercise_id);

COMMENT ON COLUMN public.challenge_tasks.dish_id IS 'Specific dish linked to this task';
COMMENT ON COLUMN public.challenge_tasks.diet_plan_id IS 'Specific diet plan linked to this task';
COMMENT ON COLUMN public.challenge_tasks.workout_id IS 'Specific workout linked to this task';
COMMENT ON COLUMN public.challenge_tasks.exercise_id IS 'Specific exercise linked to this task';
