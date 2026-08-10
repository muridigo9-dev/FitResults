-- =====================================================
-- ADD FEATURE FLAG FOR MAGIC LINK AUTH
-- Arquivo: 20260205000004_magic_link_feature_flag.sql
-- Objetivo: Controle de visibilidade do Magic Link
-- =====================================================

-- Adicionar Feature Flag para Magic Link
INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
    'magic_link_enabled', 
    false, 
    'Habilita o login via link de e-mail (Passwordless) no aplicativo'
)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
