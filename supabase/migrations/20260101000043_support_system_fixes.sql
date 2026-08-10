-- ============================================
-- SUPPORT SYSTEM FIXES AND IMPROVEMENTS
-- Fixes RLS issues and adds useful fields
-- ============================================

-- ============================================
-- 1. ADD ASSIGNED_ADMIN_ID TO TICKETS
-- ============================================
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_at trigger if missing
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. UPDATE STATUS CHECK CONSTRAINT
-- ============================================
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_status_check 
CHECK (status IN ('open', 'pending', 'replied', 'closed'));

-- ============================================
-- 3. ADD SENDER_ID TO MESSAGES (for admin tracking)
-- ============================================
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at 
ON public.support_tickets(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin 
ON public.support_tickets(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at 
ON public.support_messages(created_at DESC);

-- ============================================
-- 5. DROP OLD POLICIES AND RECREATE (FIX RLS)
-- ============================================

-- SUPPORT_TICKETS POLICIES
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

-- User can view own tickets
CREATE POLICY "Users view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User can create tickets
CREATE POLICY "Users create tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can do everything with tickets
CREATE POLICY "Admins full access tickets"
  ON public.support_tickets FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SUPPORT_MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages to their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_messages;

-- User can view messages from their tickets
CREATE POLICY "Users view own ticket messages"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- User can insert messages to their tickets
CREATE POLICY "Users insert to own tickets"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    AND sender_type = 'user'
  );

-- Admins can do everything with messages
CREATE POLICY "Admins full access messages"
  ON public.support_messages FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- 6. CREATE HELPER VIEW FOR ADMIN
-- ============================================
DROP VIEW IF EXISTS public.support_tickets_summary;
CREATE VIEW public.support_tickets_summary 
WITH (security_invoker = on)
AS
SELECT 
  t.id,
  t.user_id,
  t.subject,
  t.status,
  t.assigned_admin_id,
  t.created_at,
  t.updated_at,
  p.full_name AS user_name,
  p.email AS user_email,
  p.avatar_url AS user_avatar,
  ap.full_name AS assigned_admin_name,
  (SELECT COUNT(*) FROM public.support_messages m WHERE m.ticket_id = t.id) AS message_count,
  (SELECT COUNT(*) FROM public.support_messages m WHERE m.ticket_id = t.id AND m.sender_type = 'user') AS user_message_count,
  (
    SELECT m.message FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message,
  (
    SELECT m.sender_type FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message_sender,
  (
    SELECT m.created_at FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message_at
FROM public.support_tickets t
LEFT JOIN public.profiles p ON p.id = t.user_id
LEFT JOIN public.profiles ap ON ap.id = t.assigned_admin_id;

-- Grant access to view
GRANT SELECT ON public.support_tickets_summary TO authenticated;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get unread tickets count for admin
CREATE OR REPLACE FUNCTION public.get_open_tickets_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.support_tickets
  WHERE status = 'open'
$$;

-- Create notification when user creates ticket
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
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
        'Novo ticket de suporte',
        COALESCE(user_name, 'Usuário') || ': ' || NEW.subject,
        'info',
        '/admin/support'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_support_ticket ON public.support_tickets;
CREATE TRIGGER on_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_ticket();

-- Create notification when admin replies
CREATE OR REPLACE FUNCTION public.notify_support_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_user_id UUID;
  ticket_subject TEXT;
BEGIN
  -- Only notify on admin replies
  IF NEW.sender_type = 'admin' THEN
    -- Get ticket info
    SELECT user_id, subject INTO ticket_user_id, ticket_subject
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;
    
    -- Create notification for user
    INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
    VALUES (
      ticket_user_id,
      'Resposta do suporte',
      'Sua mensagem "' || LEFT(ticket_subject, 30) || '..." foi respondida',
      'success',
      '/profile/help'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_support_reply ON public.support_messages;
CREATE TRIGGER on_support_reply
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_reply();

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_open_tickets_count() TO authenticated;
