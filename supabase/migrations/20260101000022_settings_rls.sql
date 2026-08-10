-- =====================================================
-- SETTINGS RLS POLICIES
-- brand_settings, macro_templates, xp_settings
-- =====================================================

-- =====================================================
-- BRAND SETTINGS
-- =====================================================
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read brand_settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Admin manages brand_settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Admin manages brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can read brand settings" ON public.brand_settings;

CREATE POLICY "Read brand_settings"
ON public.brand_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages brand_settings"
ON public.brand_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- MACRO TEMPLATES
-- =====================================================
ALTER TABLE public.macro_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read macro_templates" ON public.macro_templates;
DROP POLICY IF EXISTS "Admin manages macro_templates" ON public.macro_templates;

CREATE POLICY "Read macro_templates"
ON public.macro_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages macro_templates"
ON public.macro_templates FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- XP SETTINGS
-- =====================================================
ALTER TABLE public.xp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read xp_settings" ON public.xp_settings;
DROP POLICY IF EXISTS "Admin manages xp_settings" ON public.xp_settings;

CREATE POLICY "Read xp_settings"
ON public.xp_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages xp_settings"
ON public.xp_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
