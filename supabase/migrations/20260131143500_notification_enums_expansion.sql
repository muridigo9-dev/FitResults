-- Migration: 20260131143500_notification_enums_expansion.sql
-- Description: Expande os tipos de eventos de notificação (Separado para evitar erro SQLSTATE 55P04)
-- Created: 2026-01-31

-- Adicionar novos tipos de eventos ao enum existente
-- Nota: Rodar separadamente pois o Postgres não permite usar novos valores de enum na mesma transação que os define.
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'cancellation_rejected';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'plan_upgrade';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'plan_downgrade';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'admin_alert';
