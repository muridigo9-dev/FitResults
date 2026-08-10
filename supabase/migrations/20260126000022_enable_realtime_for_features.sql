-- Migration: 20260126000022_enable_realtime_for_features.sql
-- Description: Enable realtime for feature_flags and plan_features tables to allow immediate updates across sessions
-- Created: 2026-01-26

DO $$
BEGIN
    -- Enable Realtime for feature_flags
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'feature_flags'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
        END IF;

        -- Enable Realtime for plan_features (plan-level flags)
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'plan_features'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_features;
        END IF;
    END IF;
END $$;
