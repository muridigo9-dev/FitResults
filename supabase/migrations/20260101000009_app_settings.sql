-- =====================================================
-- APP SETTINGS (KEY-VALUE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed idempotente
INSERT INTO public.app_settings (key, value, description) VALUES
  ('app_name', 'FitResults', 'Nome do app no PWA manifest'),
  ('app_logo_url', '', 'URL do logo/ícone do app'),
  ('primary_color', '168 76% 42%', 'Cor primária HSL'),
  ('push_notifications_enabled', 'true', 'Feature flag push'),
  ('allow_user_diet_creation', 'false', 'Usuário pode criar dietas'),
  ('allow_user_workout_creation', 'false', 'Usuário pode criar treinos'),
  ('default_water_goal', '2000', 'Meta de água em ml')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins modify app settings" ON public.app_settings;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins modify app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
