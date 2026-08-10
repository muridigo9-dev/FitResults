-- Migration: Refactor Diet System (Idempotent Fix)
-- Date: 2026-01-17

-- 1. Create INGREDIENTS table
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'g', -- 'g', 'ml', 'unidade'
    calories NUMERIC DEFAULT 0, -- kcal per "reference_value" (usually 1 or 100)
    protein NUMERIC DEFAULT 0, -- g
    carbs NUMERIC DEFAULT 0, -- g
    fat NUMERIC DEFAULT 0, -- g
    reference_value NUMERIC DEFAULT 100, -- e.g. 100g, 100ml, 1 unit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rename existing DIETS table to DISHES (Idempotent)
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'diets') THEN
        ALTER TABLE public.diets RENAME TO dishes;
    END IF;
END $$;

-- 3. Create DISH_INGREDIENTS table (Structured composition)
CREATE TABLE IF NOT EXISTS public.dish_ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dish_id UUID REFERENCES public.dishes(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL, -- Quantity in the unit of the ingredient
    metric_unit TEXT, -- Optional override if needed, but usually derived from ingredient
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create DIET_PLANS table
CREATE TABLE IF NOT EXISTS public.diet_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    objective TEXT, -- 'lose_weight', 'gain_muscle', 'maintain', etc.
    created_by UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Visibility Configuration
    visibility_type TEXT NOT NULL DEFAULT 'global', -- 'global', 'group', 'user'
    visibility_id UUID, -- For group_id or user_id specific plans
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create DIET_PLAN_MEALS table (e.g. "Breakfast", "Lunch")
CREATE TABLE IF NOT EXISTS public.diet_plan_meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diet_plan_id UUID REFERENCES public.diet_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    time_suggestion TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create DIET_PLAN_MEAL_OPTIONS table (Dishes available in a meal slot)
CREATE TABLE IF NOT EXISTS public.diet_plan_meal_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diet_plan_meal_id UUID REFERENCES public.diet_plan_meals(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES public.dishes(id) ON DELETE CASCADE,
    portion_modifier NUMERIC DEFAULT 1.0, -- 1.0 = standard portion, 0.5 = half portion
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add RLS Policies

-- Enable RLS (Safe to run multiple times, but good to be explicit)
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan_meal_options ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to ensure idempotency when recreating
DROP POLICY IF EXISTS "Ingredients are viewable by everyone" ON public.ingredients;
DROP POLICY IF EXISTS "Ingredients are insertable by admins" ON public.ingredients;
DROP POLICY IF EXISTS "Ingredients are updateable by admins" ON public.ingredients;
DROP POLICY IF EXISTS "Ingredients are deletable by admins" ON public.ingredients;

DROP POLICY IF EXISTS "Dish Ingredients are viewable by everyone" ON public.dish_ingredients;
DROP POLICY IF EXISTS "Dish Ingredients manage by admins" ON public.dish_ingredients;

DROP POLICY IF EXISTS "Users can view relevant diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Admins manage diet plans" ON public.diet_plans;

DROP POLICY IF EXISTS "View meals if plan is visible" ON public.diet_plan_meals;
DROP POLICY IF EXISTS "Admins manage diet plan meals" ON public.diet_plan_meals;

DROP POLICY IF EXISTS "View meal options if meal is visible" ON public.diet_plan_meal_options;
DROP POLICY IF EXISTS "Admins manage diet plan options" ON public.diet_plan_meal_options;

-- Policy: Ingredients
-- Public read, Admin write
CREATE POLICY "Ingredients are viewable by everyone" ON public.ingredients
    FOR SELECT USING (true);

CREATE POLICY "Ingredients are insertable by admins" ON public.ingredients
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Ingredients are updateable by admins" ON public.ingredients
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Ingredients are deletable by admins" ON public.ingredients
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Policy: Dish Ingredients
-- Same as Ingredients
CREATE POLICY "Dish Ingredients are viewable by everyone" ON public.dish_ingredients
    FOR SELECT USING (true);

CREATE POLICY "Dish Ingredients manage by admins" ON public.dish_ingredients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Policy: Diet Plans
-- Admin manages all. Users see GLOBAL or assigned plans.

-- Read Policy
CREATE POLICY "Users can view relevant diet plans" ON public.diet_plans
    FOR SELECT USING (
        -- 1. Admin reads all
        (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
        OR
        -- 2. User sees Global active plans
        (visibility_type = 'global' AND is_active = true)
        OR
        -- 3. User sees plans assigned specifically to them
        (visibility_type = 'user' AND visibility_id = auth.uid() AND is_active = true)
        OR
        -- 4. User sees plans assigned to their group
        -- Placeholder for now: effectively disables GROUP visibility until logic implemented
        (visibility_type = 'group' AND is_active = true AND false)
    );

CREATE POLICY "Admins manage diet plans" ON public.diet_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Policy: Diet Plan Meals & Options
-- Simplified visibility check (check parent)

CREATE POLICY "View meals if plan is visible" ON public.diet_plan_meals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.diet_plans p
            WHERE p.id = diet_plan_meals.diet_plan_id
            AND (
                (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) OR
                (p.visibility_type = 'global' AND p.is_active = true) OR
                (p.visibility_type = 'user' AND p.visibility_id = auth.uid() AND p.is_active = true)
            )
        )
    );

CREATE POLICY "Admins manage diet plan meals" ON public.diet_plan_meals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "View meal options if meal is visible" ON public.diet_plan_meal_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.diet_plan_meals m
            JOIN public.diet_plans p ON p.id = m.diet_plan_id
            WHERE m.id = diet_plan_meal_options.diet_plan_meal_id
            AND (
                (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) OR
                (p.visibility_type = 'global' AND p.is_active = true) OR
                (p.visibility_type = 'user' AND p.visibility_id = auth.uid() AND p.is_active = true)
            )
        )
    );

CREATE POLICY "Admins manage diet plan options" ON public.diet_plan_meal_options
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
