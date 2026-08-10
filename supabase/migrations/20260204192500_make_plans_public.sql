-- Migration: Make Plans and Prices Public for Checkout
-- Description: Ensures non-authenticated users (leads) can view plan information on the checkout page.

-- 1. Grant SELECT to both anon and authenticated roles
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT SELECT ON public.plan_features TO anon, authenticated;
GRANT SELECT ON public.vw_plan_comparisons TO anon, authenticated;

-- 2. Ensure RLS allows public read if ENABLED
-- (Assuming they might be enabled, we add permissive policies)

DO $$ 
BEGIN
    -- For public.plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to active plans' AND tablename = 'plans') THEN
        CREATE POLICY "Allow public read access to active plans" ON public.plans
        FOR SELECT TO anon, authenticated USING (is_active = true);
    END IF;

    -- For public.plan_prices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to active prices' AND tablename = 'plan_prices') THEN
        CREATE POLICY "Allow public read access to active prices" ON public.plan_prices
        FOR SELECT TO anon, authenticated USING (is_active = true);
    END IF;

    -- For public.plan_features
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to plan features' AND tablename = 'plan_features') THEN
        CREATE POLICY "Allow public read access to plan features" ON public.plan_features
        FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
