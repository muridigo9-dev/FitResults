-- =====================================================
-- COMPLETE MIGRATION CONSOLIDATED
-- Migração completa com todas as tabelas e configurações
-- Execute este arquivo se estiver iniciando do zero
-- =====================================================

-- =========================================================
-- 0. HELPER FUNCTIONS (must exist before other objects)
-- =========================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

-- Alternative: has_role function for role checking
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, check_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = $1 AND ur.role::text = $2
    );
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =========================================================
-- 1. PROFILES - Add missing columns
-- =========================================================

-- Subscription columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status: none, active, trialing, past_due, cancelled, unpaid, incomplete, expired';
COMMENT ON COLUMN public.profiles.account_status IS 'Account status: pending, active, cancelled, suspended';
COMMENT ON COLUMN public.profiles.must_change_password IS 'User must change password on next login';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- =========================================================
-- 2. BRAND SETTINGS - Complete table with whitelabel fields
-- =========================================================

-- Add missing whitelabel columns
ALTER TABLE public.brand_settings
ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'suporte@app.com',
ADD COLUMN IF NOT EXISTS app_url text DEFAULT 'https://app.com',
ADD COLUMN IF NOT EXISTS tagline text DEFAULT '';

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admin manages brand settings" ON public.brand_settings;
CREATE POLICY "Admin manages brand settings"
ON public.brand_settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read brand settings" ON public.brand_settings;
CREATE POLICY "Users can read brand settings"
ON public.brand_settings FOR SELECT TO authenticated
USING (true);

-- Insert default brand settings
INSERT INTO public.brand_settings (
    app_name, logo_url, primary_color, secondary_color, 
    support_email, app_url
)
SELECT 'App', '', '#6366f1', '#8b5cf6', 'suporte@app.com', 'https://app.com'
WHERE NOT EXISTS (SELECT 1 FROM public.brand_settings LIMIT 1);

-- =========================================================
-- 3. APP SETTINGS - Enable RLS
-- =========================================================

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages app settings" ON public.app_settings;
CREATE POLICY "Admin manages app settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read app settings" ON public.app_settings;
CREATE POLICY "Users can read app settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

-- Insert default app settings
INSERT INTO public.app_settings (allow_user_diet_creation, allow_user_workout_creation, default_water_goal)
SELECT false, false, 2000
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings LIMIT 1);

-- =========================================================
-- 4. PROFILES - RLS Policies
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Service role inserts profiles" ON public.profiles;
CREATE POLICY "Service role inserts profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (true);

-- =========================================================
-- 5. USER ROLES - RLS Policies
-- =========================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
CREATE POLICY "Users read own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 6. SUBSCRIPTION PLANS TABLE (Dynamic plans from admin)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price_monthly decimal(10,2) NOT NULL,
    price_yearly decimal(10,2),
    stripe_price_id_monthly text,
    stripe_price_id_yearly text,
    features jsonb DEFAULT '[]'::jsonb,
    is_highlighted boolean DEFAULT false,
    is_active boolean DEFAULT true,
    display_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages plans" ON public.subscription_plans;
CREATE POLICY "Admin manages plans"
ON public.subscription_plans FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone reads active plans" ON public.subscription_plans;
CREATE POLICY "Anyone reads active plans"
ON public.subscription_plans FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON public.subscription_plans(display_order);

-- =========================================================
-- 7. DAILY CHECKINS - RLS Policies
-- =========================================================

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checkins" ON public.daily_checkins;
CREATE POLICY "Users manage own checkins"
ON public.daily_checkins FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 8. DIARY ENTRIES - RLS Policies
-- =========================================================

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own diary entries" ON public.diary_entries;
CREATE POLICY "Users manage own diary entries"
ON public.diary_entries FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 9. WEIGHT LOGS - RLS Policies
-- =========================================================

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own weight logs" ON public.weight_logs;
CREATE POLICY "Users manage own weight logs"
ON public.weight_logs FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 10. USER BODY PROFILES - RLS Policies
-- =========================================================

ALTER TABLE public.user_body_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own body profile" ON public.user_body_profiles;
CREATE POLICY "Users manage own body profile"
ON public.user_body_profiles FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 11. HABITS - RLS Policies
-- =========================================================

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active habits" ON public.habits;
CREATE POLICY "Anyone reads active habits"
ON public.habits FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages habits" ON public.habits;
CREATE POLICY "Admin manages habits"
ON public.habits FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 12. HABIT LOGS - RLS Policies
-- =========================================================

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit logs" ON public.habit_logs;
CREATE POLICY "Users manage own habit logs"
ON public.habit_logs FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 13. USER XP - RLS Policies
-- =========================================================

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own xp" ON public.user_xp;
CREATE POLICY "Users manage own xp"
ON public.user_xp FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 14. USER ACHIEVEMENTS - RLS Policies
-- =========================================================

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own achievements" ON public.user_achievements;
CREATE POLICY "Users manage own achievements"
ON public.user_achievements FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 15. ACHIEVEMENTS - RLS Policies
-- =========================================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active achievements" ON public.achievements;
CREATE POLICY "Anyone reads active achievements"
ON public.achievements FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages achievements" ON public.achievements;
CREATE POLICY "Admin manages achievements"
ON public.achievements FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 16. LEVELS - RLS Policies
-- =========================================================

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads levels" ON public.levels;
CREATE POLICY "Anyone reads levels"
ON public.levels FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages levels" ON public.levels;
CREATE POLICY "Admin manages levels"
ON public.levels FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 17. XP SETTINGS - RLS Policies
-- =========================================================

ALTER TABLE public.xp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads xp settings" ON public.xp_settings;
CREATE POLICY "Anyone reads xp settings"
ON public.xp_settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages xp settings" ON public.xp_settings;
CREATE POLICY "Admin manages xp settings"
ON public.xp_settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert default XP settings
INSERT INTO public.xp_settings (checkin_complete_xp, habit_complete_xp, daily_bonus_xp, streak_bonus_xp)
SELECT 10, 5, 25, 10
WHERE NOT EXISTS (SELECT 1 FROM public.xp_settings LIMIT 1);

-- =========================================================
-- 18. MACRO TEMPLATES - RLS Policies
-- =========================================================

ALTER TABLE public.macro_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active templates" ON public.macro_templates;
CREATE POLICY "Anyone reads active templates"
ON public.macro_templates FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages templates" ON public.macro_templates;
CREATE POLICY "Admin manages templates"
ON public.macro_templates FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 19. CHALLENGE RELATED TABLES - RLS Policies
-- =========================================================

ALTER TABLE public.challenge_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads challenge days" ON public.challenge_days;
CREATE POLICY "Anyone reads challenge days"
ON public.challenge_days FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages challenge days" ON public.challenge_days;
CREATE POLICY "Admin manages challenge days"
ON public.challenge_days FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone reads challenge tasks" ON public.challenge_tasks;
CREATE POLICY "Anyone reads challenge tasks"
ON public.challenge_tasks FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages challenge tasks" ON public.challenge_tasks;
CREATE POLICY "Admin manages challenge tasks"
ON public.challenge_tasks FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users manage own challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Users manage own challenge progress"
ON public.user_challenge_progress FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 20. CHECKIN RELATED TABLES - RLS Policies
-- =========================================================

ALTER TABLE public.checkin_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_challenge_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage checkin meals via checkin" ON public.checkin_meals;
CREATE POLICY "Users manage checkin meals via checkin"
ON public.checkin_meals FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Users manage checkin workouts via checkin" ON public.checkin_workouts;
CREATE POLICY "Users manage checkin workouts via checkin"
ON public.checkin_workouts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Users manage checkin challenge tasks via checkin" ON public.checkin_challenge_tasks;
CREATE POLICY "Users manage checkin challenge tasks via checkin"
ON public.checkin_challenge_tasks FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.daily_checkins dc
        WHERE dc.id = checkin_id AND (dc.user_id = auth.uid() OR public.is_admin())
    )
);

-- =========================================================
-- 21. DIET INGREDIENTS AND PREPARATION - RLS Policies
-- =========================================================

ALTER TABLE public.diet_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_preparation_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads diet ingredients" ON public.diet_ingredients;
CREATE POLICY "Anyone reads diet ingredients"
ON public.diet_ingredients FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages diet ingredients" ON public.diet_ingredients;
CREATE POLICY "Admin manages diet ingredients"
ON public.diet_ingredients FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone reads diet steps" ON public.diet_preparation_steps;
CREATE POLICY "Anyone reads diet steps"
ON public.diet_preparation_steps FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages diet steps" ON public.diet_preparation_steps;
CREATE POLICY "Admin manages diet steps"
ON public.diet_preparation_steps FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 22. WORKOUT EXERCISES - RLS Policies
-- =========================================================

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads workout exercises" ON public.workout_exercises;
CREATE POLICY "Anyone reads workout exercises"
ON public.workout_exercises FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manages workout exercises" ON public.workout_exercises;
CREATE POLICY "Admin manages workout exercises"
ON public.workout_exercises FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================================================
-- 23. PUSH SUBSCRIPTIONS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- =========================================================
-- 24. NOTIFICATION SETTINGS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    daily_reminder boolean DEFAULT true,
    weekly_summary boolean DEFAULT true,
    achievement_alerts boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    reminder_time time DEFAULT '09:00:00',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification settings" ON public.notification_settings;
CREATE POLICY "Users manage own notification settings"
ON public.notification_settings FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =========================================================
-- 25. BRANDING HELPER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_email_branding()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'brand_name', COALESCE(app_name, 'App'),
        'brand_logo_url', COALESCE(logo_url, ''),
        'brand_primary_color', COALESCE(primary_color, '#6366f1'),
        'brand_secondary_color', COALESCE(secondary_color, '#8b5cf6'),
        'support_email', COALESCE(support_email, 'suporte@app.com'),
        'app_url', COALESCE(app_url, 'https://app.com')
    )
    FROM public.brand_settings
    LIMIT 1;
$$;

-- =========================================================
-- 26. ACTIVE SUBSCRIPTION CHECK FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin_user boolean;
    sub_status text;
    acc_status text;
BEGIN
    -- Admins bypass subscription check
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    ) INTO is_admin_user;
    
    IF is_admin_user THEN
        RETURN true;
    END IF;
    
    -- Check subscription status
    SELECT subscription_status, account_status
    INTO sub_status, acc_status
    FROM public.profiles
    WHERE id = check_user_id;
    
    IF acc_status = 'cancelled' THEN
        RETURN false;
    END IF;
    
    RETURN sub_status IN ('active', 'trialing');
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;

-- =========================================================
-- 27. AUTO-CREATE PROFILE ON USER SIGNUP
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, subscription_status, account_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'none',
        'pending'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- SUMMARY
-- =========================================================
-- This migration adds:
-- - All missing RLS policies for tables
-- - subscription_plans table for dynamic plans
-- - push_subscriptions and notification_settings tables
-- - Helper functions (is_admin, has_role, has_active_subscription, etc.)
-- - Auto-profile creation trigger
-- - Branding helper function
-- =========================================================
