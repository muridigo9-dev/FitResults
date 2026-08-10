-- ================================================
-- ADD SUPPORT EMAIL CONFIGURATION
-- ================================================
-- Creates app_settings table if not exists and adds
-- support email configuration for white-label deployment

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
DROP POLICY IF EXISTS "All users can read app settings" ON public.app_settings;
CREATE POLICY "All users can read app settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

-- Only admins can modify settings
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add support email setting
INSERT INTO public.app_settings (key, value, description)
VALUES (
    'support_email',
    'support@example.com',
    'Email de contato quando o sistema de suporte está desabilitado'
)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);
