# 🚀 Sistema Unificado de Visibilidade - Guia de Implementação Rápida

## 📋 Visão Geral

Este sistema unifica o controle de visibilidade de conteúdo por plano de assinatura em todos os domínios do aplicativo.

**Domínios Suportados:**
- ✅ Exercícios (Exercises)
- ✅ Treinos (Workouts)
- ✅ Pratos (Dishes)
- ✅ Planos Alimentares (Diet Plans)
- ✅ Desafios (Challenges)

**Tipos de Visibilidade:**
- 🌍 **Global**: Todos os usuários veem
- 🏢 **Academy**: Apenas membros da academia
- 🔒 **Private**: Apenas o criador
- 💎 **Plan Restricted**: Apenas usuários com planos específicos

---

## ⚡ Quick Start (5 minutos)

### Passo 1: Aplicar Migration

```bash
# Aplicar migration SQL
npx supabase db push
```

Ou manualmente:
```bash
psql -U postgres -d flexi_bloom -f supabase/migrations/20260118000001_unified_visibility_system.sql
```

### Passo 2: Verificar Instalação

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%_plans'
ORDER BY table_name;

-- Deve retornar:
-- challenge_plans
-- diet_plan_plans
-- dish_plans
-- exercise_plans
-- workout_plans
```

### Passo 3: Testar Função

```sql
-- Testar função de visibilidade
SELECT public.can_view_entity_by_plan(
    'exercise',                    -- tipo de entidade
    'test-id'::uuid,              -- id da entidade
    'global',                      -- tipo de visibilidade
    NULL,                          -- academy_id
    NULL,                          -- owner_id
    auth.uid()                     -- user_id
);

-- Deve retornar: true (global é visível para todos)
```

---

## 🎯 Uso Básico

### 1. Adicionar ao Formulário

```typescript
import { VisibilitySelector } from "@/components/admin/VisibilitySelector";
import { useUnifiedVisibility } from "@/hooks/useUnifiedVisibility";

function ExerciseForm() {
  const [visibility, setVisibility] = useState({
    visibilityType: 'plan_restricted',
    planIds: []
  });

  return (
    <form>
      {/* Seus campos existentes */}
      
      <VisibilitySelector
        entityType="exercise"
        value={visibility}
        onChange={setVisibility}
      />
      
      <button type="submit">Salvar</button>
    </form>
  );
}
```

### 2. Salvar Configuração

```typescript
const { saveVisibilityConfig } = useUnifiedVisibility();

const handleSave = async (exerciseId: string) => {
  await saveVisibilityConfig({
    entityType: 'exercise',
    entityId: exerciseId,
    config: {
      visibilityType: visibility.visibilityType,
      planIds: visibility.planIds
    }
  });
};
```

### 3. Carregar Configuração Existente

```typescript
import { useEntityVisibility } from "@/hooks/useUnifiedVisibility";

function EditExercise({ exerciseId }: { exerciseId: string }) {
  const { data: config, isLoading } = useEntityVisibility('exercise', exerciseId);
  
  if (isLoading) return <div>Carregando...</div>;
  
  return (
    <VisibilitySelector
      entityType="exercise"
      value={{
        visibilityType: config?.visibilityType || 'global',
        planIds: config?.planIds || []
      }}
      onChange={handleChange}
    />
  );
}
```

---

## 🔄 Migração de Código Existente

### Antes (Sistema Antigo - Exercises)

```typescript
// useAdminContent.ts
const { data } = await supabase
  .from('exercises')
  .select(`
    *,
    exercise_plans(plan_id)
  `);

// Lógica manual de visibilidade
const planIds = (exercise.exercise_plans || []).map(ep => ep.plan_id);
```

### Depois (Sistema Novo - Unificado)

```typescript
// useUnifiedVisibility.ts
const { useVisibleEntities } = useUnifiedVisibility();
const { data: exercises } = useVisibleEntities('exercise');

// RLS cuida da visibilidade automaticamente!
// Você só vê o que tem permissão
```

---

## 📝 Exemplos por Domínio

### Exercises (Padrão: plan_restricted)

```typescript
<VisibilitySelector
  entityType="exercise"
  value={{ visibilityType: 'plan_restricted', planIds: ['premium-plan-id'] }}
  onChange={handleChange}
/>
```

### Workouts (Padrão: global)

```typescript
<VisibilitySelector
  entityType="workout"
  value={{ visibilityType: 'global', planIds: [] }}
  onChange={handleChange}
/>
```

### Dishes (Padrão: global)

```typescript
<VisibilitySelector
  entityType="dish"
  value={{ visibilityType: 'global', planIds: [] }}
  onChange={handleChange}
/>
```

### Diet Plans (Padrão: global)

```typescript
<VisibilitySelector
  entityType="diet_plan"
  value={{ visibilityType: 'global', planIds: [] }}
  onChange={handleChange}
/>
```

### Challenges (Padrão: global)

```typescript
<VisibilitySelector
  entityType="challenge"
  value={{ visibilityType: 'global', planIds: [] }}
  onChange={handleChange}
/>
```

---

## 🎨 Variações de UI

### Versão Completa (Recomendada)

```typescript
import { VisibilitySelector } from "@/components/admin/VisibilitySelector";

<VisibilitySelector
  entityType="exercise"
  value={visibility}
  onChange={setVisibility}
  showDescription={true}  // Mostra descrições detalhadas
/>
```

### Versão Compacta (Para Modals/Sidebars)

```typescript
import { VisibilitySelectorCompact } from "@/components/admin/VisibilitySelector";

<VisibilitySelectorCompact
  entityType="exercise"
  value={visibility}
  onChange={setVisibility}
/>
```

---

## 🔍 Queries Úteis

### Listar Conteúdo por Tipo de Visibilidade

```sql
-- Exercícios globais
SELECT id, name FROM exercises WHERE visibility_type = 'global';

-- Exercícios restritos por plano
SELECT 
    e.id,
    e.name,
    ARRAY_AGG(ep.plan_id) as plan_ids
FROM exercises e
LEFT JOIN exercise_plans ep ON e.id = ep.exercise_id
WHERE e.visibility_type = 'plan_restricted'
GROUP BY e.id, e.name;
```

### Verificar Visibilidade de um Usuário

```sql
-- Exercícios visíveis para um usuário específico
SELECT e.* 
FROM exercises e
WHERE public.can_view_entity_by_plan(
    'exercise',
    e.id,
    e.visibility_type,
    e.academy_id,
    e.created_by_id,
    '<user_id>'::uuid
) = true;
```

### Estatísticas de Visibilidade

```sql
SELECT 
    visibility_type,
    COUNT(*) as total
FROM exercises
GROUP BY visibility_type
ORDER BY total DESC;
```

---

## 🐛 Troubleshooting

### Problema: Usuário não vê conteúdo esperado

**Diagnóstico:**
```sql
-- Verificar visibilidade do item
SELECT 
    id,
    name,
    visibility_type,
    academy_id,
    created_by_id
FROM exercises
WHERE id = '<exercise_id>';

-- Verificar planos associados
SELECT plan_id FROM exercise_plans WHERE exercise_id = '<exercise_id>';

-- Verificar planos do usuário
SELECT plan_id, status, expires_at 
FROM user_subscriptions 
WHERE user_id = '<user_id>';
```

**Soluções:**
1. Verificar se `visibility_type` está correto
2. Verificar se planos estão associados corretamente
3. Verificar se usuário tem plano ativo (`status = 'active'`)
4. Verificar se plano não expirou (`expires_at > now()`)

### Problema: Erro ao salvar visibilidade

**Diagnóstico:**
```typescript
// Verificar se tabela de relacionamento existe
const { data, error } = await supabase
  .from('exercise_plans')
  .select('*')
  .limit(1);

console.log('Tabela existe?', !error);
```

**Soluções:**
1. Verificar se migration foi aplicada
2. Verificar permissões RLS
3. Verificar se usuário é admin

### Problema: Performance lenta

**Diagnóstico:**
```sql
-- Verificar se índices existem
SELECT indexname FROM pg_indexes 
WHERE tablename = 'exercise_plans';
```

**Soluções:**
1. Verificar se índices foram criados
2. Executar `ANALYZE exercises;`
3. Verificar query plan com `EXPLAIN ANALYZE`

---

## 📚 Recursos Adicionais

### Documentação Completa
- 📄 [Proposta Técnica](./UNIFIED_VISIBILITY_PROPOSAL.md)
- ✅ [Checklist de Validação](./VISIBILITY_VALIDATION_CHECKLIST.md)
- 💡 [Exemplos de Integração](../src/components/admin/VisibilitySelector.examples.tsx)

### Arquivos Principais
- 🗄️ Migration: `supabase/migrations/20260118000001_unified_visibility_system.sql`
- 🎣 Hook: `src/hooks/useUnifiedVisibility.ts`
- 🎨 Componente: `src/components/admin/VisibilitySelector.tsx`

### Suporte
- 🐛 Issues: Reportar problemas no GitHub
- 💬 Discussões: Perguntas e sugestões
- 📖 Wiki: Documentação adicional

---

## ✅ Checklist de Implementação

### Backend
- [x] Migration SQL aplicada
- [x] Função `can_view_entity_by_plan` criada
- [x] RLS policies aplicadas
- [x] Índices criados
- [ ] Testes de validação executados

### Frontend
- [x] Hook `useUnifiedVisibility` criado
- [x] Componente `VisibilitySelector` criado
- [ ] Integrado em ExerciseForm
- [ ] Integrado em WorkoutForm
- [ ] Integrado em DishForm
- [ ] Integrado em DietPlanForm
- [ ] Integrado em ChallengeForm

### Validação
- [ ] Teste: Visibilidade global funciona
- [ ] Teste: Visibilidade plan_restricted funciona
- [ ] Teste: Fallback (sem planos) funciona
- [ ] Teste: Visibilidade academy funciona
- [ ] Teste: Visibilidade private funciona
- [ ] Teste: Admin vê tudo
- [ ] Teste: Performance aceitável

---

## 🎉 Conclusão

Você agora tem um sistema unificado e escalável de visibilidade por plano!

**Próximos Passos:**
1. ✅ Aplicar migration
2. ✅ Testar com dados de exemplo
3. ✅ Integrar em formulários existentes
4. ✅ Validar com checklist completo
5. ✅ Deploy em produção

**Benefícios:**
- 🎯 Código centralizado e reutilizável
- ⚡ Performance otimizada
- 🔒 Segurança via RLS
- 🧩 Fácil manutenção
- 📈 Escalável para novos domínios

---

**Criado em:** 2026-01-18  
**Versão:** 1.0  
**Status:** ✅ Pronto para Uso
