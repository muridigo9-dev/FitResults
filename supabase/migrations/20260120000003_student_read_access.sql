-- ==============================================================================
-- MIGRATION: Allow Student Read Access to Global Content
-- ==============================================================================
-- Description: Adds SELECT policies for authenticated users to view active,
-- global content. This fixes the issue where only Admins could see Exercises,
-- Workouts, etc. due to the previous restrictive RLS.
-- ==============================================================================

-- 1. Exercises
-- Students can see active exercises that are Global OR created by themselves
CREATE POLICY "Students can view global exercises" ON public.exercises
FOR SELECT TO authenticated
USING (
    is_active = true 
    AND (
        visibility = 'global' 
        OR visibility IS NULL -- Handle potential nulls as global
        OR created_by_id = auth.uid()
    )
);

-- 2. Workouts
-- Workouts do not have created_by_id, so strict Global check
CREATE POLICY "Students can view global workouts" ON public.workouts
FOR SELECT TO authenticated
USING (
    is_active = true 
    AND (
        visibility = 'global' 
        OR visibility IS NULL
    )
);

-- 3. Dishes (Meals/Foods)
-- Dishes use owner_id
CREATE POLICY "Students can view global dishes" ON public.dishes
FOR SELECT TO authenticated
USING (
    is_active = true 
    AND (
        visibility = 'global' 
        OR visibility IS NULL
        OR owner_id = auth.uid()
    )
);

-- 4. Diet Plans
-- Diet Plans do not have created_by_id, strict Global check
CREATE POLICY "Students can view global diet_plans" ON public.diet_plans
FOR SELECT TO authenticated
USING (
    is_active = true 
    AND (
        visibility = 'global' 
        OR visibility IS NULL
    )
);

-- 5. Challenges
-- Challenges strict Global check
CREATE POLICY "Students can view global challenges" ON public.challenges
FOR SELECT TO authenticated
USING (
    is_active = true 
    AND (
        visibility = 'global' 
        OR visibility IS NULL
    )
);
