-- Add ingredients column to diary_entries for granular meal history
ALTER TABLE public.diary_entries 
ADD COLUMN IF NOT EXISTS ingredients jsonb;
