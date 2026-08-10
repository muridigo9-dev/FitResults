-- Enable Realtime for Support and LGPD tables
-- This is necessary for the "WhatsApp-like" automatic updates

DO $$
BEGIN
    -- 1. Enable Realtime for the publication
    -- We assume the publication 'supabase_realtime' exists (it's the default)
    
    -- support_tickets
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'support_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;

    -- support_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'support_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;

    -- in_app_notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'in_app_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
    END IF;

    -- lgpd_requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'lgpd_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lgpd_requests;
    END IF;

END $$;

-- 2. Set replica identity to FULL for tables where we need the whole record on updates
-- This helps the frontend identify which record changed without re-fetching everything in some cases
-- though for React Query standard 'insert' events it's already enough.
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
