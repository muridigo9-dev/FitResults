
-- Trainer-Student Messages System
-- This migration creates the messages table for direct communication between trainers and students

-- Create messages table
CREATE TABLE IF NOT EXISTS public.trainer_student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_trainer_student ON public.trainer_student_messages(trainer_id, student_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.trainer_student_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.trainer_student_messages(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.trainer_student_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Trainers can view messages with their students
CREATE POLICY "Trainers can view their messages"
  ON public.trainer_student_messages
  FOR SELECT
  USING (
    trainer_id = auth.uid() OR student_id = auth.uid()
  );

-- Trainers can send messages to their students
CREATE POLICY "Trainers can send messages"
  ON public.trainer_student_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      -- Trainer sending to their student
      (trainer_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.trainer_students ts
        WHERE ts.trainer_id = auth.uid() AND ts.student_id = trainer_student_messages.student_id
      ))
      OR
      -- Student sending to their trainer
      (student_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.trainer_students ts
        WHERE ts.student_id = auth.uid() AND ts.trainer_id = trainer_student_messages.trainer_id
      ))
    )
  );

-- Users can update read status of messages sent to them
CREATE POLICY "Users can mark messages as read"
  ON public.trainer_student_messages
  FOR UPDATE
  USING (
    (trainer_id = auth.uid() AND sender_id = student_id) OR
    (student_id = auth.uid() AND sender_id = trainer_id)
  )
  WITH CHECK (
    (trainer_id = auth.uid() AND sender_id = student_id) OR
    (student_id = auth.uid() AND sender_id = trainer_id)
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_messages_updated_at ON public.trainer_student_messages;
CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON public.trainer_student_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();
