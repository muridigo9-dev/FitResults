-- In-App Notifications System
-- This migration creates the in-app notifications table and related functionality

-- ============================================================================
-- In-App Notifications Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id 
ON public.in_app_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read_at 
ON public.in_app_notifications(user_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at 
ON public.in_app_notifications(created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.in_app_notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.in_app_notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.in_app_notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
ON public.in_app_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get unread notifications count
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.in_app_notifications
  WHERE user_id = auth.uid()
    AND read_at IS NULL
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.in_app_notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL
$$;

-- Function to mark a single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.in_app_notifications
  SET read_at = now()
  WHERE id = _notification_id
    AND user_id = auth.uid()
$$;

-- Function to create a notification (for use in triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _action_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
BEGIN
  INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
  VALUES (_user_id, _title, _message, _type, _action_url)
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.in_app_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO authenticated;
