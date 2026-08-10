-- Migration: Fix user support update policy
-- Description: Allows users to update their own support tickets for feedback and status tracking.

-- ============================================
-- 1. ADD UPDATE POLICY FOR USERS
-- ============================================

DROP POLICY IF EXISTS "Users update own tickets" ON public.support_tickets;
CREATE POLICY "Users update own tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: We trust the backend code to only update the allowed fields 
-- (satisfaction_score, satisfaction_comment, status, updated_at).
-- Any attempt to change user_id would fail the WITH CHECK.
