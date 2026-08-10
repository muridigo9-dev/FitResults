-- ============================================
-- FIX: Notification System Policies
-- ============================================
-- Description: Adiciona DROP POLICY IF EXISTS para tornar idempotente
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Fixes: 20260114000005_notification_system_complete.sql

-- ============================================
-- NOTIFICATION TEMPLATES POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Everyone can read active templates" ON public.notification_templates;

-- Recreate policies
CREATE POLICY "Admins can manage notification templates"
ON public.notification_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Everyone can read active templates"
ON public.notification_templates FOR SELECT
USING (is_active = true);

-- ============================================
-- NOTIFICATION LOGS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.notification_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.notification_logs;

-- Recreate policies
CREATE POLICY "Admins can view all logs"
ON public.notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view own logs"
ON public.notification_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert logs"
ON public.notification_logs FOR INSERT
WITH CHECK (true);

-- ============================================
-- NOTIFICATION THROTTLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can manage throttle" ON public.notification_throttle;

-- Recreate policies
CREATE POLICY "System can manage throttle"
ON public.notification_throttle FOR ALL
WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Admins can manage notification templates" ON public.notification_templates IS 
'Allows admins to create, update, and delete notification templates';

COMMENT ON POLICY "Everyone can read active templates" ON public.notification_templates IS 
'Allows all authenticated users to read active notification templates for UI display';

COMMENT ON POLICY "Admins can view all logs" ON public.notification_logs IS 
'Allows admins to view all notification logs for monitoring and debugging';

COMMENT ON POLICY "Users can view own logs" ON public.notification_logs IS 
'Allows users to view their own notification history';

COMMENT ON POLICY "System can insert logs" ON public.notification_logs IS 
'Allows the system to insert notification logs when sending notifications';

COMMENT ON POLICY "System can manage throttle" ON public.notification_throttle IS 
'Allows the system to manage notification throttling to prevent spam';
