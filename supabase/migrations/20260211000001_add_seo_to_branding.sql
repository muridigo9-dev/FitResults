-- Add SEO fields to public.brand_settings
ALTER TABLE public.brand_settings 
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_author TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Update get_user_branding to include new SEO fields
CREATE OR REPLACE FUNCTION public.get_user_branding(
  _user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academy_mode_enabled BOOLEAN;
  v_user_academies UUID[];
  v_primary_academy_id UUID;
  v_academy_branding JSONB;
  v_global_branding JSONB;
BEGIN
  -- 1. Verificar se modo academia está ativo
  v_academy_mode_enabled := public.is_feature_enabled('academy_mode_enabled');
  
  -- 2. Buscar branding global
  SELECT jsonb_build_object(
    'app_name', app_name,
    'logo_url', logo_url,
    'favicon_url', favicon_url,
    'primary_color', primary_color,
    'secondary_color', secondary_color,
    'tertiary_color', tertiary_color,
    'quaternary_color', quaternary_color,
    'accent_color', accent_color,
    'text_primary', text_primary,
    'text_secondary', text_secondary,
    'text_muted', text_muted,
    'font_family', font_family,
    'font_base_size', font_base_size,
    'light_background', light_background,
    'light_surface', light_surface,
    'light_surface_elevated', light_surface_elevated,
    'dark_primary_color', dark_primary_color,
    'dark_secondary_color', dark_secondary_color,
    'dark_tertiary_color', dark_tertiary_color,
    'dark_quaternary_color', dark_quaternary_color,
    'dark_accent_color', dark_accent_color,
    'dark_text_primary', dark_text_primary,
    'dark_text_secondary', dark_text_secondary,
    'dark_text_muted', dark_text_muted,
    'dark_background', dark_background,
    'dark_surface', dark_surface,
    'dark_surface_elevated', dark_surface_elevated,
    'support_email', support_email,
    'app_url', app_url,
    'tagline', tagline,
    'landing_page_theme', landing_page_theme,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'seo_author', seo_author,
    'seo_keywords', seo_keywords,
    'og_image_url', og_image_url,
    'source', 'global'
  )
  INTO v_global_branding
  FROM public.brand_settings
  LIMIT 1;
  
  -- 3. Se modo academia NÃO está ativo, retorna global
  IF NOT v_academy_mode_enabled OR _user_id IS NULL THEN
    RETURN COALESCE(v_global_branding, '{}'::jsonb);
  END IF;
  
  -- 4. Buscar academias do usuário
  v_user_academies := public.get_user_academy_ids(_user_id);
  
  -- 5. Se usuário não está em nenhuma academia, retorna global
  IF v_user_academies IS NULL OR array_length(v_user_academies, 1) IS NULL THEN
    RETURN COALESCE(v_global_branding, '{}'::jsonb);
  END IF;
  
  -- 6. Pegar primeira academia (primary academy)
  v_primary_academy_id := v_user_academies[1];
  
  -- 7. Buscar branding da academia
  SELECT branding
  INTO v_academy_branding
  FROM public.academies
  WHERE id = v_primary_academy_id;
  
  -- 8. Se academia não tem branding customizado, retorna global
  IF v_academy_branding IS NULL OR v_academy_branding = '{}'::jsonb THEN
    RETURN COALESCE(v_global_branding, '{}'::jsonb);
  END IF;
  
  -- 9. Merge academy branding com global branding (academy sobrescreve)
  RETURN COALESCE(v_global_branding, '{}'::jsonb) || v_academy_branding || jsonb_build_object('source', 'academy', 'academy_id', v_primary_academy_id);
END;
$$;
