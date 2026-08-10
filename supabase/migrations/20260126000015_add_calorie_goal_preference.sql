-- ============================================================
-- ADD CALORIE GOAL TO PREFERENCES
-- ============================================================

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS calorie_goal INTEGER;

-- Comentário para documentação
COMMENT ON COLUMN public.user_preferences.calorie_goal IS 'Meta calórica manual definida pelo usuário. Se NULL, usa o cálculo automático (TDEE).';
