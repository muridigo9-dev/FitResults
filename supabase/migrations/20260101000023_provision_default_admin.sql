-- =====================================================
-- PROVISION DEFAULT ADMIN
-- This migration provisions admin@admin.com as admin
-- =====================================================

-- Provision admin if user exists
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Find admin user by email
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@admin.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Ensure profile exists with active subscription
        INSERT INTO public.profiles (id, email, full_name, subscription_status, account_status)
        VALUES (
            admin_user_id,
            'admin@admin.com',
            'Administrador',
            'active',
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            subscription_status = 'active',
            account_status = 'active',
            updated_at = now();
        
        -- Ensure admin role exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin provisioned successfully for admin@admin.com';
    ELSE
        RAISE NOTICE 'User admin@admin.com not found - will be provisioned on first login';
    END IF;
END;
$$;

-- =====================================================
-- TRIGGER TO AUTO-PROVISION ADMIN ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_provision_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the new user is admin@admin.com
    IF NEW.email = 'admin@admin.com' THEN
        -- Update profile to active
        UPDATE public.profiles
        SET 
            subscription_status = 'active',
            account_status = 'active',
            updated_at = now()
        WHERE id = NEW.id;
        
        -- Add admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Auto-provisioned admin for: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER the profile is created
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_provision_admin();

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration:
-- 1. Provisions existing admin@admin.com user as admin
-- 2. Creates trigger to auto-provision admin@admin.com on signup
-- =====================================================
