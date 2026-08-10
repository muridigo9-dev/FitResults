-- =========================================================
-- DIET PLANS V2 REFACTOR
-- Foco em simplicidade, paralelismo com treinos e reuso
-- =========================================================

-- 1. Melhorar a tabela de Diet Plans
ALTER TABLE public.diet_plans
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS objective_badge TEXT, -- Ex: 'emagrecimento', 'hipertrofia'
ADD COLUMN IF NOT EXISTS image_url TEXT, -- Banner do plano (URL externa)
ADD COLUMN IF NOT EXISTS image_path TEXT; -- Banner do plano (Caminho no Storage)

-- 2. Melhorar a distinção entre Prato Principal e Substitutos
ALTER TABLE public.diet_plan_items
ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;

-- Garantir que pelo menos um item por refeição seja marcado como principal se houver itens
-- (Migração de dados existentes para manter consistência)
DO $$
BEGIN
    UPDATE public.diet_plan_items
    SET is_main = true
    WHERE id IN (
        SELECT id FROM (
            SELECT id, row_number() OVER (PARTITION BY diet_plan_meal_id ORDER BY created_at ASC) as rn
            FROM public.diet_plan_items
            WHERE parent_item_id IS NULL
        ) t WHERE t.rn = 1
    )
    AND is_main = false;
END $$;

-- 3. Vincular Check-ins de refeição ao Plano e Sessão específica
ALTER TABLE public.checkin_meals
ADD COLUMN IF NOT EXISTS diet_plan_id UUID REFERENCES public.diet_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS diet_plan_meal_id UUID REFERENCES public.diet_plan_meals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL;

-- 4. RLS e Policies (Garantir que as tabelas novas/atualizadas estão seguras)
-- (Tabelas já possuem RLS das migrações anteriores, apenas confirmamos)

-- 5. Comentários para documentação
COMMENT ON COLUMN public.diet_plans.duration_days IS 'Duração sugerida do plano em dias.';
COMMENT ON COLUMN public.diet_plans.image_url IS 'URL externa da imagem de banner do plano.';
COMMENT ON COLUMN public.diet_plans.image_path IS 'Caminho interno no Storage para a imagem de banner.';
COMMENT ON COLUMN public.diet_plan_items.is_main IS 'Indica se este é o prato padrão da sessão.';
COMMENT ON COLUMN public.checkin_meals.diet_plan_id IS 'Plano alimentar que originou esta refeição.';
COMMENT ON COLUMN public.checkin_meals.diet_plan_meal_id IS 'Sessão específica (ex: Almoço) do plano.';
