-- =====================================================
-- APP SETTINGS TABLE (Criação da tabela)
-- =====================================================
-- Esta migração cria a tabela app_settings ANTES do seed data

-- Função update_updated_at_column (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
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

-- Seed inicial de app_settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('app_name', 'FitLife', 'Nome do aplicativo'),
  ('app_logo_url', NULL, 'URL do logo'),
  ('primary_color', '#8B5CF6', 'Cor primaria'),
  ('push_notifications_enabled', 'false', 'Feature flag: push notifications'),
  ('allow_user_diet_creation', 'false', 'Feature flag: usuarios podem criar dietas'),
  ('allow_user_workout_creation', 'false', 'Feature flag: usuarios podem criar treinos'),
  ('default_water_goal', '2000', 'Meta de agua padrao em ml')
ON CONFLICT (key) DO NOTHING;
