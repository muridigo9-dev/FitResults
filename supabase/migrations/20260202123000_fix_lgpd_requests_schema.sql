-- Fix relationship between lgpd_requests and profiles
-- This ensures the frontend can join correctly and resolves the empty list issue

DO $$
BEGIN
    -- 1. Add the foreign key constraint that frontend expects for requests
    -- Standardizing relationship to profiles(id) instead of auth.users(id)
    ALTER TABLE public.lgpd_requests DROP CONSTRAINT IF EXISTS lgpd_requests_user_id_fkey;
    
    ALTER TABLE public.lgpd_requests
    ADD CONSTRAINT lgpd_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    -- 2. Add the foreign key constraint for handled_by too
    ALTER TABLE public.lgpd_requests DROP CONSTRAINT IF EXISTS lgpd_requests_handled_by_fkey;
    
    ALTER TABLE public.lgpd_requests
    ADD CONSTRAINT lgpd_requests_handled_by_fkey
    FOREIGN KEY (handled_by) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

    -- 3. Ensure Enums are up to date
    ALTER TYPE lgpd_request_status ADD VALUE IF NOT EXISTS 'processing';
    ALTER TYPE lgpd_request_status ADD VALUE IF NOT EXISTS 'failed';

END $$;

-- 3. Comments
COMMENT ON CONSTRAINT lgpd_requests_user_id_fkey ON public.lgpd_requests IS 'Relationship for LGPD request owner (linked to profiles)';
COMMENT ON CONSTRAINT lgpd_requests_handled_by_fkey ON public.lgpd_requests IS 'Relationship for LGPD request handler (linked to profiles)';
