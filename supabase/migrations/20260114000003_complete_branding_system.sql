-- =====================================================
-- COMPLETE BRANDING SYSTEM (White-Label)
-- 
-- Separação clara entre:
-- 1. Global Branding (SUPER ADMIN) - brand_settings
-- 2. Academy Branding (por academia) - academies.branding
-- 
-- Contextos:
-- - Modo Normal: Apenas global branding
-- - Modo Academia: Global branding (admin areas) + Academy branding (student areas)
-- =====================================================

-- =====================================================
-- 1. GLOBAL BRANDING TABLE (brand_settings)
-- =====================================================

-- Garantir que existe uma única linha de configuração global
CREATE OR REPLACE FUNCTION public.ensure_single_brand_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se já existe uma linha, previne inserção
  IF (SELECT COUNT(*) FROM public.brand_settings) > 0 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Only one brand_settings record is allowed. Update the existing one.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_brand_settings_trigger ON public.brand_settings;
CREATE TRIGGER ensure_single_brand_settings_trigger
  BEFORE INSERT ON public.brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_brand_settings();

-- Adicionar colunas faltantes para dark mode e light mode completos
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS dark_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS dark_secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS dark_tertiary_color TEXT,
  ADD COLUMN IF NOT EXISTS dark_quaternary_color TEXT,
  ADD COLUMN IF NOT EXISTS dark_accent_color TEXT,
  ADD COLUMN IF NOT EXISTS dark_text_primary TEXT,
  ADD COLUMN IF NOT EXISTS dark_text_secondary TEXT,
  ADD COLUMN IF NOT EXISTS dark_text_muted TEXT,
  ADD COLUMN IF NOT EXISTS dark_background TEXT,
  ADD COLUMN IF NOT EXISTS dark_surface TEXT,
  ADD COLUMN IF NOT EXISTS dark_surface_elevated TEXT,
  ADD COLUMN IF NOT EXISTS light_background TEXT,
  ADD COLUMN IF NOT EXISTS light_surface TEXT,
  ADD COLUMN IF NOT EXISTS light_surface_elevated TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT DEFAULT 'https://app.com',
  ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'suporte@app.com';

-- Índice para performance (mesmo sendo tabela única)
CREATE INDEX IF NOT EXISTS idx_brand_settings_updated ON public.brand_settings(updated_at DESC);

COMMENT ON TABLE public.brand_settings IS 'Global branding configuration (SUPER ADMIN only). Used for: admin panels, non-academy users, default fallback.';

-- =====================================================
-- 2. ACADEMY BRANDING (academies.branding JSONB)
-- =====================================================

-- Garantir que academies.branding tem estrutura correta
COMMENT ON COLUMN public.academies.branding IS 'Academy-specific branding (JSONB). Structure: {
  "logo_url": "string",
  "primary_color": "string",
  "secondary_color": "string", 
  "tertiary_color": "string",
  "quaternary_color": "string",
  "accent_color": "string",
  "text_primary": "string",
  "text_secondary": "string",
  "text_muted": "string",
  "light_background": "string",
  "light_surface": "string",
  "light_surface_elevated": "string",
  "dark_primary_color": "string",
  "dark_secondary_color": "string",
  "dark_tertiary_color": "string",
  "dark_quaternary_color": "string",
  "dark_accent_color": "string",
  "dark_text_primary": "string",
  "dark_text_secondary": "string",
  "dark_text_muted": "string",
  "dark_background": "string",
  "dark_surface": "string",
  "dark_surface_elevated": "string",
  "font_family": "string",
  "font_base_size": number
}';

-- =====================================================
-- 3. FUNÇÕES HELPER PARA BRANDING
-- =====================================================

-- Função para obter branding correto baseado no contexto
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
  -- Adiciona source para saber de onde veio
  RETURN COALESCE(v_global_branding, '{}'::jsonb) || v_academy_branding || jsonb_build_object('source', 'academy', 'academy_id', v_primary_academy_id);
END;
$$;

COMMENT ON FUNCTION public.get_user_branding(UUID) IS 'Returns branding configuration for a user. In academy mode, returns academy branding; otherwise returns global branding.';

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- brand_settings RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read global branding" ON public.brand_settings;
CREATE POLICY "Anyone can read global branding"
  ON public.brand_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage global branding" ON public.brand_settings;
CREATE POLICY "Admin can manage global branding"
  ON public.brand_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- academies.branding RLS (já existe, mas vamos garantir)
-- Academy admins podem atualizar branding da sua academia
DROP POLICY IF EXISTS "Academy admins can update academy branding" ON public.academies;
CREATE POLICY "Academy admins can update academy branding"
  ON public.academies
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    OR id IN (
      SELECT academy_id 
      FROM public.academy_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- =====================================================
-- 5. SEED DEFAULT GLOBAL BRANDING
-- =====================================================

-- Inserir branding global padrão (se não existir)
INSERT INTO public.brand_settings (
  app_name,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  tertiary_color,
  quaternary_color,
  accent_color,
  text_primary,
  text_secondary,
  text_muted,
  font_family,
  font_base_size,
  light_background,
  light_surface,
  light_surface_elevated,
  dark_primary_color,
  dark_secondary_color,
  dark_tertiary_color,
  dark_quaternary_color,
  dark_accent_color,
  dark_text_primary,
  dark_text_secondary,
  dark_text_muted,
  dark_background,
  dark_surface,
  dark_surface_elevated,
  support_email,
  app_url,
  tagline
)
SELECT
  'FlexiBloom',
  '',
  '',
  '#8B5CF6', -- purple-500
  '#6366F1', -- indigo-500
  '#10B981', -- green-500
  '#F59E0B', -- amber-500
  '#EC4899', -- pink-500
  '#111827', -- gray-900
  '#6B7280', -- gray-500
  '#9CA3AF', -- gray-400
  'Inter, system-ui, sans-serif',
  16,
  '#FFFFFF', -- white
  '#F9FAFB', -- gray-50
  '#FFFFFF', -- white
  '#7C3AED', -- purple-600 (darker)
  '#4F46E5', -- indigo-600
  '#059669', -- green-600
  '#D97706', -- amber-600
  '#DB2777', -- pink-600
  '#F9FAFB', -- gray-50 (light text on dark bg)
  '#D1D5DB', -- gray-300
  '#9CA3AF', -- gray-400
  '#111827', -- gray-900 (dark bg)
  '#1F2937', -- gray-800 (dark surface)
  '#374151', -- gray-700 (dark elevated)
  'suporte@flexibloom.com',
  'https://flexibloom.com',
  'Seu app de fitness e saúde'
WHERE NOT EXISTS (SELECT 1 FROM public.brand_settings LIMIT 1);

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration creates:
-- ✅ Complete global branding table with light/dark mode
-- ✅ Academy-specific branding via JSONB
-- ✅ Helper function get_user_branding() for context-aware branding
-- ✅ Proper RLS policies for both global and academy branding
-- ✅ Fallback logic: academy branding -> global branding
-- ✅ Single source of truth for branding configuration
-- =====================================================
