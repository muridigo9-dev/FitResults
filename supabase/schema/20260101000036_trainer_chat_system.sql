-- ============================================================================
-- Trainer Chat System - Conversations Model with Push Notifications
-- ============================================================================
-- This migration creates a robust messaging system between trainers and students
-- with conversation channels, read receipts, and push notification triggers.

-- ============================================================================
-- PART 1: Feature Flags for Chat System
-- ============================================================================

INSERT INTO public.feature_flags (key, description, enabled, allow_user_content, affects)
VALUES 
  ('trainer_chat_enabled', 'Enable direct messaging between trainers and students', true, false, '["trainer", "student", "messages"]'::jsonb),
  ('trainer_chat_push_enabled', 'Enable push notifications for trainer chat messages', true, false, '["notifications", "push"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  affects = EXCLUDED.affects;

-- ============================================================================
-- PART 2: Sender Role Enum
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_sender_role') THEN
    CREATE TYPE public.message_sender_role AS ENUM ('trainer', 'student');
  END IF;
END $$;

-- ============================================================================
-- PART 3: Trainer Conversations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trainer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  trainer_unread_count INTEGER NOT NULL DEFAULT 0,
  student_unread_count INTEGER NOT NULL DEFAULT 0,
  
  -- Ensure one conversation per trainer-student pair
  CONSTRAINT unique_trainer_student_conversation UNIQUE (trainer_id, student_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_trainer ON public.trainer_conversations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.trainer_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.trainer_conversations(last_message_at DESC NULLS LAST);

-- ============================================================================
-- PART 4: Trainer Messages Table (Updated Schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trainer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.trainer_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role message_sender_role NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Attachment fields
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.trainer_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.trainer_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.trainer_messages(read_at) WHERE read_at IS NULL;

-- ============================================================================
-- PART 5: Enable RLS
-- ============================================================================

ALTER TABLE public.trainer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: RLS Policies for Conversations
-- ============================================================================

-- Users can view their own conversations
DROP POLICY IF EXISTS "Users view own conversations" ON public.trainer_conversations;
CREATE POLICY "Users view own conversations"
  ON public.trainer_conversations
  FOR SELECT
  USING (trainer_id = auth.uid() OR student_id = auth.uid());

-- Trainers can create conversations with their students
DROP POLICY IF EXISTS "Trainers create conversations" ON public.trainer_conversations;
CREATE POLICY "Trainers create conversations"
  ON public.trainer_conversations
  FOR INSERT
  WITH CHECK (
    trainer_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.trainer_students ts
      WHERE ts.trainer_id = auth.uid() 
        AND ts.student_id = trainer_conversations.student_id
        AND ts.status = 'active'
    )
  );

-- Participants can update their own conversations (for read counts)
DROP POLICY IF EXISTS "Participants update conversations" ON public.trainer_conversations;
CREATE POLICY "Participants update conversations"
  ON public.trainer_conversations
  FOR UPDATE
  USING (trainer_id = auth.uid() OR student_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid() OR student_id = auth.uid());

-- Admins have full access
DROP POLICY IF EXISTS "Admins manage all conversations" ON public.trainer_conversations;
CREATE POLICY "Admins manage all conversations"
  ON public.trainer_conversations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- PART 7: RLS Policies for Messages
-- ============================================================================

-- Participants can view messages in their conversations
DROP POLICY IF EXISTS "Participants view messages" ON public.trainer_messages;
CREATE POLICY "Participants view messages"
  ON public.trainer_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_conversations c
      WHERE c.id = trainer_messages.conversation_id
        AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Participants can send messages in their conversations
DROP POLICY IF EXISTS "Participants send messages" ON public.trainer_messages;
CREATE POLICY "Participants send messages"
  ON public.trainer_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trainer_conversations c
      WHERE c.id = trainer_messages.conversation_id
        AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Recipients can mark messages as read
DROP POLICY IF EXISTS "Recipients mark messages read" ON public.trainer_messages;
CREATE POLICY "Recipients mark messages read"
  ON public.trainer_messages
  FOR UPDATE
  USING (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trainer_conversations c
      WHERE c.id = trainer_messages.conversation_id
        AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trainer_conversations c
      WHERE c.id = trainer_messages.conversation_id
        AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Admins have full access
DROP POLICY IF EXISTS "Admins manage all messages" ON public.trainer_messages;
CREATE POLICY "Admins manage all messages"
  ON public.trainer_messages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- PART 8: Helper Functions
-- ============================================================================

-- Get or create conversation between trainer and student
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  _trainer_id UUID,
  _student_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation_id UUID;
BEGIN
  -- Check if feature is enabled
  IF NOT public.is_feature_enabled('trainer_chat_enabled') THEN
    RAISE EXCEPTION 'Trainer chat is disabled';
  END IF;

  -- Check if valid trainer-student relationship exists
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_students
    WHERE trainer_id = _trainer_id
      AND student_id = _student_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'No active trainer-student relationship exists';
  END IF;

  -- Try to get existing conversation
  SELECT id INTO _conversation_id
  FROM public.trainer_conversations
  WHERE trainer_id = _trainer_id AND student_id = _student_id;

  -- Create if doesn't exist
  IF _conversation_id IS NULL THEN
    INSERT INTO public.trainer_conversations (trainer_id, student_id)
    VALUES (_trainer_id, _student_id)
    RETURNING id INTO _conversation_id;
  END IF;

  RETURN _conversation_id;
END;
$$;

-- Send message function (validates relationship and updates conversation)
CREATE OR REPLACE FUNCTION public.send_trainer_message(
  _conversation_id UUID,
  _message TEXT,
  _attachment_url TEXT DEFAULT NULL,
  _attachment_type TEXT DEFAULT NULL,
  _attachment_name TEXT DEFAULT NULL,
  _attachment_size INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id UUID;
  _sender_role message_sender_role;
  _conversation RECORD;
  _message_id UUID;
  _preview TEXT;
BEGIN
  _sender_id := auth.uid();
  
  -- Check if feature is enabled
  IF NOT public.is_feature_enabled('trainer_chat_enabled') THEN
    RAISE EXCEPTION 'Trainer chat is disabled';
  END IF;

  -- Get conversation and verify access
  SELECT * INTO _conversation
  FROM public.trainer_conversations
  WHERE id = _conversation_id;

  IF _conversation IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF _sender_id != _conversation.trainer_id AND _sender_id != _conversation.student_id THEN
    RAISE EXCEPTION 'Access denied to this conversation';
  END IF;

  -- Determine sender role
  IF _sender_id = _conversation.trainer_id THEN
    _sender_role := 'trainer';
  ELSE
    _sender_role := 'student';
  END IF;

  -- Create message preview (first 100 chars)
  _preview := LEFT(_message, 100);
  IF LENGTH(_message) > 100 THEN
    _preview := _preview || '...';
  END IF;

  -- Insert message
  INSERT INTO public.trainer_messages (
    conversation_id,
    sender_id,
    sender_role,
    message,
    attachment_url,
    attachment_type,
    attachment_name,
    attachment_size
  ) VALUES (
    _conversation_id,
    _sender_id,
    _sender_role,
    _message,
    _attachment_url,
    _attachment_type,
    _attachment_name,
    _attachment_size
  )
  RETURNING id INTO _message_id;

  -- Update conversation
  UPDATE public.trainer_conversations
  SET
    last_message_at = now(),
    last_message_preview = _preview,
    updated_at = now(),
    trainer_unread_count = CASE 
      WHEN _sender_role = 'student' THEN trainer_unread_count + 1 
      ELSE trainer_unread_count 
    END,
    student_unread_count = CASE 
      WHEN _sender_role = 'trainer' THEN student_unread_count + 1 
      ELSE student_unread_count 
    END
  WHERE id = _conversation_id;

  RETURN _message_id;
END;
$$;

-- Mark messages as read
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(
  _conversation_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _conversation RECORD;
  _count INTEGER;
BEGIN
  _user_id := auth.uid();

  -- Get conversation
  SELECT * INTO _conversation
  FROM public.trainer_conversations
  WHERE id = _conversation_id;

  IF _conversation IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF _user_id != _conversation.trainer_id AND _user_id != _conversation.student_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Mark unread messages as read
  UPDATE public.trainer_messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id != _user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Reset unread count for this user
  IF _user_id = _conversation.trainer_id THEN
    UPDATE public.trainer_conversations
    SET trainer_unread_count = 0
    WHERE id = _conversation_id;
  ELSE
    UPDATE public.trainer_conversations
    SET student_unread_count = 0
    WHERE id = _conversation_id;
  END IF;

  RETURN _count;
END;
$$;

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_user_unread_messages_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _count INTEGER;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(
    SUM(
      CASE 
        WHEN trainer_id = _user_id THEN trainer_unread_count
        WHEN student_id = _user_id THEN student_unread_count
        ELSE 0
      END
    ),
    0
  ) INTO _count
  FROM public.trainer_conversations
  WHERE trainer_id = _user_id OR student_id = _user_id;

  RETURN _count;
END;
$$;

-- ============================================================================
-- PART 9: Auto-create conversation when trainer-student link is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_conversation_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create conversation for active links when chat is enabled
  IF NEW.status = 'active' AND public.is_feature_enabled('trainer_chat_enabled') THEN
    INSERT INTO public.trainer_conversations (trainer_id, student_id)
    VALUES (NEW.trainer_id, NEW.student_id)
    ON CONFLICT (trainer_id, student_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_conversation ON public.trainer_students;
CREATE TRIGGER trigger_auto_create_conversation
  AFTER INSERT OR UPDATE ON public.trainer_students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_conversation_on_link();

-- ============================================================================
-- PART 10: Notify on new message (for push notifications)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_trainer_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation RECORD;
  _recipient_id UUID;
  _sender_name TEXT;
  _title TEXT;
BEGIN
  -- Check if push is enabled
  IF NOT public.is_feature_enabled('trainer_chat_push_enabled') THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO _conversation
  FROM public.trainer_conversations
  WHERE id = NEW.conversation_id;

  -- Determine recipient
  IF NEW.sender_id = _conversation.trainer_id THEN
    _recipient_id := _conversation.student_id;
  ELSE
    _recipient_id := _conversation.trainer_id;
  END IF;

  -- Get sender name
  SELECT COALESCE(full_name, email) INTO _sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Set notification title based on sender role
  IF NEW.sender_role = 'trainer' THEN
    _title := 'Nova mensagem do seu treinador';
  ELSE
    _title := format('Nova mensagem de %s', COALESCE(_sender_name, 'Aluno'));
  END IF;

  -- Create in-app notification
  INSERT INTO public.in_app_notifications (
    user_id,
    title,
    message,
    type,
    action_url
  ) VALUES (
    _recipient_id,
    _title,
    LEFT(NEW.message, 100),
    'trainer_update',
    '/my-trainer?tab=messages'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.trainer_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.trainer_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_trainer_message();

-- ============================================================================
-- PART 11: View for student's trainer conversation
-- ============================================================================

CREATE OR REPLACE VIEW public.my_trainer_conversation AS
SELECT 
  c.id AS conversation_id,
  c.trainer_id,
  c.student_id,
  c.last_message_at,
  c.last_message_preview,
  c.student_unread_count AS unread_count,
  p.full_name AS trainer_name,
  p.avatar_url AS trainer_avatar,
  p.email AS trainer_email
FROM public.trainer_conversations c
JOIN public.profiles p ON p.id = c.trainer_id
WHERE c.student_id = auth.uid();

-- ============================================================================
-- PART 12: View for trainer's conversations with students
-- ============================================================================

CREATE OR REPLACE VIEW public.trainer_conversations_list AS
SELECT 
  c.id AS conversation_id,
  c.trainer_id,
  c.student_id,
  c.last_message_at,
  c.last_message_preview,
  c.trainer_unread_count AS unread_count,
  c.created_at,
  p.full_name AS student_name,
  p.avatar_url AS student_avatar,
  p.email AS student_email
FROM public.trainer_conversations c
JOIN public.profiles p ON p.id = c.student_id
WHERE c.trainer_id = auth.uid()
ORDER BY c.last_message_at DESC NULLS LAST;

-- ============================================================================
-- PART 13: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_trainer_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_unread_messages_count TO authenticated;
