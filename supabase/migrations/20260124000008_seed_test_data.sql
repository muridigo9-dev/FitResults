-- Migration: Seed Data for Testing (Idempotent)
-- Date: 2026-01-24
-- Description: Inserts sample Exercises, Workouts, Ingredients, and Dishes.
-- Corrected to match confirmed schema (ingredients, dish_ingredients tables).

-- 1. SEED EXERCISES
-- Note: Omitted 'tags' and 'muscle_group_id' as schema verification was inconclusive.
-- Basic exercise data is sufficient for testing.
INSERT INTO public.exercises (name, description, difficulty, instructions, video_url, image_url)
SELECT 'Supino Reto com Halteres', 'Exercício fundamental para peitoral.', 'intermediate', 'Deite-se no banco, segure os halteres...', NULL, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE name = 'Supino Reto com Halteres');

INSERT INTO public.exercises (name, description, difficulty, instructions, video_url, image_url)
SELECT 'Agachamento Livre', 'Rei dos exercícios de perna.', 'advanced', 'Mantenha a postura ereta...', NULL, 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE name = 'Agachamento Livre');

INSERT INTO public.exercises (name, description, difficulty, instructions, video_url, image_url)
SELECT 'Puxada Frontal', 'Exercício para as costas.', 'beginner', 'Puxe a barra em direção ao peito...', NULL, 'https://images.unsplash.com/photo-1603503364272-6e2845a74eaa?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE name = 'Puxada Frontal');

-- 2. SEED WORKOUT
DO $$
DECLARE
    v_workout_id uuid;
    v_ex1_id uuid;
    v_ex2_id uuid;
    v_ex3_id uuid;
BEGIN
    -- Create Workout if not exists
    IF NOT EXISTS (SELECT 1 FROM public.workouts WHERE title = 'Treino Full Body (Seed)') THEN
        -- columns: title, description, category, content_origin, visibility
        INSERT INTO public.workouts (title, description, category, content_origin, visibility)
        VALUES ('Treino Full Body (Seed)', 'Treino completo gerado automaticamente para testes.', 'strength', 'system', 'global')
        RETURNING id INTO v_workout_id;

        -- Get IDs
        SELECT id INTO v_ex1_id FROM public.exercises WHERE name = 'Supino Reto com Halteres' LIMIT 1;
        SELECT id INTO v_ex2_id FROM public.exercises WHERE name = 'Agachamento Livre' LIMIT 1;
        SELECT id INTO v_ex3_id FROM public.exercises WHERE name = 'Puxada Frontal' LIMIT 1;

        -- Link Exercises
        -- Using "exercise_order", "reps_mode", "execution_type"
        IF v_ex1_id IS NOT NULL THEN
            INSERT INTO public.workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, rest_seconds, reps_mode, execution_type)
            VALUES (v_workout_id, v_ex1_id, 1, 3, '10-12', 60, 'fixed', 'reps');
        END IF;

        IF v_ex2_id IS NOT NULL THEN
            INSERT INTO public.workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, rest_seconds, reps_mode, execution_type)
            VALUES (v_workout_id, v_ex2_id, 2, 3, '8-10', 90, 'fixed', 'reps');
        END IF;
        
        IF v_ex3_id IS NOT NULL THEN
            INSERT INTO public.workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, rest_seconds, reps_mode, execution_type)
            VALUES (v_workout_id, v_ex3_id, 3, 3, '12', 45, 'fixed', 'reps');
        END IF;
    END IF;
END $$;

-- 3. SEED INGREDIENTS (Replacing Foods)
-- Columns: name, calories, protein, carbs, fat, unit, reference_value
INSERT INTO public.ingredients (name, calories, protein, carbs, fat, unit, reference_value)
SELECT 'Peito de Frango Grelhado', 165, 31, 0, 3.6, 'g', 100
WHERE NOT EXISTS (SELECT 1 FROM public.ingredients WHERE name = 'Peito de Frango Grelhado');

INSERT INTO public.ingredients (name, calories, protein, carbs, fat, unit, reference_value)
SELECT 'Arroz Branco Cozido', 130, 2.7, 28, 0.3, 'g', 100
WHERE NOT EXISTS (SELECT 1 FROM public.ingredients WHERE name = 'Arroz Branco Cozido');

INSERT INTO public.ingredients (name, calories, protein, carbs, fat, unit, reference_value)
SELECT 'Brócolis Cozido', 35, 2.4, 7, 0.4, 'g', 100
WHERE NOT EXISTS (SELECT 1 FROM public.ingredients WHERE name = 'Brócolis Cozido');

INSERT INTO public.ingredients (name, calories, protein, carbs, fat, unit, reference_value)
SELECT 'Azeite de Oliva', 884, 0, 0, 100, 'ml', 100
WHERE NOT EXISTS (SELECT 1 FROM public.ingredients WHERE name = 'Azeite de Oliva');

-- 4. SEED DISHES
DO $$
DECLARE
    v_dish_id uuid;
    v_f1_id uuid;
    v_f2_id uuid;
    v_f3_id uuid;
    v_f4_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.dishes WHERE title = 'Marmita Fit Frango (Seed)') THEN
        -- Removed preparation_time as it likely does not exist
        INSERT INTO public.dishes (title, description, calories, protein, carbs, fat, content_origin)
        VALUES ('Marmita Fit Frango (Seed)', 'Clássico frango com arroz e brócolis.', 450, 35, 45, 10, 'system')
        RETURNING id INTO v_dish_id;

        -- Get Ingredient IDs (Using ingredients table)
        SELECT id INTO v_f1_id FROM public.ingredients WHERE name = 'Peito de Frango Grelhado' LIMIT 1;
        SELECT id INTO v_f2_id FROM public.ingredients WHERE name = 'Arroz Branco Cozido' LIMIT 1;
        SELECT id INTO v_f3_id FROM public.ingredients WHERE name = 'Brócolis Cozido' LIMIT 1;
        SELECT id INTO v_f4_id FROM public.ingredients WHERE name = 'Azeite de Oliva' LIMIT 1;

        -- Link Ingredients (using dish_ingredients table)
        -- Columns: dish_id, ingredient_id, quantity, metric_unit
        IF v_f1_id IS NOT NULL THEN
            INSERT INTO public.dish_ingredients (dish_id, ingredient_id, quantity, metric_unit) VALUES (v_dish_id, v_f1_id, 120, 'g');
        END IF;
        IF v_f2_id IS NOT NULL THEN
            INSERT INTO public.dish_ingredients (dish_id, ingredient_id, quantity, metric_unit) VALUES (v_dish_id, v_f2_id, 150, 'g');
        END IF;
        IF v_f3_id IS NOT NULL THEN
            INSERT INTO public.dish_ingredients (dish_id, ingredient_id, quantity, metric_unit) VALUES (v_dish_id, v_f3_id, 80, 'g');
        END IF;
        IF v_f4_id IS NOT NULL THEN
            INSERT INTO public.dish_ingredients (dish_id, ingredient_id, quantity, metric_unit) VALUES (v_dish_id, v_f4_id, 5, 'ml');
        END IF;

    END IF;
END $$;
