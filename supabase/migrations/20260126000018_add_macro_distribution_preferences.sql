-- ============================================================
-- ADD MACRO DISTRIBUTION TO PREFERENCES
-- ============================================================

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS macro_protein_pct INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS macro_carbs_pct INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS macro_fat_pct INTEGER DEFAULT 30;

-- Constraints to ensure they add up to 100 might be tricky to enforce via DB if updated one by one, 
-- but we can add a check at least for individual ranges.
ALTER TABLE public.user_preferences 
ADD CONSTRAINT check_macro_protein_range CHECK (macro_protein_pct >= 0 AND macro_protein_pct <= 100),
ADD CONSTRAINT check_macro_carbs_range CHECK (macro_carbs_pct >= 0 AND macro_carbs_pct <= 100),
ADD CONSTRAINT check_macro_fat_range CHECK (macro_fat_pct >= 0 AND macro_fat_pct <= 100);

-- Comentários para documentação
COMMENT ON COLUMN public.user_preferences.macro_protein_pct IS 'Porcentagem de proteína na meta diária (0-100).';
COMMENT ON COLUMN public.user_preferences.macro_carbs_pct IS 'Porcentagem de carboidratos na meta diária (0-100).';
COMMENT ON COLUMN public.user_preferences.macro_fat_pct IS 'Porcentagem de gordura na meta diária (0-100).';
