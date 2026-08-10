-- Allow anonymous users to read branding settings (Essential for Landing Page white-labeling)
-- This migration updates the RLS policy to allow 'public' (unauthenticated) access to branding configuration.

DROP POLICY IF EXISTS "Anyone can read global branding" ON public.brand_settings;

CREATE POLICY "Anyone can read global branding"
  ON public.brand_settings
  FOR SELECT
  TO public
  USING (true);

-- Ensure the helper function get_user_branding is also accessible (usually it is as SECURITY DEFINER)
-- and handles NULL user_id by returning global branding.
