# Análise e Proposta: Sistema Unificado de Visibilidade por Plano

## 📋 SUMÁRIO EXECUTIVO

Após auditoria completa do código, identifiquei **DOIS SISTEMAS DISTINTOS** de visibilidade que coexistem no projeto:

1. **Sistema de Visibilidade por Tipo** (Dishes, Workouts, Challenges, Diets)
   - Baseado em: `visibility_type` ('global', 'academy', 'private')
   - Implementado via: RLS policies + função `can_view_content()`
   
2. **Sistema de Visibilidade por Plano de Assinatura** (Exercises)
   - Baseado em: Tabela `exercise_plans` (many-to-many)
   - Regra: Se vazio = todos veem; Se preenchido = apenas usuários com plano correspondente

**⚠️ PROBLEMA CRÍTICO**: Estes sistemas são **INCOMPATÍVEIS** e resolvem problemas diferentes.

---

## 🔍 ANÁLISE DETALHADA

### 1. Sistema de Visibilidade por Tipo (Atual - Dishes/Workouts/Challenges)

**Arquivo**: `20260117220000_dish_visibility_strategy.sql`

**Estrutura**:
```sql
ALTER TABLE public.dishes 
ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'private', -- 'global', 'academy', 'private'
ADD COLUMN owner_id UUID REFERENCES auth.users(id),
ADD COLUMN academy_id UUID REFERENCES public.academies(id);
```

**Regras**:
- `global`: Visível para TODOS os usuários autenticados
- `academy`: Visível apenas para membros da academia específica
- `private`: Visível apenas para o dono (owner_id)

**RLS Policy**:
```sql
CREATE POLICY "Dishes Visibility Policy" ON public.dishes
FOR SELECT
USING (
    visibility_type = 'global'
    OR (visibility_type = 'private' AND owner_id = auth.uid())
    OR (
        visibility_type = 'academy' 
        AND academy_id IN (
            SELECT academy_id FROM public.academy_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    )
    OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);
```

**Função Auxiliar**: `can_view_content(visibility, academy_id, created_by, user_id)`

---

### 2. Sistema de Visibilidade por Plano de Assinatura (Exercises)

**Arquivo**: `20260117132700_exercise_visibility_idempotent.sql`

**Estrutura**:
```sql
CREATE TABLE public.exercise_plans (
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (exercise_id, plan_id)
);
```

**Regras**:
- **Se `exercise_plans` está VAZIO** para um exercício → Visível para TODOS
- **Se `exercise_plans` tem registros** → Visível APENAS para usuários com `plan_id` correspondente

**Implementação Frontend** (`useAdminContent.ts`):
```typescript
planIds: (ex.exercise_plans || []).map((ep: any) => ep.plan_id)
```

**⚠️ PROBLEMA**: Não há RLS policy implementada para filtrar exercícios por plano do usuário!

---

## 🎯 PROPOSTA DE SOLUÇÃO

### Opção A: Sistema Híbrido (RECOMENDADO)

Combinar ambos os sistemas para máxima flexibilidade:

```
Entidade
  ├─ visibility_type ('global', 'academy', 'private', 'plan_restricted')
  ├─ owner_id
  ├─ academy_id
  └─ entity_plans[] (many-to-many)

Regra de Visibilidade:
1. Se visibility_type = 'global' → TODOS veem
2. Se visibility_type = 'academy' → Apenas membros da academy_id
3. Se visibility_type = 'private' → Apenas owner_id
4. Se visibility_type = 'plan_restricted':
   - Se entity_plans VAZIO → TODOS veem (fallback)
   - Se entity_plans PREENCHIDO → Apenas usuários com plano correspondente
```

**Vantagens**:
- Mantém compatibilidade com sistema atual de dishes/workouts
- Adiciona controle granular por plano de assinatura
- Permite migração gradual
- Suporta casos de uso complexos (ex: exercício global MAS restrito a planos premium)

**Desvantagens**:
- Maior complexidade
- Requer migração de dados

---

### Opção B: Apenas Planos (Mais Simples)

Remover `visibility_type` e usar APENAS `entity_plans`:

```
Entidade
  ├─ owner_id (para conteúdo privado)
  ├─ academy_id (para modo academia)
  └─ entity_plans[] (many-to-many)

Regra de Visibilidade:
1. Se academy_id IS NOT NULL → Visível apenas para membros da academia
2. Se owner_id IS NOT NULL AND academy_id IS NULL → Privado (apenas dono)
3. Se entity_plans VAZIO → Global (todos veem)
4. Se entity_plans PREENCHIDO → Apenas usuários com plano correspondente
```

**Vantagens**:
- Mais simples
- Menos colunas
- Lógica unificada

**Desvantagens**:
- Requer migração completa de dados existentes
- Perde semântica clara de 'global' vs 'plan_restricted'

---

## 🏗️ IMPLEMENTAÇÃO RECOMENDADA (Opção A)

### Fase 1: Criar Abstração Centralizada

**Arquivo**: `supabase/migrations/20260118000001_unified_visibility_system.sql`

```sql
-- =====================================================
-- UNIFIED VISIBILITY SYSTEM
-- Abstração reutilizável para visibilidade por plano
-- =====================================================

-- 1. Criar tabelas de relacionamento (idempotent)

CREATE TABLE IF NOT EXISTS public.workout_plans (
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (workout_id, plan_id)
);

CREATE TABLE IF NOT EXISTS public.dish_plans (
    dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (dish_id, plan_id)
);

CREATE TABLE IF NOT EXISTS public.diet_plan_plans (
    diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (diet_plan_id, plan_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_plans (
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (challenge_id, plan_id)
);

-- 2. Adicionar coluna visibility_type onde não existe

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'global' 
CHECK (visibility_type IN ('global', 'academy', 'private', 'plan_restricted'));

ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'global' 
CHECK (visibility_type IN ('global', 'academy', 'private', 'plan_restricted'));

ALTER TABLE public.diet_plans 
ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'global' 
CHECK (visibility_type IN ('global', 'academy', 'private', 'plan_restricted'));

-- Dishes já tem visibility_type, apenas adicionar novo valor
ALTER TABLE public.dishes DROP CONSTRAINT IF EXISTS dishes_visibility_type_check;
ALTER TABLE public.dishes 
ADD CONSTRAINT dishes_visibility_type_check 
CHECK (visibility_type IN ('global', 'academy', 'private', 'plan_restricted'));

-- Exercises não tem visibility_type, adicionar
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'plan_restricted' 
CHECK (visibility_type IN ('global', 'academy', 'private', 'plan_restricted'));

-- 3. Função Unificada de Visibilidade

CREATE OR REPLACE FUNCTION public.can_view_entity_by_plan(
    _entity_type TEXT,           -- 'exercise', 'workout', 'dish', 'diet_plan', 'challenge'
    _entity_id UUID,
    _visibility_type TEXT,
    _academy_id UUID,
    _owner_id UUID,
    _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_plan_ids UUID[];
    v_entity_plan_ids UUID[];
    v_user_academies UUID[];
    v_table_name TEXT;
BEGIN
    -- Admin vê tudo
    IF public.is_admin(_user_id) THEN
        RETURN true;
    END IF;
    
    -- Global: todos veem
    IF _visibility_type = 'global' THEN
        RETURN true;
    END IF;
    
    -- Private: apenas dono
    IF _visibility_type = 'private' AND _owner_id = _user_id THEN
        RETURN true;
    END IF;
    
    -- Academy: apenas membros da academia
    IF _visibility_type = 'academy' THEN
        v_user_academies := public.get_user_academy_ids(_user_id);
        IF _academy_id = ANY(v_user_academies) THEN
            RETURN true;
        END IF;
        RETURN false;
    END IF;
    
    -- Plan Restricted: verificar planos
    IF _visibility_type = 'plan_restricted' THEN
        -- Determinar tabela de relacionamento
        v_table_name := _entity_type || '_plans';
        
        -- Buscar planos associados à entidade
        EXECUTE format(
            'SELECT ARRAY_AGG(plan_id) FROM public.%I WHERE %I = $1',
            v_table_name,
            _entity_type || '_id'
        ) INTO v_entity_plan_ids USING _entity_id;
        
        -- Se não tem planos associados, é visível para todos (fallback)
        IF v_entity_plan_ids IS NULL OR array_length(v_entity_plan_ids, 1) = 0 THEN
            RETURN true;
        END IF;
        
        -- Buscar planos do usuário
        SELECT ARRAY_AGG(plan_id) INTO v_user_plan_ids
        FROM public.user_subscriptions
        WHERE user_id = _user_id 
        AND status = 'active';
        
        -- Verificar se usuário tem algum plano correspondente
        IF v_user_plan_ids IS NOT NULL AND v_entity_plan_ids && v_user_plan_ids THEN
            RETURN true;
        END IF;
        
        RETURN false;
    END IF;
    
    -- Default: não visível
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_entity_by_plan IS 
'Função unificada para verificar visibilidade de entidades por plano de assinatura';

-- 4. Criar RLS Policies Unificadas

-- Exercises
DROP POLICY IF EXISTS "Exercises Visibility Policy" ON public.exercises;
CREATE POLICY "Exercises Visibility Policy" ON public.exercises
FOR SELECT
USING (
    public.can_view_entity_by_plan(
        'exercise',
        id,
        COALESCE(visibility_type, 'plan_restricted'),
        academy_id,
        created_by_id,
        auth.uid()
    )
);

-- Workouts
DROP POLICY IF EXISTS "Workouts Visibility Policy" ON public.workouts;
CREATE POLICY "Workouts Visibility Policy" ON public.workouts
FOR SELECT
USING (
    public.can_view_entity_by_plan(
        'workout',
        id,
        COALESCE(visibility_type, 'global'),
        academy_id,
        created_by,
        auth.uid()
    )
);

-- Dishes
DROP POLICY IF EXISTS "Dishes Visibility Policy" ON public.dishes;
CREATE POLICY "Dishes Visibility Policy" ON public.dishes
FOR SELECT
USING (
    public.can_view_entity_by_plan(
        'dish',
        id,
        COALESCE(visibility_type, 'global'),
        academy_id,
        owner_id,
        auth.uid()
    )
);

-- Diet Plans
DROP POLICY IF EXISTS "Diet Plans Visibility Policy" ON public.diet_plans;
CREATE POLICY "Diet Plans Visibility Policy" ON public.diet_plans
FOR SELECT
USING (
    public.can_view_entity_by_plan(
        'diet_plan',
        id,
        COALESCE(visibility_type, 'global'),
        academy_id,
        created_by,
        auth.uid()
    )
);

-- Challenges
DROP POLICY IF EXISTS "Challenges Visibility Policy" ON public.challenges;
CREATE POLICY "Challenges Visibility Policy" ON public.challenges
FOR SELECT
USING (
    public.can_view_entity_by_plan(
        'challenge',
        id,
        COALESCE(visibility_type, 'global'),
        academy_id,
        created_by,
        auth.uid()
    )
);

-- 5. Criar Índices para Performance

CREATE INDEX IF NOT EXISTS idx_workout_plans_workout_id ON public.workout_plans(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_plan_id ON public.workout_plans(plan_id);

CREATE INDEX IF NOT EXISTS idx_dish_plans_dish_id ON public.dish_plans(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_plans_plan_id ON public.dish_plans(plan_id);

CREATE INDEX IF NOT EXISTS idx_diet_plan_plans_diet_plan_id ON public.diet_plan_plans(diet_plan_id);
CREATE INDEX IF NOT EXISTS idx_diet_plan_plans_plan_id ON public.diet_plan_plans(plan_id);

CREATE INDEX IF NOT EXISTS idx_challenge_plans_challenge_id ON public.challenge_plans(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_plans_plan_id ON public.challenge_plans(plan_id);

-- 6. Enable RLS

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_plans ENABLE ROW LEVEL SECURITY;

-- Policies para tabelas de relacionamento (admin manage, all read)
CREATE POLICY "Allow read workout_plans" ON public.workout_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages workout_plans" ON public.workout_plans FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow read dish_plans" ON public.dish_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages dish_plans" ON public.dish_plans FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow read diet_plan_plans" ON public.diet_plan_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages diet_plan_plans" ON public.diet_plan_plans FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow read challenge_plans" ON public.challenge_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages challenge_plans" ON public.challenge_plans FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Migrar dados existentes de exercises para novo sistema

UPDATE public.exercises
SET visibility_type = 'plan_restricted'
WHERE visibility_type IS NULL;

-- 8. Comments

COMMENT ON TABLE public.workout_plans IS 'Relaciona workouts aos planos de assinatura';
COMMENT ON TABLE public.dish_plans IS 'Relaciona pratos aos planos de assinatura';
COMMENT ON TABLE public.diet_plan_plans IS 'Relaciona planos alimentares aos planos de assinatura';
COMMENT ON TABLE public.challenge_plans IS 'Relaciona desafios aos planos de assinatura';
```

---

### Fase 2: Atualizar Frontend (TypeScript)

**Arquivo**: `src/hooks/useUnifiedVisibility.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

export type EntityType = 'exercise' | 'workout' | 'dish' | 'diet_plan' | 'challenge';
export type VisibilityType = 'global' | 'academy' | 'private' | 'plan_restricted';

interface VisibilityConfig {
  visibilityType: VisibilityType;
  planIds: string[];
  academyId?: string;
  ownerId?: string;
}

/**
 * Hook unificado para gerenciar visibilidade por plano
 */
export function useUnifiedVisibility() {
  
  /**
   * Salva configuração de visibilidade para uma entidade
   */
  const saveVisibilityConfig = async (
    entityType: EntityType,
    entityId: string,
    config: VisibilityConfig
  ) => {
    const tableName = `${entityType}_plans`;
    
    // 1. Atualizar visibility_type na tabela principal
    const mainTable = entityType === 'diet_plan' ? 'diet_plans' : `${entityType}s`;
    await supabase
      .from(mainTable as any)
      .update({ visibility_type: config.visibilityType })
      .eq('id', entityId);
    
    // 2. Se for plan_restricted, gerenciar relacionamentos
    if (config.visibilityType === 'plan_restricted') {
      // Deletar relacionamentos antigos
      await (supabase as any)
        .from(tableName)
        .delete()
        .eq(`${entityType}_id`, entityId);
      
      // Inserir novos relacionamentos
      if (config.planIds.length > 0) {
        const relations = config.planIds.map(planId => ({
          [`${entityType}_id`]: entityId,
          plan_id: planId
        }));
        
        await (supabase as any)
          .from(tableName)
          .insert(relations);
      }
    }
  };
  
  /**
   * Busca configuração de visibilidade de uma entidade
   */
  const getVisibilityConfig = async (
    entityType: EntityType,
    entityId: string
  ): Promise<VisibilityConfig | null> => {
    const mainTable = entityType === 'diet_plan' ? 'diet_plans' : `${entityType}s`;
    const tableName = `${entityType}_plans`;
    
    // Buscar dados principais
    const { data: entity } = await (supabase as any)
      .from(mainTable)
      .select(`
        visibility_type,
        academy_id,
        ${entityType === 'dish' ? 'owner_id' : 'created_by'},
        ${tableName}(plan_id)
      `)
      .eq('id', entityId)
      .single();
    
    if (!entity) return null;
    
    return {
      visibilityType: entity.visibility_type || 'global',
      planIds: (entity[tableName] || []).map((p: any) => p.plan_id),
      academyId: entity.academy_id,
      ownerId: entity.owner_id || entity.created_by
    };
  };
  
  return {
    saveVisibilityConfig,
    getVisibilityConfig
  };
}
```

---

### Fase 3: Atualizar Componentes Admin

**Arquivo**: `src/components/admin/VisibilitySelector.tsx`

```typescript
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityType, VisibilityType } from "@/hooks/useUnifiedVisibility";

interface VisibilitySelectorProps {
  entityType: EntityType;
  value: {
    visibilityType: VisibilityType;
    planIds: string[];
  };
  onChange: (value: { visibilityType: VisibilityType; planIds: string[] }) => void;
}

export function VisibilitySelector({ entityType, value, onChange }: VisibilitySelectorProps) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>(value.planIds);
  
  // Buscar planos disponíveis
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('plans')
        .select('id, name')
        .order('name');
      return data || [];
    }
  });
  
  useEffect(() => {
    setSelectedPlans(value.planIds);
  }, [value.planIds]);
  
  const handleVisibilityChange = (newType: VisibilityType) => {
    onChange({
      visibilityType: newType,
      planIds: newType === 'plan_restricted' ? selectedPlans : []
    });
  };
  
  const handlePlanToggle = (planId: string) => {
    const newPlans = selectedPlans.includes(planId)
      ? selectedPlans.filter(id => id !== planId)
      : [...selectedPlans, planId];
    
    setSelectedPlans(newPlans);
    onChange({
      visibilityType: value.visibilityType,
      planIds: newPlans
    });
  };
  
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <Label>Visibilidade</Label>
        <Select value={value.visibilityType} onValueChange={handleVisibilityChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">🌍 Global (Todos)</SelectItem>
            <SelectItem value="academy">🏢 Academia</SelectItem>
            <SelectItem value="private">🔒 Privado</SelectItem>
            <SelectItem value="plan_restricted">💎 Restrito por Plano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {value.visibilityType === 'plan_restricted' && (
        <div className="space-y-2">
          <Label>Planos com Acesso</Label>
          <div className="flex flex-wrap gap-2">
            {plans.map((plan: any) => (
              <Badge
                key={plan.id}
                variant={selectedPlans.includes(plan.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handlePlanToggle(plan.id)}
              >
                {plan.name}
                {selectedPlans.includes(plan.id) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
          {selectedPlans.length === 0 && (
            <p className="text-sm text-yellow-600">
              ⚠️ Nenhum plano selecionado = Visível para TODOS (fallback)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Testes de Visibilidade

- [ ] **Global**: Usuário sem plano vê conteúdo global
- [ ] **Academy**: Usuário vê apenas conteúdo da sua academia
- [ ] **Private**: Usuário vê apenas seu próprio conteúdo
- [ ] **Plan Restricted (vazio)**: Todos os usuários veem
- [ ] **Plan Restricted (preenchido)**: Apenas usuários com plano correspondente veem
- [ ] **Admin**: Admin vê TODO o conteúdo independente de visibilidade
- [ ] **Multi-Academy**: Usuário em múltiplas academias vê conteúdo de todas
- [ ] **Múltiplos Planos**: Usuário com múltiplos planos vê conteúdo de todos

### Testes de Performance

- [ ] Query de listagem com 1000+ itens < 500ms
- [ ] Índices criados corretamente
- [ ] Sem N+1 queries
- [ ] Cache de planos do usuário funcionando

### Testes de Segurança

- [ ] RLS policies aplicadas em todas as tabelas
- [ ] Usuário não consegue ver conteúdo restrito via API direta
- [ ] Admin consegue gerenciar visibilidade
- [ ] Usuário comum não consegue alterar visibilidade de conteúdo alheio

---

## 🎯 EDGE CASES

### 1. Usuário sem plano ativo
**Comportamento**: Vê apenas conteúdo 'global' e 'plan_restricted' sem planos associados

### 2. Conteúdo sem visibility_type definido
**Comportamento**: Fallback para 'global' (via COALESCE nas policies)

### 3. Plano deletado
**Comportamento**: Relacionamento em `entity_plans` é deletado automaticamente (ON DELETE CASCADE)

### 4. Usuário muda de plano
**Comportamento**: Visibilidade atualizada automaticamente na próxima query

### 5. Academia desativada
**Comportamento**: Conteúdo da academia fica invisível (via status check em academy_members)

### 6. Migração de dados existentes
**Comportamento**: 
- Exercises: Migrar para `visibility_type = 'plan_restricted'`
- Dishes/Workouts: Manter `visibility_type = 'global'` atual
- Novos: Default 'global' (exceto exercises que é 'plan_restricted')

---

## 🧪 TESTES AUTOMATIZADOS RECOMENDADOS

```typescript
// tests/visibility.test.ts

describe('Unified Visibility System', () => {
  describe('Global Visibility', () => {
    it('should show global content to all users', async () => {
      // Test implementation
    });
  });
  
  describe('Plan Restricted Visibility', () => {
    it('should show content when user has matching plan', async () => {
      // Test implementation
    });
    
    it('should hide content when user lacks required plan', async () => {
      // Test implementation
    });
    
    it('should show content to all when no plans are associated (fallback)', async () => {
      // Test implementation
    });
  });
  
  describe('Academy Visibility', () => {
    it('should show academy content only to members', async () => {
      // Test implementation
    });
  });
  
  describe('Private Visibility', () => {
    it('should show private content only to owner', async () => {
      // Test implementation
    });
  });
  
  describe('Admin Override', () => {
    it('should show all content to admin users', async () => {
      // Test implementation
    });
  });
});
```

---

## 📊 COMPARAÇÃO DE ABORDAGENS

| Critério | Sistema Atual (Fragmentado) | Opção A (Híbrido) | Opção B (Apenas Planos) |
|----------|----------------------------|-------------------|------------------------|
| **Complexidade** | Alta (2 sistemas) | Média | Baixa |
| **Flexibilidade** | Limitada | Máxima | Média |
| **Migração** | N/A | Gradual | Completa |
| **Performance** | Boa | Boa | Excelente |
| **Manutenibilidade** | Ruim | Boa | Excelente |
| **Compatibilidade** | N/A | Total | Parcial |

---

## 🚀 ROADMAP DE IMPLEMENTAÇÃO

### Sprint 1 (1 semana)
- [ ] Criar migration unificada
- [ ] Implementar função `can_view_entity_by_plan()`
- [ ] Criar tabelas `*_plans` para workout, dish, diet_plan, challenge
- [ ] Aplicar RLS policies

### Sprint 2 (1 semana)
- [ ] Criar hook `useUnifiedVisibility`
- [ ] Criar componente `VisibilitySelector`
- [ ] Atualizar formulários de admin (Exercise, Workout, Dish, Diet Plan, Challenge)

### Sprint 3 (1 semana)
- [ ] Testes automatizados
- [ ] Migração de dados existentes
- [ ] Documentação
- [ ] Deploy e monitoramento

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Quebra de compatibilidade | Média | Alto | Usar COALESCE para fallback, manter dados antigos |
| Performance degradada | Baixa | Alto | Índices otimizados, cache de planos do usuário |
| Confusão de usuários | Média | Médio | UI clara, tooltips explicativos |
| Migração de dados falha | Baixa | Alto | Backup antes da migration, rollback plan |

---

## 📝 CONCLUSÃO

**RECOMENDAÇÃO FINAL**: Implementar **Opção A (Sistema Híbrido)**

**Justificativa**:
1. ✅ Mantém compatibilidade total com sistema atual
2. ✅ Adiciona flexibilidade de controle por plano
3. ✅ Permite migração gradual sem downtime
4. ✅ Suporta todos os casos de uso atuais e futuros
5. ✅ Performance otimizada via índices e RLS policies

**Próximos Passos Imediatos**:
1. Revisar e aprovar esta proposta
2. Criar branch `feature/unified-visibility`
3. Implementar migration SQL
4. Testar em ambiente de staging
5. Deploy gradual em produção

---

**Autor**: Antigravity AI  
**Data**: 2026-01-18  
**Versão**: 1.0  
**Status**: Aguardando Aprovação
