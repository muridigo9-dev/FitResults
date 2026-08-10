-- Migration: 20260126000026_lgpd_hard_delete_service.sql
-- Description: Robust hard delete service for LGPD compliance
-- Created: 2026-01-26

-- 1. RPC for Transactional Hard Delete
-- This function deletes all user-related data in the correct order
CREATE OR REPLACE FUNCTION public.perform_user_hard_delete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _protected_tables TEXT[];
BEGIN
    -- GUARD: Check if LGPD is enabled
    IF NOT public.is_feature_active_for_user('lgpd_enabled', _user_id) THEN
        RAISE EXCEPTION 'LGPD system is disabled';
    END IF;

    -- GUARD: Check if Hard Delete feature is enabled specifically
    IF NOT public.is_feature_active_for_user('lgpd_hard_delete_enabled', _user_id) THEN
        RAISE EXCEPTION 'Hard delete feature is disabled';
    END IF;

    -- Get protected tables from policy
    SELECT protected_tables INTO _protected_tables FROM public.lgpd_policies LIMIT 1;

    -- 1. Delete notifications and tokens
    DELETE FROM public.push_tokens WHERE user_id = _user_id;
    DELETE FROM public.in_app_notifications WHERE user_id = _user_id;
    DELETE FROM public.notification_preferences WHERE user_id = _user_id;

    -- 2. Delete Content/Progress data (Non-protected)
    IF NOT ('checkins' = ANY(_protected_tables)) THEN
        DELETE FROM public.checkins WHERE user_id = _user_id;
    END IF;

    IF NOT ('history' = ANY(_protected_tables)) THEN
        DELETE FROM public.workout_sessions WHERE user_id = _user_id;
        DELETE FROM public.diet_diary WHERE user_id = _user_id;
    END IF;

    -- 3. Delete Relationships
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    DELETE FROM public.user_body_profiles WHERE user_id = _user_id;
    DELETE FROM public.user_habits WHERE user_id = _user_id;
    DELETE FROM public.anamnesis WHERE user_id = _user_id;
    DELETE FROM public.user_progress WHERE user_id = _user_id;

    -- 4. Delete Cancellation Requests (if any)
    DELETE FROM public.account_cancellation_requests WHERE user_id = _user_id;

    -- 5. Delete Profile (The root of most public FKs)
    DELETE FROM public.profiles WHERE id = _user_id;

    -- 6. Note: We do NOT delete auth.users here, that must be done via Auth Admin API in Edge Function
    -- We do NOT delete lgpd_audit_logs as it is a legal requirement to keep proof of fulfillment.
    -- We do NOT delete payments/subscriptions if they are in _protected_tables.

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during hard delete: %', SQLERRM;
        RETURN FALSE;
END;
$$;
