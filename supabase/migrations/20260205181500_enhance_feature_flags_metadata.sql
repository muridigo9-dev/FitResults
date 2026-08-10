-- ================================================
-- ENHANCE FEATURE FLAGS FOR MARKETING/PRICING
-- Migration: 20260205181500_enhance_feature_flags_metadata.sql
-- ================================================

-- Add metadata columns to feature_flags
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS is_marketing_only boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_in_plans boolean NOT NULL DEFAULT true;

-- Update existing flags with default display names (optional but helpful)
UPDATE public.feature_flags 
SET display_name = INITCAP(REPLACE(REPLACE(key, '_enabled', ''), '_', ' '))
WHERE display_name IS NULL;

-- Ensure RLS allows admin to manage these
-- (Already exists in 20260101000016_feature_flags.sql)

-- Force refresh of schema cache
NOTIFY pgrst, 'reload schema';
