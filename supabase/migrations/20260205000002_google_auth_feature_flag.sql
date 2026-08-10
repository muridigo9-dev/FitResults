-- =====================================================
-- GOOGLE AUTH FEATURE FLAG
-- Arquivo: 20260205000002_google_auth_feature_flag.sql
-- Objetivo: Habilitar/desabilitar a feature globalmente
-- =====================================================

INSERT INTO public.feature_flags (key, description, enabled)
VALUES (
    'google_auth_enabled', 
    'Habilita o login e cadastro via Google OAuth 2.0', 
    FALSE
)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
