-- =========================================================
-- DIET SUBSTITUTIONS SUPPORT
-- Permite definir itens como substitutos de outros itens
-- =========================================================

ALTER TABLE public.diet_plan_items
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES public.diet_plan_items(id) ON DELETE CASCADE, -- Se preenchido, este item é um substituto do parent
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE; -- Se é algo "extra" opcional
