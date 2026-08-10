-- ==========================================================
-- Migration: Automatic Plan Expiration Logic
-- Description: Adds a function to check and revoke expired plans.
--              Can be called by a cron job or manually.
-- ==========================================================

-- 1. FUNCTION TO REVOKE EXPIRED SUBSCRIPTIONS
CREATE OR REPLACE FUNCTION public.check_and_revoke_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_revoked_count integer := 0;
    v_free_plan_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Update status to 'expired' for subscriptions where expires_at < now()
    WITH expired_subs AS (
        UPDATE public.user_subscriptions
        SET status = 'expired',
            updated_at = now()
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < now()
        RETURNING user_id, plan_id
    )
    -- 2. Downgrade profile to Free plan if the expired plan was the active one
    UPDATE public.profiles p
    SET current_plan_id = v_free_plan_id,
        updated_at = now()
    FROM expired_subs s
    WHERE p.id = s.user_id
      AND p.current_plan_id = s.plan_id;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
    
    RETURN v_revoked_count;
END;
$$;

-- 2. NOTE ON AUTOMATION
-- To automate this, you should enable pg_cron or use a Supabase Edge Function with a cron trigger.
-- Example cron (if pg_cron is available):
-- SELECT cron.schedule('0 0 * * *', $$ SELECT public.check_and_revoke_expired_subscriptions() $$);

-- 3. ENSURE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.check_and_revoke_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_revoke_expired_subscriptions() TO authenticated; 
-- (Admins can trigger manually via RPC)

-- 4. DONE
