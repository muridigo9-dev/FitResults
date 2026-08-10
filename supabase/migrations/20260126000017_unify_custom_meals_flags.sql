-- ============================================================
-- UNIFY CUSTOM MEALS FLAGS & RLS
-- ============================================================

-- 1. Remove Deprecated Flags
ALTER TABLE public.feature_flags DISABLE TRIGGER feature_flag_audit_trigger;

DELETE FROM public.feature_flags 
WHERE key IN ('student_custom_meals_enabled', 'user_custom_foods');

ALTER TABLE public.feature_flags ENABLE TRIGGER feature_flag_audit_trigger;

-- 2. Ensure Main Flag Exists and is Correct
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
    'user_custom_diets', 
    'Permite que usuários criem suas próprias refeições/dietas', 
    true, 
    true, 
    '["diets", "user_content"]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    allow_user_content = true,
    affects = '["diets", "user_content"]'::jsonb;

-- 3. RLS Policies for Custom Dishes (Meals)

-- Ensure columns exist for RLS and user content
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'admin';
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS content_origin TEXT DEFAULT 'system';

-- Enable RLS just in case
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

-- INSERT Policy: Auth user + Flag active
DROP POLICY IF EXISTS "Users create own dishes if permitted" ON public.dishes;
CREATE POLICY "Users create own dishes if permitted"
ON public.dishes FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = owner_id 
    AND owner_type = 'student'
    AND (public.is_admin() OR public.is_user_content_allowed('user_custom_diets'))
);

-- UPDATE Policy: Auth user + Own dish + Flag active
DROP POLICY IF EXISTS "Users update own dishes if permitted" ON public.dishes;
CREATE POLICY "Users update own dishes if permitted"
ON public.dishes FOR UPDATE TO authenticated
USING (
    auth.uid() = owner_id 
    AND owner_type = 'student'
    AND (public.is_admin() OR public.is_user_content_allowed('user_custom_diets'))
)
WITH CHECK (
    auth.uid() = owner_id 
    AND owner_type = 'student'
    AND (public.is_admin() OR public.is_user_content_allowed('user_custom_diets'))
);

-- DELETE Policy: Auth user + Own dish + Flag active
DROP POLICY IF EXISTS "Users delete own dishes if permitted" ON public.dishes;
CREATE POLICY "Users delete own dishes if permitted"
ON public.dishes FOR DELETE TO authenticated
USING (
    auth.uid() = owner_id 
    AND owner_type = 'student'
    AND (public.is_admin() OR public.is_user_content_allowed('user_custom_diets'))
);

-- SELECT Policy (Visibility): Admin sees all, User sees System + Own
DROP POLICY IF EXISTS "Dishes visibility" ON public.dishes;
CREATE POLICY "Dishes visibility"
ON public.dishes FOR SELECT TO authenticated
USING (
    (owner_type != 'student') -- System/Admin dishes
    OR 
    (owner_type = 'student' AND owner_id = auth.uid()) -- Own dishes
    OR
    public.is_admin() -- Admin everything
);
