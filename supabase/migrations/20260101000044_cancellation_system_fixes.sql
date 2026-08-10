-- ============================================
-- CANCELLATION SYSTEM FIXES
-- Fixes RLS issues and adds helper view
-- ============================================

-- ============================================
-- 1. DROP OLD POLICIES AND RECREATE (FIX RLS)
-- ============================================

DROP POLICY IF EXISTS "Users can view own cancellation requests" ON public.account_cancellation_requests;
DROP POLICY IF EXISTS "Users can create cancellation request" ON public.account_cancellation_requests;
DROP POLICY IF EXISTS "Admins can view all cancellation requests" ON public.account_cancellation_requests;
DROP POLICY IF EXISTS "Admins can update cancellation requests" ON public.account_cancellation_requests;
DROP POLICY IF EXISTS "Admins can delete cancellation requests" ON public.account_cancellation_requests;

-- User can view own requests
CREATE POLICY "Users view own cancellation requests"
  ON public.account_cancellation_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User can create requests
CREATE POLICY "Users create cancellation request"
  ON public.account_cancellation_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins full access cancellations"
  ON public.account_cancellation_requests FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- 2. CREATE HELPER VIEW FOR ADMIN
-- ============================================
DROP VIEW IF EXISTS public.cancellation_requests_summary;
CREATE VIEW public.cancellation_requests_summary 
WITH (security_invoker = on)
AS
SELECT 
  c.id,
  c.user_id,
  c.status,
  c.reason,
  c.details,
  c.admin_notes,
  c.stripe_subscription_id,
  c.stripe_cancellation_status,
  c.processed_by,
  c.created_at,
  c.updated_at,
  c.processed_at,
  p.full_name AS user_name,
  p.email AS user_email,
  p.avatar_url AS user_avatar,
  p.subscription_status,
  p.account_status,
  ap.full_name AS processed_by_name
FROM public.account_cancellation_requests c
LEFT JOIN public.profiles p ON p.id = c.user_id
LEFT JOIN public.profiles ap ON ap.id = c.processed_by;

-- Grant access to view
GRANT SELECT ON public.cancellation_requests_summary TO authenticated;

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Get pending cancellations count for admin
CREATE OR REPLACE FUNCTION public.get_pending_cancellations_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.account_cancellation_requests
  WHERE status = 'pending'
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_cancellations_count() TO authenticated;

-- ============================================
-- 4. NOTIFICATION TRIGGERS
-- ============================================

-- Create notification when user creates cancellation request
CREATE OR REPLACE FUNCTION public.notify_new_cancellation_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  user_name TEXT;
BEGIN
  -- Get user name
  SELECT full_name INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get all admin user IDs
  SELECT array_agg(user_id) INTO admin_ids
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Create notification for each admin
  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids LOOP
      INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
      VALUES (
        admin_id,
        'Nova solicitação de cancelamento',
        COALESCE(user_name, 'Usuário') || ' solicitou cancelamento da conta',
        'warning',
        '/admin/cancellations'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_cancellation_request ON public.account_cancellation_requests;
CREATE TRIGGER on_new_cancellation_request
  AFTER INSERT ON public.account_cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_cancellation_request();

-- Create notification when admin processes cancellation
CREATE OR REPLACE FUNCTION public.notify_cancellation_processed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify when status changes to completed or rejected
  IF OLD.status != NEW.status AND NEW.status IN ('completed', 'rejected') THEN
    INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      CASE NEW.status 
        WHEN 'completed' THEN 'Cancelamento processado'
        ELSE 'Solicitação de cancelamento atualizada'
      END,
      CASE NEW.status
        WHEN 'completed' THEN 'Sua solicitação de cancelamento foi processada'
        WHEN 'rejected' THEN 'Sua solicitação de cancelamento foi rejeitada. Entre em contato para mais informações.'
        ELSE 'O status da sua solicitação foi atualizado'
      END,
      CASE NEW.status
        WHEN 'completed' THEN 'info'
        WHEN 'rejected' THEN 'warning'
        ELSE 'info'
      END,
      '/profile/privacy'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cancellation_processed ON public.account_cancellation_requests;
CREATE TRIGGER on_cancellation_processed
  AFTER UPDATE ON public.account_cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_cancellation_processed();
