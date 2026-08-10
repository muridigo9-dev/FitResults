-- ============================================
-- APP SETTINGS KEY-VALUE (ATUALIZAÇÃO)
-- ============================================

-- Nota: Esta migração atualiza app_settings para o formato key-value
-- Não usa DROP TABLE para preservar dados existentes

-- ============================================
-- 1. SEED VALORES ADICIONAIS
-- ============================================
INSERT INTO public.app_settings (key, value, description) VALUES
  ('allow_user_diet_creation', 'false', 'Feature flag: usuarios podem criar dietas'),
  ('allow_user_workout_creation', 'false', 'Feature flag: usuarios podem criar treinos'),
  ('default_water_goal', '2000', 'Meta de agua padrao em ml')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 2. RLS POLICIES (idempotent)
-- ============================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify app settings" ON public.app_settings;
CREATE POLICY "Only admins can modify app settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can insert app settings" ON public.app_settings;
CREATE POLICY "Only admins can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete app settings" ON public.app_settings;
CREATE POLICY "Only admins can delete app settings"
  ON public.app_settings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
