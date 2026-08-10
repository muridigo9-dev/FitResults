-- =========================================================
-- DISH VISIBILITY STRATEGY
-- Modela a visibilidade de pratos para suportar Sistema, Academias e Usuários
-- =========================================================

-- 1. Melhorar estrutura da tabela dishes para controle de acesso
ALTER TABLE public.dishes 
ADD COLUMN IF NOT EXISTS visibility_type TEXT NOT NULL DEFAULT 'private', -- 'global', 'academy', 'private'
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id), -- Dono direto (se private)
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id); -- Academia dona (se academy)

-- Atualizar registros existentes (Migration path)
-- Assumindo que criados por admin null são globais, e com user são privados por enquanto
UPDATE public.dishes 
SET visibility_type = CASE 
    WHEN created_by IS NULL THEN 'global' 
    ELSE 'private' 
END,
owner_id = created_by
WHERE visibility_type = 'private' AND owner_id IS NULL;


-- 2. Habilitar RLS (Idempotent)
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- Remove existing policies to avoid conflict (Idempotent)
DROP POLICY IF EXISTS "Dishes Visibility Policy" ON public.dishes;
DROP POLICY IF EXISTS "Dishes Management Policy" ON public.dishes;

-- POLICY: "Ver Pratos"
-- Regra: Pode ver se for Global, OU se for da sua Academia, OU se for Seu.
CREATE POLICY "Dishes Visibility Policy" ON public.dishes
FOR SELECT
USING (
    -- 1. Globais (Sistema)
    visibility_type = 'global'
    OR
    -- 2. Meus Pratos (Privados)
    (visibility_type = 'private' AND owner_id = auth.uid())
    OR
    -- 3. Minha Academia (Se o prato pertence a uma academia que eu sou membro)
    (
        visibility_type = 'academy' 
        AND 
        academy_id IN (
            SELECT academy_id 
            FROM public.academy_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
    OR
    -- 4. Admins podem ver tudo (Opcional, mas útil para suporte)
    (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
);

-- POLICY: "Gerenciar Pratos"
-- Regra: 
-- - Admins gerenciam 'global'.
-- - Donos de Academia/Nutris gerenciam 'academy'.
-- - Usuários gerenciam seus 'private'.

CREATE POLICY "Dishes Management Policy" ON public.dishes
FOR ALL
USING (
    -- 1. Admin do Sistema (Pode tudo)
    (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
    OR
    -- 2. Dono do Prato (Privado)
    (visibility_type = 'private' AND owner_id = auth.uid())
    OR
    -- 3. Staff da Academia (Para pratos da academia)
    (
        visibility_type = 'academy'
        AND
        academy_id IN (
            SELECT academy_id 
            FROM public.academy_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'nutritionist') -- Apenas donos e nutris podem editar pratos da academia
            AND status = 'active'
        )
    )
);
