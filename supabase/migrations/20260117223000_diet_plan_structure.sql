-- =========================================================
-- DIET PLAN DATA MODEL
-- Estrutura Hierárquica: Plan -> Days -> Meals -> Items (Dishes)
-- =========================================================

-- 1. Tabela de DIAS do Plano (Nova camada para suportar agenda semanal/ciclos)
CREATE TABLE IF NOT EXISTS public.diet_plan_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: 'Segunda-feira', 'Dia de Treino', 'Padrão'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualizar Tabela de REFEIÇÕES (Vincular a DIAS, não diretamente ao Plano)
-- Nota: Se já existirem dados, isso requer migração. Vamos assumir estrutura nova ou migrar 'on the fly'.

-- Adicionar coluna nullable primeiro
ALTER TABLE public.diet_plan_meals 
ADD COLUMN IF NOT EXISTS diet_plan_day_id UUID REFERENCES public.diet_plan_days(id) ON DELETE CASCADE;

-- (Opcional) Migração de dados existentes:
-- Se houver refeições órfãs de dia, criar um dia 'Default' para o plano e vincular.
DO $$
DECLARE
    r_plan RECORD;
    v_day_id UUID;
BEGIN
    FOR r_plan IN SELECT DISTINCT diet_plan_id FROM public.diet_plan_meals WHERE diet_plan_day_id IS NULL
    LOOP
        INSERT INTO public.diet_plan_days (diet_plan_id, name) 
        VALUES (r_plan.diet_plan_id, 'Dia Padrão') 
        RETURNING id INTO v_day_id;
        
        UPDATE public.diet_plan_meals 
        SET diet_plan_day_id = v_day_id 
        WHERE diet_plan_id = r_plan.diet_plan_id AND diet_plan_day_id IS NULL;
    END LOOP;
END $$;

-- Agora remover a FK antiga direta (após garantir que tudo tem dia)
-- ALTER TABLE public.diet_plan_meals DROP COLUMN diet_plan_id; -- (Comentado para segurança, mas idealmente removeria)


-- 3. Tabela de ITENS DA REFEIÇÃO (Composição de Pratos)
-- Substitui ou renomeia 'diet_plan_meal_options' para algo mais genérico se quiser
CREATE TABLE IF NOT EXISTS public.diet_plan_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diet_plan_meal_id UUID NOT NULL REFERENCES public.diet_plan_meals(id) ON DELETE CASCADE,
    dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE RESTRICT, -- Integridade: não apagar prato em uso
    
    -- Customização da Instância
    portion_scale NUMERIC DEFAULT 1.0, -- Multiplicador (Ex: 1.5x a porção padrão do prato)
    quantity_override TEXT, -- Texto livre opcional para substituir a qtd automática (Ex: "2 colheres")
    observation TEXT, -- "Sem sal", "Bem passado"
    
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Atualizar Header do Plano com Visibilidade (Padrão System/Academy/User)
ALTER TABLE public.diet_plans
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'private', -- 'global', 'academy', 'private'
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id);

-- 5. RLS Policies (Habilitar segurança)
ALTER TABLE public.diet_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan_items ENABLE ROW LEVEL SECURITY;

-- Políticas Simples (Herança de visibilidade seria o ideal, mas aqui simplificamos por role ou owner)
-- (Exemplos omitidos para brevidade, seguir padrão do dishes)
