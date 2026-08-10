-- =========================================================
-- DIET PLAN ASSIGNMENTS
-- Sistema flexível de distribuição de planos alimentares
-- =========================================================

CREATE TABLE IF NOT EXISTS public.diet_plan_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
    
    -- Targets (Destinos da Atribuição)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Aluno Específico
    target_plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE, -- Assinatura (Modo Normal)
    target_academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE, -- Todos da Academia (Modo Academia)
    
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- 100=Personal, 50=Group, 10=Subscription
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Garante que apenas um target seja definido por linha
    CONSTRAINT check_single_target CHECK (
        (user_id IS NOT NULL AND target_plan_id IS NULL AND target_academy_id IS NULL) OR
        (user_id IS NULL AND target_plan_id IS NOT NULL AND target_academy_id IS NULL) OR
        (user_id IS NULL AND target_plan_id IS NULL AND target_academy_id IS NOT NULL)
    )
);

-- RLS
ALTER TABLE public.diet_plan_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins view all assignments" ON public.diet_plan_assignments;
DROP POLICY IF EXISTS "Users view personal assignments" ON public.diet_plan_assignments;

-- Policy: Admin vê tudo
CREATE POLICY "Admins view all assignments" ON public.diet_plan_assignments
FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy: Users vêem seus próprios assignments (diretos ou indiretos é complexo para RLS, geralmente filtrado na query, mas aqui liberamos se for direto)
CREATE POLICY "Users view personal assignments" ON public.diet_plan_assignments
FOR SELECT USING (user_id = auth.uid());
