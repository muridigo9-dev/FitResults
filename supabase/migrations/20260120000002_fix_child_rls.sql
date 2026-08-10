-- ==============================================================================
-- MIGRATION: Fix RLS for Child/Junction Tables
-- ==============================================================================
-- Description: Grants Admin access to child tables that were missed in the previous
-- RLS fix. This ensures dependent data (exercises in workouts, ingredients in dishes,
-- meals in plans) can be saved.
-- ==============================================================================

-- 1. Workout Exercises
DROP POLICY IF EXISTS "Admins have full control workout_exercises" ON public.workout_exercises;
CREATE POLICY "Admins have full control workout_exercises" ON public.workout_exercises
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

-- 2. Dish Ingredients (New & Legacy)
DROP POLICY IF EXISTS "Admins have full control dish_ingredients" ON public.dish_ingredients;
CREATE POLICY "Admins have full control dish_ingredients" ON public.dish_ingredients
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admins have full control diet_ingredients" ON public.diet_ingredients;
CREATE POLICY "Admins have full control diet_ingredients" ON public.diet_ingredients
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

-- 3. Preparation Steps
DROP POLICY IF EXISTS "Admins have full control diet_preparation_steps" ON public.diet_preparation_steps;
CREATE POLICY "Admins have full control diet_preparation_steps" ON public.diet_preparation_steps
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

-- 4. Diet Plan Structure (Days, Meals, Items)
DROP POLICY IF EXISTS "Admins have full control diet_plan_days" ON public.diet_plan_days;
CREATE POLICY "Admins have full control diet_plan_days" ON public.diet_plan_days
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admins have full control diet_plan_meals" ON public.diet_plan_meals;
CREATE POLICY "Admins have full control diet_plan_meals" ON public.diet_plan_meals
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admins have full control diet_plan_items" ON public.diet_plan_items;
CREATE POLICY "Admins have full control diet_plan_items" ON public.diet_plan_items
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

-- 5. Challenge Structure
DROP POLICY IF EXISTS "Admins have full control challenge_days" ON public.challenge_days;
CREATE POLICY "Admins have full control challenge_days" ON public.challenge_days
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admins have full control challenge_tasks" ON public.challenge_tasks;
CREATE POLICY "Admins have full control challenge_tasks" ON public.challenge_tasks
FOR ALL TO authenticated
USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') );
