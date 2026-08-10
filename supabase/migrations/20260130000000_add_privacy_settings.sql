-- Migration to add privacy policy and terms settings
-- Idempotent script

-- 1. Add Default Privacy Policy and Terms of Use if they don't exist
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('privacy_policy', '# Política de Privacidade\n\nSua privacidade é importante para nós. É política do FitResults respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site FitResults, e outros sites que possuímos e operamos.\n\n## 1. Coleta de Dados\n\nSolicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.\n\n## 2. Uso de Informações\n\nNão compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.\n\n## 3. Retenção de Dados\n\nApenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado.', 'Conteúdo da Política de Privacidade em Markdown'),
  ('terms_of_use', '# Termos de Uso\n\nAo acessar o FitResults, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.', 'Conteúdo dos Termos de Uso em Markdown')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description
WHERE public.app_settings.value IS NULL OR public.app_settings.value = '';

-- 2. Ensure anyone can read app settings (Policy already exists in 20260101000009_app_settings.sql)
-- But let's verify if we need a more specific public policy if we want it accessible without auth
-- Actually, the request says "public page", so we need to allow public access to these specific keys.

DROP POLICY IF EXISTS "Public can read specific app settings" ON public.app_settings;
CREATE POLICY "Public can read specific app settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('privacy_policy', 'terms_of_use', 'app_name', 'app_logo_url', 'primary_color'));
