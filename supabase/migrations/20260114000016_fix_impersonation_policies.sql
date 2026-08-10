-- ============================================
-- FIX: Admin Impersonation Policies
-- ============================================
-- Description: Adiciona DROP POLICY IF EXISTS para tornar idempotente
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Fixes: 20260114000009_admin_impersonation_system.sql

-- ============================================
-- ADMIN IMPERSONATION LOGS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admin can view all impersonation logs" ON public.admin_impersonation_logs;
DROP POLICY IF EXISTS "Super admin can insert impersonation logs" ON public.admin_impersonation_logs;
DROP POLICY IF EXISTS "Super admin can update impersonation logs" ON public.admin_impersonation_logs;

-- Recreate policies
CREATE POLICY "Super admin can view all impersonation logs"
ON public.admin_impersonation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Super admin can insert impersonation logs"
ON public.admin_impersonation_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Super admin can update impersonation logs"
ON public.admin_impersonation_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- IMPERSONATION RESTRICTIONS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admin can view impersonation restrictions" ON public.impersonation_restrictions;
DROP POLICY IF EXISTS "Super admin can create impersonation restrictions" ON public.impersonation_restrictions;
DROP POLICY IF EXISTS "Super admin can update impersonation restrictions" ON public.impersonation_restrictions;
DROP POLICY IF EXISTS "Super admin can delete impersonation restrictions" ON public.impersonation_restrictions;

-- Recreate policies
CREATE POLICY "Super admin can view impersonation restrictions"
ON public.impersonation_restrictions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Super admin can create impersonation restrictions"
ON public.impersonation_restrictions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Super admin can update impersonation restrictions"
ON public.impersonation_restrictions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Super admin can delete impersonation restrictions"
ON public.impersonation_restrictions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Super admin can view all impersonation logs" ON public.admin_impersonation_logs IS 
'Allows super admins to view all impersonation audit logs for compliance and security';

COMMENT ON POLICY "Super admin can insert impersonation logs" ON public.admin_impersonation_logs IS 
'Allows super admins to create impersonation logs when starting a session';

COMMENT ON POLICY "Super admin can update impersonation logs" ON public.admin_impersonation_logs IS 
'Allows super admins to update impersonation logs when ending a session';

COMMENT ON POLICY "Super admin can view impersonation restrictions" ON public.impersonation_restrictions IS 
'Allows super admins to view users who cannot be impersonated (e.g., LGPD restrictions)';

COMMENT ON POLICY "Super admin can create impersonation restrictions" ON public.impersonation_restrictions IS 
'Allows super admins to create impersonation restrictions for users';

COMMENT ON POLICY "Super admin can update impersonation restrictions" ON public.impersonation_restrictions IS 
'Allows super admins to update impersonation restrictions (e.g., expiration dates)';

COMMENT ON POLICY "Super admin can delete impersonation restrictions" ON public.impersonation_restrictions IS 
'Allows super admins to remove impersonation restrictions when no longer needed';
