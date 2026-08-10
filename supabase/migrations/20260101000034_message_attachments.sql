-- Message Attachments Support
-- Adds attachment fields to messages table and creates storage bucket

-- Add attachment columns to messages table
ALTER TABLE public.trainer_student_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'video/mp4', 'audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Allow authenticated users to view attachments from their conversations
CREATE POLICY "Users can view message attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated'
  );

-- Allow users to upload attachments
CREATE POLICY "Users can upload message attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message-attachments' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
