-- ================================================
-- ADD SUPPORT AND NOTIFICATIONS FEATURE FLAGS
-- ================================================
-- This migration adds two new feature flags to control
-- access to support and notification systems by plan

INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES 
    ('support_enabled', 'Habilita sistema completo de suporte (tickets, mensagens, histórico)', true, false, '["support", "help"]'::jsonb),
    ('notifications_enabled', 'Habilita sistema de notificações in-app (suporte, admin, academia, personal)', true, false, '["notifications", "alerts"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description,
    affects = EXCLUDED.affects;
