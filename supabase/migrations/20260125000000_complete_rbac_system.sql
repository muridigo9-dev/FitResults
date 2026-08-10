-- ============================================================
-- COMPLETE RBAC + FEATURE FLAGS + PLAN FEATURES SYSTEM
-- ============================================================
-- This migration consolidates ALL access control logic into one file
-- Replaces/supersedes:
--   - 20260118000001_plan_features_system.sql
--   - 20260122000001_permissions_admin.sql
--   - 20260122000015_consolidated_feature_flags.sql
--   - All legacy feature flag migrations

-- ============================================
-- PART 1: PLAN INFRASTRUCTURE
-- ============================================

-- Add plan columns to profiles and academies
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_current_plan ON public.profiles(current_plan_id);
CREATE INDEX IF NOT EXISTS idx_academies_plan ON public.academies(plan_id);

-- ============================================
-- PART 2: RBAC TABLES
-- ============================================

-- 2.1 Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL,
    permission text NOT NULL,
    resource text DEFAULT 'all',
    allowed boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(role, permission, resource)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages role permissions" ON public.role_permissions;
CREATE POLICY "Admin manages role permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read role permissions" ON public.role_permissions;
CREATE POLICY "Users read role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission);

-- 2.2 Plan Features Table
CREATE TABLE IF NOT EXISTS public.plan_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(plan_id, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages plan features" ON public.plan_features;
CREATE POLICY "Admin manages plan features"
ON public.plan_features FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read plan features" ON public.plan_features;
CREATE POLICY "Users read plan features"
ON public.plan_features FOR SELECT TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);

-- 2.3 Permissions Audit Log
CREATE TABLE IF NOT EXISTS public.permissions_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    old_value jsonb,
    new_value jsonb,
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.permissions_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads permissions audit" ON public.permissions_audit;
CREATE POLICY "Admin reads permissions audit"
ON public.permissions_audit FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "System inserts audit logs" ON public.permissions_audit;
CREATE POLICY "System inserts audit logs"
ON public.permissions_audit FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_permissions_audit_table ON public.permissions_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_permissions_audit_changed_at ON public.permissions_audit(changed_at DESC);

-- ============================================
-- PART 3: FEATURE FLAGS SYSTEM
-- ============================================

-- 3.1 Insert Core Feature Flags
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES 
  -- Core Content Modules
  ('exercises_enabled', 'Habilita módulo de exercícios', true, false, '["exercises"]'::jsonb),
  ('training_mode_enabled', 'Habilita módulo de treinos', true, false, '["workouts"]'::jsonb),
  ('diets_enabled', 'Habilita módulo de dietas', true, false, '["diets"]'::jsonb),
  ('challenges_enabled', 'Habilita módulo de desafios', true, false, '["challenges"]'::jsonb),
  
  -- User Content Creation
  ('user_custom_workouts', 'Permite usuários criarem treinos próprios', true, true, '["workouts", "user_content"]'::jsonb),
  ('user_custom_diets', 'Permite usuários criarem dietas próprias', true, true, '["diets", "user_content"]'::jsonb),
  ('student_custom_meals_enabled', 'Permite alunos criarem refeições/pratos customizados', true, true, '["dishes"]'::jsonb)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled,
    allow_user_content = EXCLUDED.allow_user_content,
    affects = EXCLUDED.affects;

-- 3.2 Admin Policies for Feature Flags
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admin manages feature flags" ON public.feature_flags;
  DROP POLICY IF EXISTS "Admins can update feature flags" ON public.feature_flags;
  DROP POLICY IF EXISTS "Admins can insert feature flags" ON public.feature_flags;
  DROP POLICY IF EXISTS "Admins can delete feature flags" ON public.feature_flags;
END $$;

CREATE POLICY "Admins can update feature flags"
ON public.feature_flags FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert feature flags"
ON public.feature_flags FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete feature flags"
ON public.feature_flags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- ============================================
-- PART 4: CONTENT FEATURE MAPPING
-- ============================================

CREATE TABLE IF NOT EXISTS public.content_feature_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  feature_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(table_name, feature_key)
);

ALTER TABLE public.content_feature_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read content feature mapping" ON public.content_feature_mapping;
CREATE POLICY "Everyone can read content feature mapping"
ON public.content_feature_mapping FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.content_feature_mapping (table_name, feature_key)
VALUES 
  ('exercises', 'exercises_enabled'),
  ('workouts', 'training_mode_enabled'),
  ('dishes', 'diets_enabled'),
  ('diet_plans', 'diets_enabled'),
  ('challenges', 'challenges_enabled')
ON CONFLICT (table_name, feature_key) DO NOTHING;

-- ============================================
-- PART 5: CONSOLIDATED RLS POLICIES FOR CONTENT
-- ============================================

-- Exercises
DROP POLICY IF EXISTS "Users can view exercises" ON public.exercises;
CREATE POLICY "Users can view exercises"
ON public.exercises FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_view_content(visibility, plan_ids, auth.uid(), created_by_id, academy_id)
);

-- Workouts
DROP POLICY IF EXISTS "Users can view visible workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view workouts" ON public.workouts;
CREATE POLICY "Users can view workouts"
ON public.workouts FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- Dishes
DROP POLICY IF EXISTS "Users can view active dishes" ON public.dishes;
DROP POLICY IF EXISTS "Users can view active diets" ON public.dishes;
CREATE POLICY "Users can view dishes"
ON public.dishes FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- Challenges
DROP POLICY IF EXISTS "Users can view challenges" ON public.challenges;
CREATE POLICY "Users can view challenges"
ON public.challenges FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- ============================================
-- PART 6: USER CONTENT CREATION POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users insert own workouts with flag check" ON public.user_workouts;
CREATE POLICY "Users insert own workouts with flag check"
ON public.user_workouts FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (public.is_admin() OR public.is_user_content_allowed('user_custom_workouts'))
);

DROP POLICY IF EXISTS "Users insert own diets with flag check" ON public.user_diets;
CREATE POLICY "Users insert own diets with flag check"
ON public.user_diets FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (public.is_admin() OR public.is_user_content_allowed('user_custom_diets'))
);

-- ============================================
-- PART 7: HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.permissions_audit (table_name, record_id, action, new_value, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'created', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.permissions_audit (table_name, record_id, action, old_value, new_value, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.permissions_audit (table_name, record_id, action, old_value, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_role_permission(
    p_role text,
    p_permission text,
    p_resource text DEFAULT 'all'
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT allowed 
         FROM public.role_permissions 
         WHERE role = p_role 
         AND permission = p_permission 
         AND (resource = p_resource OR resource = 'all')
         LIMIT 1),
        CASE WHEN p_role = 'admin' THEN true ELSE false END
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_role_permission(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE(permission text, resource text, allowed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    IF v_role IS NULL THEN
        v_role := 'user';
    END IF;
    
    RETURN QUERY
    SELECT rp.permission, rp.resource, rp.allowed
    FROM public.role_permissions rp
    WHERE rp.role = v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;

-- ============================================
-- PART 8: AUDIT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS role_permissions_audit_trigger ON public.role_permissions;
CREATE TRIGGER role_permissions_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

DROP TRIGGER IF EXISTS plan_features_audit_trigger ON public.plan_features;
CREATE TRIGGER plan_features_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.plan_features
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

-- ============================================
-- PART 9: DEFAULT PERMISSIONS
-- ============================================

INSERT INTO public.role_permissions (role, permission, resource, allowed)
VALUES 
    -- Admin: full access
    ('admin', 'manage_users', 'all', true),
    ('admin', 'manage_content', 'all', true),
    ('admin', 'manage_settings', 'all', true),
    ('admin', 'view_admin', 'all', true),
    ('admin', 'create_content', 'all', true),
    
    -- Academy Admin
    ('academy_admin', 'manage_content', 'all', true),
    ('academy_admin', 'create_content', 'all', true),
    ('academy_admin', 'view_admin', 'all', false),
    
    -- Personal Trainer
    ('personal_trainer', 'manage_content', 'all', true),
    ('personal_trainer', 'create_content', 'all', true),
    ('personal_trainer', 'view_admin', 'all', false),
    
    -- Content Creator
    ('content_creator', 'create_content', 'all', true),
    ('content_creator', 'view_admin', 'all', false),
    
    -- Student/User
    ('aluno', 'view_content', 'all', true),
    ('aluno', 'create_content', 'diets', true),
    ('aluno', 'create_content', 'workouts', true),
    
    ('user', 'view_content', 'all', true),
    ('user', 'create_content', 'diets', true),
    ('user', 'create_content', 'workouts', true)
ON CONFLICT (role, permission, resource) DO NOTHING;

-- ============================================
-- DONE
-- ============================================
DO $$ BEGIN RAISE NOTICE 'Complete RBAC + Feature Flags system applied successfully'; END $$;
