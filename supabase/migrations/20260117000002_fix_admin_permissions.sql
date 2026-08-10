-- Migration: Fix Admin Permissions and Add Super Admin Support
-- Date: 2026-01-17
-- Description: Updates RLS policies to explicitly support 'admin' role and ensure 'dishes' table allows admin access.

-- Helper function to check if user is admin or admin
CREATE OR REPLACE FUNCTION public.is_admin_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies for INGREDIENTS
DROP POLICY IF EXISTS "Ingredients are insertable by admins" ON public.ingredients;
DROP POLICY IF EXISTS "Ingredients are updateable by admins" ON public.ingredients;
DROP POLICY IF EXISTS "Ingredients are deletable by admins" ON public.ingredients;

CREATE POLICY "Ingredients are insertable by admins" ON public.ingredients
    FOR INSERT WITH CHECK (public.is_admin_or_admin());

CREATE POLICY "Ingredients are updateable by admins" ON public.ingredients
    FOR UPDATE USING (public.is_admin_or_admin());

CREATE POLICY "Ingredients are deletable by admins" ON public.ingredients
    FOR DELETE USING (public.is_admin_or_admin());

-- 2. Policies for DISHES (formerly Diets)
-- Ensure RLS is enabled
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dishes are viewable by everyone" ON public.dishes;
DROP POLICY IF EXISTS "Dishes are insertable by admins" ON public.dishes;
DROP POLICY IF EXISTS "Dishes are updateable by admins" ON public.dishes;
DROP POLICY IF EXISTS "Dishes are deletable by admins" ON public.dishes;

-- Also drop old policies if they exist (from renaming)
DROP POLICY IF EXISTS "Diets are viewable by everyone" ON public.dishes;
DROP POLICY IF EXISTS "Admins can insert diets" ON public.dishes;
DROP POLICY IF EXISTS "Admins can update diets" ON public.dishes;
DROP POLICY IF EXISTS "Admins can delete diets" ON public.dishes;

CREATE POLICY "Dishes are viewable by everyone" ON public.dishes
    FOR SELECT USING (true);

CREATE POLICY "Dishes are insertable by admins" ON public.dishes
    FOR INSERT WITH CHECK (public.is_admin_or_admin());

CREATE POLICY "Dishes are updateable by admins" ON public.dishes
    FOR UPDATE USING (public.is_admin_or_admin());

CREATE POLICY "Dishes are deletable by admins" ON public.dishes
    FOR DELETE USING (public.is_admin_or_admin());

-- 3. Policies for DISH_INGREDIENTS
DROP POLICY IF EXISTS "Dish Ingredients manage by admins" ON public.dish_ingredients;

CREATE POLICY "Dish Ingredients manage by admins" ON public.dish_ingredients
    FOR ALL USING (public.is_admin_or_admin());

-- 4. Policies for DIET_PLANS
DROP POLICY IF EXISTS "Users can view relevant diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Admins manage diet plans" ON public.diet_plans;

CREATE POLICY "Users can view relevant diet plans" ON public.diet_plans
    FOR SELECT USING (
        public.is_admin_or_admin()
        OR
        (visibility_type = 'global' AND is_active = true)
        OR
        (visibility_type = 'user' AND visibility_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Admins manage diet plans" ON public.diet_plans
    FOR ALL USING (public.is_admin_or_admin());

-- 5. Policies for DIET_PLAN_MEALS
DROP POLICY IF EXISTS "View meals if plan is visible" ON public.diet_plan_meals;
DROP POLICY IF EXISTS "Admins manage diet plan meals" ON public.diet_plan_meals;

CREATE POLICY "View meals if plan is visible" ON public.diet_plan_meals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.diet_plans p
            WHERE p.id = diet_plan_meals.diet_plan_id
            AND (
                public.is_admin_or_admin() OR
                (p.visibility_type = 'global' AND p.is_active = true) OR
                (p.visibility_type = 'user' AND p.visibility_id = auth.uid() AND p.is_active = true)
            )
        )
    );

CREATE POLICY "Admins manage diet plan meals" ON public.diet_plan_meals
    FOR ALL USING (public.is_admin_or_admin());

-- 6. Policies for DIET_PLAN_MEAL_OPTIONS
DROP POLICY IF EXISTS "View meal options if meal is visible" ON public.diet_plan_meal_options;
DROP POLICY IF EXISTS "Admins manage diet plan options" ON public.diet_plan_meal_options;

CREATE POLICY "View meal options if meal is visible" ON public.diet_plan_meal_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.diet_plan_meals m
            JOIN public.diet_plans p ON p.id = m.diet_plan_id
            WHERE m.id = diet_plan_meal_options.diet_plan_meal_id
            AND (
                public.is_admin_or_admin() OR
                (p.visibility_type = 'global' AND p.is_active = true) OR
                (p.visibility_type = 'user' AND p.visibility_id = auth.uid() AND p.is_active = true)
            )
        )
    );

CREATE POLICY "Admins manage diet plan options" ON public.diet_plan_meal_options
    FOR ALL USING (public.is_admin_or_admin());
