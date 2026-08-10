-- =====================================================
-- UPDATE PROFILES AND FEATURE FLAGS FOR FACEBOOK AUTH
-- Arquivo: 20260205000003_facebook_auth_support.sql
-- Objetivo: Suporte a login via Facebook
-- =====================================================

-- 1. Adicionar facebook_id à tabela profiles
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS facebook_id TEXT;

-- 2. Criar índice único para facebook_id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_facebook_id_idx ON public.profiles (facebook_id);

-- 3. Adicionar Feature Flag para Facebook Auth
INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
    'facebook_auth_enabled', 
    false, 
    'Habilita a exibição do botão de login via Facebook no aplicativo'
)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
