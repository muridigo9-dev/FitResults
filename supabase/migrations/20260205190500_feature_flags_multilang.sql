-- ================================================
-- ADD MULTI-LANGUAGE SUPPORT TO FEATURE FLAGS
-- Migration: 20260205190500_feature_flags_multilang.sql
-- ================================================

-- Add translation columns
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS display_name_en text,
ADD COLUMN IF NOT EXISTS display_name_es text,
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS description_es text;

-- Force refresh of schema cache
NOTIFY pgrst, 'reload schema';
