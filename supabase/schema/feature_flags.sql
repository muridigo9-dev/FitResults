-- ================================================
-- FEATURE FLAGS SYSTEM
-- Complete feature control with user content permissions
-- ================================================

-- ==========================================
-- 1. FEATURE FLAGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    description text,
    enabled boolean NOT NULL DEFAULT true,
    allow_user_content boolean NOT NULL DEFAULT false,
    affects jsonb DEFAULT '[]'::jsonb, -- Array of affected modules: ["diets", "workouts", "challenges"]
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admin can manage feature flags
CREATE POLICY "Admin manages feature flags"
ON public.feature_flags
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can read feature flags
CREATE POLICY "Users read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- ==========================================
-- 2. FEATURE FLAG AUDIT LOG
-- ==========================================
CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id uuid REFERENCES public.feature_flags(id) ON DELETE CASCADE,
    flag_key text NOT NULL,
    action text NOT NULL CHECK (action IN ('created', 'enabled', 'disabled', 'updated', 'deleted')),
    old_value jsonb,
    new_value jsonb,
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;

-- Admin can read audit log
CREATE POLICY "Admin reads audit log"
ON public.feature_flag_audit
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Service can insert audit logs
CREATE POLICY "Service inserts audit logs"
ON public.feature_flag_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==========================================
-- 3. FEATURE USAGE TRACKING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'view', 'create', 'interact'
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Admin can read all usage
CREATE POLICY "Admin reads all usage"
ON public.feature_usage
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Users can insert their own usage
CREATE POLICY "Users insert own usage"
ON public.feature_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_id ON public.feature_flag_audit(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_changed_at ON public.feature_flag_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_flag_key ON public.feature_usage(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at ON public.feature_usage(created_at DESC);

-- ==========================================
-- 5. HELPER FUNCTIONS
-- ==========================================

-- Check if a feature flag is enabled
CREATE OR REPLACE FUNCTION public.is_feature_enabled(flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT enabled FROM public.feature_flags WHERE key = flag_key LIMIT 1),
        false -- Default to disabled if flag doesn't exist (fail-safe)
    );
$$;

-- Check if user content is allowed for a feature
CREATE OR REPLACE FUNCTION public.is_user_content_allowed(flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT enabled AND allow_user_content FROM public.feature_flags WHERE key = flag_key LIMIT 1),
        false -- Default to disabled if flag doesn't exist
    );
$$;

-- Get all feature flags as JSON (for client caching)
CREATE OR REPLACE FUNCTION public.get_feature_flags()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        jsonb_object_agg(
            key,
            jsonb_build_object(
                'enabled', enabled,
                'allowUserContent', allow_user_content,
                'affects', affects
            )
        ),
        '{}'::jsonb
    )
    FROM public.feature_flags;
$$;

-- Log feature flag change
CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.feature_flag_audit (flag_id, flag_key, action, new_value, changed_by)
        VALUES (NEW.id, NEW.key, 'created', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine specific action
        DECLARE
            action_type text;
        BEGIN
            IF OLD.enabled = true AND NEW.enabled = false THEN
                action_type := 'disabled';
            ELSIF OLD.enabled = false AND NEW.enabled = true THEN
                action_type := 'enabled';
            ELSE
                action_type := 'updated';
            END IF;
            
            INSERT INTO public.feature_flag_audit (flag_id, flag_key, action, old_value, new_value, changed_by)
            VALUES (NEW.id, NEW.key, action_type, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        END;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.feature_flag_audit (flag_id, flag_key, action, old_value, changed_by)
        VALUES (OLD.id, OLD.key, 'deleted', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS feature_flag_audit_trigger ON public.feature_flags;
CREATE TRIGGER feature_flag_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.log_feature_flag_change();

-- ==========================================
-- 6. DEFAULT FEATURE FLAGS
-- ==========================================
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES 
    ('diets_enabled', 'Permite acesso ao módulo de dietas', true, false, '["diets"]'::jsonb),
    ('workouts_enabled', 'Permite acesso ao módulo de treinos', true, false, '["workouts"]'::jsonb),
    ('challenges_enabled', 'Permite acesso ao módulo de desafios', true, false, '["challenges"]'::jsonb),
    ('user_custom_diets', 'Permite que usuários criem suas próprias dietas', true, true, '["diets", "user_content"]'::jsonb),
    ('user_custom_workouts', 'Permite que usuários criem seus próprios treinos', true, true, '["workouts", "user_content"]'::jsonb),
    ('user_custom_foods', 'Permite que usuários adicionem alimentos personalizados', true, true, '["nutrition", "user_content"]'::jsonb),
    ('gamification_enabled', 'Ativa sistema de pontos, conquistas e rankings', true, false, '["gamification", "achievements"]'::jsonb),
    ('habits_enabled', 'Ativa módulo de acompanhamento de hábitos', true, false, '["habits", "checkin"]'::jsonb),
    ('push_notifications', 'Permite envio de notificações push', true, false, '["notifications"]'::jsonb),
    ('water_tracking', 'Ativa rastreamento de consumo de água', true, false, '["hydration", "checkin"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 7. USAGE METRICS VIEW (Admin only)
-- ==========================================
CREATE OR REPLACE VIEW public.feature_flag_metrics AS
SELECT 
    ff.key,
    ff.description,
    ff.enabled,
    ff.allow_user_content,
    ff.affects,
    ff.updated_at,
    COALESCE(usage_stats.total_users, 0) as total_users,
    COALESCE(usage_stats.total_actions, 0) as total_actions,
    COALESCE(usage_stats.views, 0) as views,
    COALESCE(usage_stats.creates, 0) as creates,
    COALESCE(usage_stats.interactions, 0) as interactions
FROM public.feature_flags ff
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE action = 'view') as views,
        COUNT(*) FILTER (WHERE action = 'create') as creates,
        COUNT(*) FILTER (WHERE action = 'interact') as interactions
    FROM public.feature_usage fu
    WHERE fu.flag_key = ff.key
    AND fu.created_at > NOW() - INTERVAL '30 days'
) usage_stats ON true;
