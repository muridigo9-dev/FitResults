-- Add branding_seo_enabled feature flag
INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES (
  'branding_seo_enabled', 
  'Permite que o admin configure meta tags de SEO (título, descrição, etc)', 
  true, 
  false, 
  '["admin", "branding", "seo"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
