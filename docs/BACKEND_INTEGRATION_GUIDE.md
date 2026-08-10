# 🔧 Guia de Integração Backend - Salvamento de Visibilidade

## 📋 Status Atual

### ✅ **Completo**
- Migration SQL aplicada
- Hook `useUnifiedVisibility` criado
- Componente `VisibilitySelector` criado
- **5 formulários integrados visualmente**

### ⏳ **Pendente**
- **Integração backend para salvar visibilidade**

---

## 🎯 O Que Precisa Ser Feito

Os formulários já capturam `visibilityType` e `planIds`, mas os hooks de salvamento ainda não persistem esses dados no banco. Precisamos atualizar os hooks de salvamento.

---

## 📝 Hooks que Precisam de Atualização

### 1. **useExercises.ts** (Exercises)

**Localização:** `src/hooks/useExercises.ts`

**Mudanças Necessárias:**

```typescript
// 1. Adicionar import
import { useUnifiedVisibility } from "./useUnifiedVisibility";

// 2. Dentro de useExercises(), adicionar o hook
const { saveVisibilityConfig } = useUnifiedVisibility();

// 3. Atualizar createExerciseMutation (linha 161-210)
const createExerciseMutation = useMutation({
  mutationFn: async (data: ExerciseFormData & { visibilityType?: string; planIds?: string[] }) => {
    // ... código existente de insert ...
    
    const { data: result, error } = await supabase
      .from("exercises")
      .insert({
        // ... campos existentes ...
        visibility_type: data.visibilityType || 'plan_restricted', // NOVO
      })
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Salvar visibilidade
    if (result && data.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'exercise',
        entityId: result.id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
  // ... onSuccess e onError permanecem iguais
});

// 4. Atualizar updateExerciseMutation (linha 213-255)
const updateExerciseMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string; data: Partial<ExerciseFormData> & { visibilityType?: string; planIds?: string[] } }) => {
    // ... código existente de update ...
    
    const { data: result, error } = await supabase
      .from("exercises")
      .update({
        // ... campos existentes ...
        visibility_type: data.visibilityType, // NOVO
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Atualizar visibilidade
    if (data.visibilityType !== undefined) {
      await saveVisibilityConfig({
        entityType: 'exercise',
        entityId: id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
  // ... onSuccess e onError permanecem iguais
});
```

---

### 2. **useAdminContent.ts** (Workouts, Dishes, Diet Plans, Challenges)

**Localização:** `src/hooks/useAdminContent.ts`

**Status:** ✅ Hook `useUnifiedVisibility` já foi importado e adicionado (linha 373)

**Mudanças Necessárias:**

#### A. **saveDietMutation** (Dishes - linha ~430)

```typescript
// Procurar por saveDietMutation
const saveDietMutation = useMutation({
  mutationFn: async ({ id, data }: { id?: string; data: Omit<Diet, "id" | "createdAt"> & { visibilityType?: string; planIds?: string[] } }) => {
    // ... código existente ...
    
    const { data: result, error } = await supabase
      .from("dishes")
      .upsert({
        // ... campos existentes ...
        visibility_type: data.visibilityType || 'global', // NOVO
      })
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Salvar visibilidade
    if (result && data.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'dish',
        entityId: result.id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
});
```

#### B. **saveWorkoutMutation** (linha ~600)

```typescript
const saveWorkoutMutation = useMutation({
  mutationFn: async ({ id, data }: { id?: string; data: Omit<Workout, "id" | "createdAt"> & { visibilityType?: string; planIds?: string[] } }) => {
    // ... código existente ...
    
    const { data: result, error } = await supabase
      .from("workouts")
      .upsert({
        // ... campos existentes ...
        visibility_type: data.visibilityType || 'global', // NOVO
      })
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Salvar visibilidade
    if (result && data.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'workout',
        entityId: result.id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
});
```

#### C. **saveChallengeMutation** (linha ~735)

```typescript
const saveChallengeMutation = useMutation({
  mutationFn: async ({ id, data }: { id?: string; data: Omit<Challenge, "id" | "createdAt"> & { visibilityType?: string; planIds?: string[] } }) => {
    // ... código existente ...
    
    const { data: result, error } = await supabase
      .from("challenges")
      .upsert({
        // ... campos existentes ...
        visibility_type: data.visibilityType || 'global', // NOVO
      })
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Salvar visibilidade
    if (result && data.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'challenge',
        entityId: result.id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
});
```

#### D. **DietPlanForm** (procurar por mutation de diet plans)

```typescript
// Procurar por mutation que salva diet_plans
const saveDietPlanMutation = useMutation({
  mutationFn: async ({ id, data }: { id?: string; data: any }) => {
    // ... código existente ...
    
    const { data: result, error } = await supabase
      .from("diet_plans")
      .upsert({
        // ... campos existentes ...
        visibility_type: data.visibilityType || 'global', // NOVO
      })
      .select()
      .single();

    if (error) throw error;
    
    // NOVO: Salvar visibilidade
    if (result && data.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'diet_plan',
        entityId: result.id,
        config: {
          visibilityType: data.visibilityType as any,
          planIds: data.planIds || []
        }
      });
    }
    
    return result;
  },
});
```

---

## 🔍 Como Encontrar as Mutations

### Método 1: Busca por Texto
```bash
# No VSCode, use Ctrl+F (ou Cmd+F no Mac) e procure por:
- "useMutation"
- "from(\"exercises\")"
- "from(\"workouts\")"
- "from(\"dishes\")"
- "from(\"diet_plans\")"
- "from(\"challenges\")"
```

### Método 2: Outline do Arquivo
- Abra o arquivo no VSCode
- Use Ctrl+Shift+O (ou Cmd+Shift+O no Mac)
- Procure por "mutation" no outline

---

## ✅ Checklist de Implementação

### useExercises.ts
- [ ] Importar `useUnifiedVisibility`
- [ ] Adicionar hook dentro de `useExercises()`
- [ ] Atualizar `createExerciseMutation`
  - [ ] Adicionar `visibility_type` no insert
  - [ ] Chamar `saveVisibilityConfig` após insert
- [ ] Atualizar `updateExerciseMutation`
  - [ ] Adicionar `visibility_type` no update
  - [ ] Chamar `saveVisibilityConfig` após update

### useAdminContent.ts
- [x] Importar `useUnifiedVisibility` ✅
- [x] Adicionar hook dentro de `useAdminContent()` ✅
- [ ] Atualizar `saveDietMutation` (Dishes)
  - [ ] Adicionar `visibility_type` no upsert
  - [ ] Chamar `saveVisibilityConfig` após upsert
- [ ] Atualizar `saveWorkoutMutation`
  - [ ] Adicionar `visibility_type` no upsert
  - [ ] Chamar `saveVisibilityConfig` após upsert
- [ ] Atualizar `saveChallengeMutation`
  - [ ] Adicionar `visibility_type` no upsert
  - [ ] Chamar `saveVisibilityConfig` após upsert
- [ ] Atualizar mutation de `diet_plans`
  - [ ] Adicionar `visibility_type` no upsert
  - [ ] Chamar `saveVisibilityConfig` após upsert

---

## 🧪 Como Testar

Após fazer as mudanças:

1. **Abrir formulário** (ex: criar novo exercício)
2. **Preencher dados** básicos
3. **Selecionar visibilidade** (ex: "Plan Restricted" + selecionar planos)
4. **Salvar**
5. **Verificar no banco:**
   ```sql
   -- Verificar se visibility_type foi salvo
   SELECT id, name, visibility_type FROM exercises WHERE name = 'Teste';
   
   -- Verificar se planos foram associados
   SELECT * FROM exercise_plans WHERE exercise_id = 'ID_DO_EXERCICIO';
   ```

---

## 📊 Progresso Estimado

| Tarefa | Tempo Estimado | Status |
|--------|---------------|--------|
| useExercises.ts | 15 min | ⏳ Pendente |
| saveDietMutation | 10 min | ⏳ Pendente |
| saveWorkoutMutation | 10 min | ⏳ Pendente |
| saveChallengeMutation | 10 min | ⏳ Pendente |
| saveDietPlanMutation | 10 min | ⏳ Pendente |
| Testes | 15 min | ⏳ Pendente |
| **TOTAL** | **~70 min** | **0% Completo** |

---

## 💡 Dicas

1. **Copie e cole o padrão** - Todas as mutations seguem o mesmo padrão
2. **Teste uma por vez** - Implemente e teste cada domínio separadamente
3. **Use o console** - Verifique erros no console do navegador
4. **Verifique o banco** - Use SQL para confirmar que os dados foram salvos

---

## 🚨 Possíveis Erros

### Erro: "Column 'visibility_type' does not exist"
**Solução:** Aplicar a migration SQL primeiro
```bash
npx supabase db push
```

### Erro: "Cannot read property 'visibilityType' of undefined"
**Solução:** Verificar se o formulário está passando os dados corretamente

### Erro: "RLS policy violation"
**Solução:** Verificar se as RLS policies foram criadas na migration

---

**Última Atualização:** 2026-01-18 23:05 UTC  
**Responsável:** Antigravity AI  
**Status:** Guia Completo ✅
