-- ================================================
-- FEATURE FLAGS SYSTEM
-- ================================================

-- ============================================
-- 1. FEATURE FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    description text,
    enabled boolean NOT NULL DEFAULT true,
    allow_user_content boolean NOT NULL DEFAULT false,
    affects jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages feature flags" ON public.feature_flags;
CREATE POLICY "Admin manages feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read feature flags" ON public.feature_flags;
CREATE POLICY "Users read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

-- ============================================
-- 2. FEATURE FLAG AUDIT LOG
-- ============================================
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

ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads audit log" ON public.feature_flag_audit;
CREATE POLICY "Admin reads audit log"
ON public.feature_flag_audit FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Service inserts audit logs" ON public.feature_flag_audit;
CREATE POLICY "Service inserts audit logs"
ON public.feature_flag_audit FOR INSERT TO authenticated
WITH CHECK (true);

-- ============================================
-- 3. FEATURE USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads all usage" ON public.feature_usage;
CREATE POLICY "Admin reads all usage"
ON public.feature_usage FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Users insert own usage" ON public.feature_usage;
CREATE POLICY "Users insert own usage"
ON public.feature_usage FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_id ON public.feature_flag_audit(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_changed_at ON public.feature_flag_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_flag_key ON public.feature_usage(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at ON public.feature_usage(created_at DESC);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(flag_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT enabled FROM public.feature_flags WHERE key = flag_key LIMIT 1),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_user_content_allowed(flag_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT enabled AND allow_user_content FROM public.feature_flags WHERE key = flag_key LIMIT 1),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.get_feature_flags()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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

-- ============================================
-- 6. AUDIT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.feature_flag_audit (flag_id, flag_key, action, new_value, changed_by)
        VALUES (NEW.id, NEW.key, 'created', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        DECLARE action_type text;
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

DROP TRIGGER IF EXISTS feature_flag_audit_trigger ON public.feature_flags;
CREATE TRIGGER feature_flag_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.log_feature_flag_change();

-- ============================================
-- 7. DEFAULT FLAGS
-- ============================================
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES 
    ('diets_enabled', 'Permite acesso ao módulo de dietas', true, false, '["diets"]'::jsonb),
    ('workouts_enabled', 'Permite acesso ao módulo de treinos', true, false, '["workouts"]'::jsonb),
    ('challenges_enabled', 'Permite acesso ao módulo de desafios', true, false, '["challenges"]'::jsonb),
    ('user_custom_diets', 'Permite que usuários criem suas próprias dietas', true, true, '["diets", "user_content"]'::jsonb),
    ('user_custom_workouts', 'Permite que usuários criem seus próprios treinos', true, true, '["workouts", "user_content"]'::jsonb),
    ('user_custom_foods', 'Permite que usuários adicionem alimentos personalizados', true, true, '["nutrition", "user_content"]'::jsonb),
    ('gamification_enabled', 'Ativa sistema de pontos e conquistas', true, false, '["gamification"]'::jsonb),
    ('habits_enabled', 'Ativa módulo de hábitos', true, false, '["habits"]'::jsonb),
    ('push_notifications', 'Permite notificações push', true, false, '["notifications"]'::jsonb),
    ('water_tracking', 'Ativa rastreamento de água', true, false, '["hydration"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
