-- =====================================================
-- ADMIN BOOTSTRAP MIGRATION
-- Creates the first admin user from environment or email
-- Run this AFTER initial_schema and complete_rls_and_tables
-- =====================================================

-- =========================================================
-- 1. FUNCTION TO PROVISION ADMIN FROM EXISTING USER
-- =========================================================

CREATE OR REPLACE FUNCTION public.provision_admin(admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
        'active',
        'active'
    FROM auth.users au
    WHERE au.id = admin_user_id
    ON CONFLICT (id) DO UPDATE SET
        subscription_status = 'active',
        account_status = 'active',
        updated_at = now();

    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Admin provisioned successfully for user: %', admin_user_id;
END;
$$;

-- Grant execute only to service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.provision_admin(uuid) TO service_role;

-- =========================================================
-- 2. FUNCTION TO PROVISION ADMIN BY EMAIL
-- =========================================================

CREATE OR REPLACE FUNCTION public.provision_admin_by_email(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_user_id uuid;
BEGIN
    -- Find user by email
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF found_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', admin_email;
    END IF;
    
    -- Provision as admin
    PERFORM public.provision_admin(found_user_id);
    
    RETURN found_user_id;
END;
$$;

-- Grant execute only to service_role
GRANT EXECUTE ON FUNCTION public.provision_admin_by_email(text) TO service_role;

-- =========================================================
-- 3. VIEW FOR ADMIN STATS
-- =========================================================

CREATE OR REPLACE VIEW public.admin_stats AS
SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'trialing') as trialing_users,
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_status IN ('past_due', 'expired')) as expired_users,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days') as new_users_7d,
    (SELECT COUNT(*) FROM public.daily_checkins WHERE date > now() - interval '7 days') as checkins_7d,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open') as open_tickets,
    (SELECT COUNT(*) FROM public.account_cancellation_requests WHERE status = 'pending') as pending_cancellations;

-- Grant access to admins only
GRANT SELECT ON public.admin_stats TO authenticated;

-- =========================================================
-- 4. FUNCTION TO CREATE TEST USER (for development)
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_test_user_entry(
    test_email text,
    test_name text DEFAULT 'Test User',
    test_subscription_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create test users';
    END IF;
    
    -- Find user by email
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = test_email;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Create the user in Supabase Auth first.', test_email;
    END IF;
    
    -- Update profile
    UPDATE public.profiles
    SET 
        full_name = test_name,
        subscription_status = test_subscription_status,
        account_status = 'active',
        updated_at = now()
    WHERE id = test_user_id;
    
    RETURN test_user_id;
END;
$$;

-- =========================================================
-- 5. INSERT DEFAULT LEVELS FOR GAMIFICATION
-- =========================================================

INSERT INTO public.levels (level_number, name, min_xp, max_xp, color)
VALUES 
    (1, 'Iniciante', 0, 99, '#94a3b8'),
    (2, 'Aprendiz', 100, 299, '#22c55e'),
    (3, 'Praticante', 300, 599, '#3b82f6'),
    (4, 'Dedicado', 600, 999, '#8b5cf6'),
    (5, 'Experiente', 1000, 1499, '#f59e0b'),
    (6, 'Avançado', 1500, 2499, '#ef4444'),
    (7, 'Expert', 2500, 3999, '#ec4899'),
    (8, 'Mestre', 4000, 5999, '#06b6d4'),
    (9, 'Lenda', 6000, 9999, '#f97316'),
    (10, 'Elite', 10000, 999999, '#eab308')
ON CONFLICT DO NOTHING;

-- =========================================================
-- 6. INSERT DEFAULT ACHIEVEMENTS
-- =========================================================

INSERT INTO public.achievements (name, description, icon, color, requirement_type, requirement_value, xp_reward, is_active)
VALUES 
    ('Primeiro Passo', 'Complete seu primeiro check-in', 'footprints', '#22c55e', 'checkins', 1, 10, true),
    ('Constância', 'Complete 7 check-ins', 'calendar-check', '#3b82f6', 'checkins', 7, 50, true),
    ('Dedicação', 'Complete 30 check-ins', 'flame', '#f59e0b', 'checkins', 30, 100, true),
    ('Hidratado', 'Atinja a meta de água 7 vezes', 'droplets', '#06b6d4', 'water_goals', 7, 30, true),
    ('Sequência de 7', 'Mantenha uma sequência de 7 dias', 'zap', '#8b5cf6', 'streak', 7, 75, true),
    ('Mês Perfeito', 'Mantenha uma sequência de 30 dias', 'trophy', '#eab308', 'streak', 30, 200, true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 7. INSERT DEFAULT HABITS
-- =========================================================

INSERT INTO public.habits (name, icon, color, unit, default_goal, is_active, display_order)
VALUES 
    ('Água', 'droplets', '#06b6d4', 'ml', 2000, true, 1),
    ('Passos', 'footprints', '#22c55e', 'passos', 10000, true, 2),
    ('Sono', 'moon', '#8b5cf6', 'horas', 8, true, 3),
    ('Meditação', 'brain', '#f59e0b', 'minutos', 10, true, 4),
    ('Leitura', 'book-open', '#3b82f6', 'páginas', 20, true, 5)
ON CONFLICT DO NOTHING;

-- =========================================================
-- SUMMARY
-- =========================================================
-- This migration adds:
-- - Admin provisioning functions
-- - Admin stats view
-- - Test user creation function
-- - Default gamification data (levels, achievements)
-- - Default habits
-- =========================================================
