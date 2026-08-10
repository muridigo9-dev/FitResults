-- ================================================
-- FINAL REMEDY FOR PLAN VISIBILITY (ANON & AUTH)
-- Migration: 20260205193000_fix_public_visibility_final.sql
-- ================================================

-- 1. FIX PERMISSIONS FOR ANON USERS (LEADS)
-- Without these, the checkout page will return empty lists for features
GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT ON public.plan_features TO anon;
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.plan_prices TO anon;
GRANT SELECT ON public.vw_plan_comparisons TO anon;

-- 2. FIX RLS POLICIES FOR feature_flags
-- Ensure anyone (even not logged in) can see marketing metadata for flags
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to feature flags' AND tablename = 'feature_flags') THEN
        CREATE POLICY "Allow public read access to feature flags" 
        ON public.feature_flags FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- 3. ENSURE RLS POLICIES FOR plan_features
-- Ensure anyone can see which plans have which features
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to plan features' AND tablename = 'plan_features') THEN
        CREATE POLICY "Allow public read access to plan features" 
        ON public.plan_features FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- 4. ENSURE RLS POLICIES FOR plans
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to active plans' AND tablename = 'plans') THEN
        CREATE POLICY "Allow public read access to active plans" 
        ON public.plans FOR SELECT TO anon, authenticated
        USING (is_active = true);
    END IF;
END $$;

-- 5. ENSURE RLS POLICIES FOR plan_prices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to active prices' AND tablename = 'plan_prices') THEN
        CREATE POLICY "Allow public read access to active prices" 
        ON public.plan_prices FOR SELECT TO anon, authenticated
        USING (is_active = true);
    END IF;
END $$;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
