-- Migration: 20260126000024_lgpd_data_export_logic.sql
-- Description: Storage and Logic for LGPD Data Export
-- Created: 2026-01-26

-- 1. Create LGPD Exports Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lgpd_exports', 'lgpd_exports', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Admin can do everything
CREATE POLICY "Admins have full access to lgpd_exports"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lgpd_exports' AND 
  public.is_admin()
);

-- Users can only read their own exports (stored in user_id/filename)
CREATE POLICY "Users can read own lgpd exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lgpd_exports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Ensure portability requests are logged and validated
-- We already have the structure in lgpd_requests

-- 4. Update the lgpd_enabled check to be more granular if needed
-- But we'll use the existing is_feature_active_for_user in the app

-- 5. Add a function to check if a user can request an export now (rate limiting)
CREATE OR REPLACE FUNCTION public.can_user_request_export(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _recent_request_count INTEGER;
BEGIN
    -- Check if there's any pending export
    SELECT COUNT(*) INTO _recent_request_count
    FROM public.lgpd_requests
    WHERE user_id = _user_id
    AND request_type IN ('data_access', 'data_portability')
    AND status IN ('pending', 'under_review', 'approved', 'processing')
    AND created_at > (now() - interval '24 hours');

    RETURN _recent_request_count = 0;
END;
$$;
