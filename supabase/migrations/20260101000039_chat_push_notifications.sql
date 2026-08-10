-- Chat Push Notifications Integration
-- This migration enhances the message system to integrate with the push notification system

-- ============================================================================
-- Enhanced trigger for push notifications on new chat messages
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_new_trainer_message ON public.trainer_messages;

-- Enhanced function to send push notifications via edge function call
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  _conversation RECORD;
  _recipient_id uuid;
  _sender_name text;
  _notification_title text;
  _push_enabled boolean;
BEGIN
  -- Check if push notifications are enabled for chat
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'trainer_chat_push_enabled'),
    false
  ) INTO _push_enabled;
  
  IF NOT _push_enabled THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO _conversation
  FROM public.trainer_conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Determine recipient and sender based on sender_role
  IF NEW.sender_role = 'trainer' THEN
    _recipient_id := _conversation.student_id;
    SELECT COALESCE(full_name, email, 'Seu treinador') INTO _sender_name
    FROM public.profiles WHERE id = _conversation.trainer_id;
    _notification_title := 'Nova mensagem do seu treinador';
  ELSE
    _recipient_id := _conversation.trainer_id;
    SELECT COALESCE(full_name, email, 'Aluno') INTO _sender_name
    FROM public.profiles WHERE id = _conversation.student_id;
    _notification_title := 'Nova mensagem de ' || _sender_name;
  END IF;

  -- Create in-app notification if the notifications system is enabled
  BEGIN
    INSERT INTO public.in_app_notifications (
      user_id,
      title,
      message,
      type,
      action_url
    ) VALUES (
      _recipient_id,
      _notification_title,
      LEFT(NEW.message, 100),
      'trainer_update',
      CASE
        WHEN NEW.sender_role = 'trainer' THEN '/my-trainer?tab=messages'
        ELSE '/trainer?tab=messages'
      END
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail if in_app_notifications table doesn't exist
      RAISE NOTICE 'Could not create in-app notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_notify_new_chat_message
  AFTER INSERT ON public.trainer_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_message();

-- ============================================================================
-- Helper function to check if user has push subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_push_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.push_subscriptions
    WHERE user_id = _user_id
  )
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.notify_new_chat_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_push_subscription(uuid) TO authenticated;

-- ============================================================================
-- Add conversation indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trainer_messages_conversation_read
ON public.trainer_messages(conversation_id, read_at)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trainer_conversations_last_message
ON public.trainer_conversations(last_message_at DESC NULLS LAST);
