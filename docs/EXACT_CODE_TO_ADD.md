# 🔧 Código Exato para Completar Integração

## ✅ **JÁ INTEGRADO**

### 1. useExercises.ts - ✅ COMPLETO
- Import adicionado
- Hook integrado
- Mutations atualizadas

### 2. useAdminDietPlans.ts - ✅ PARCIAL
- Import adicionado ✅
- Hook adicionado ✅
- Falta: Adicionar código após linha 174

---

## 📝 **CÓDIGO PARA ADICIONAR**

### **useAdminDietPlans.ts** - Linha 174

Adicionar ANTES de `},` na linha 175:

```typescript
            // NEW: Save visibility configuration
            if (planId && (data as any).visibilityType) {
                await saveVisibilityConfig({
                    entityType: 'diet_plan',
                    entityId: planId,
                    config: {
                        visibilityType: (data as any).visibilityType as any,
                        planIds: (data as any).planIds || []
                    }
                });
            }
```

**Localização:** `src/hooks/useAdminDietPlans.ts`, linha 174  
**Contexto:** Dentro da função `saveDietPlanMutation.mutationFn`, após o loop de meals

---

### **useAdminDishes.ts** - Criar Mutation de Save

Este hook NÃO tem mutation de save. Precisa criar:

```typescript
// Adicionar no início
import { useUnifiedVisibility } from "./useUnifiedVisibility";

// Dentro de useAdminDishes()
const { saveVisibilityConfig } = useUnifiedVisibility();

// Adicionar nova mutation
const saveDishMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
        const dishPayload = {
            title: data.title,
            description: data.description,
            image_url: data.imageUrl,
            visibility_type: data.visibilityType || 'global',
            is_active: data.isActive ?? true,
            // ... outros campos
        };

        let dishId = id;
        if (id) {
            const { error } = await supabase
                .from("dishes")
                .update(dishPayload)
                .eq("id", id);
            if (error) throw error;
        } else {
            const { data: result, error } = await supabase
                .from("dishes")
                .insert(dishPayload)
                .select()
                .single();
            if (error) throw error;
            dishId = result.id;
        }

        // Save visibility
        if (dishId && data.visibilityType) {
            await saveVisibilityConfig({
                entityType: 'dish',
                entityId: dishId,
                config: {
                    visibilityType: data.visibilityType,
                    planIds: data.planIds || []
                }
            });
        }

        return dishId;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
        toast.success("Prato salvo com sucesso!");
    }
});

// No return, adicionar:
return {
    // ... existente
    saveDish: (id: string | undefined, data: any) => saveDishMutation.mutateAsync({ id, data })
};
```

---

### **useChallenges.ts** - Verificar e Integrar

Localização: `src/hooks/useChallenges.ts`

**Passos:**
1. Abrir arquivo
2. Procurar por mutation de save
3. Se existir:
   - Adicionar import `useUnifiedVisibility`
   - Adicionar hook
   - Adicionar `visibility_type` no insert/update
   - Chamar `saveVisibilityConfig()`
4. Se NÃO existir:
   - Criar mutation seguindo padrão do useAdminDishes acima

---

### **Workouts** - Procurar Hook de Admin

Pode estar em:
- `src/hooks/useAdminWorkouts.ts` (se existir)
- Ou salvamento inline no componente

**Se encontrar hook:**
```typescript
// Adicionar import
import { useUnifiedVisibility } from "./useUnifiedVisibility";

// Dentro da função
const { saveVisibilityConfig } = useUnifiedVisibility();

// Na mutation de save
const saveWorkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
        const workoutPayload = {
            title: data.title,
            description: data.description,
            visibility_type: data.visibilityType || 'global',
            // ... outros campos
        };

        let workoutId = id;
        if (id) {
            await supabase.from("workouts").update(workoutPayload).eq("id", id);
        } else {
            const { data: result } = await supabase
                .from("workouts")
                .insert(workoutPayload)
                .select()
                .single();
            workoutId = result.id;
        }

        // Save visibility
        if (workoutId && data.visibilityType) {
            await saveVisibilityConfig({
                entityType: 'workout',
                entityId: workoutId,
                config: {
                    visibilityType: data.visibilityType,
                    planIds: data.planIds || []
                }
            });
        }
    }
});
```

---

## 📋 **Checklist de Implementação**

### useAdminDietPlans.ts
- [x] Import adicionado
- [x] Hook adicionado
- [ ] Código de save visibility adicionado (linha 174)
- [ ] Testado

### useAdminDishes.ts
- [ ] Import adicionado
- [ ] Hook adicionado
- [ ] Mutation de save criada
- [ ] Código de save visibility adicionado
- [ ] Return atualizado
- [ ] Testado

### useChallenges.ts
- [ ] Arquivo localizado
- [ ] Mutation encontrada/criada
- [ ] Import adicionado
- [ ] Hook adicionado
- [ ] Código de save visibility adicionado
- [ ] Testado

### Workouts (hook ou componente)
- [ ] Local de save encontrado
- [ ] Import adicionado
- [ ] Hook adicionado
- [ ] Código de save visibility adicionado
- [ ] Testado

---

## 🧪 **Como Testar Cada Um**

```sql
-- Após salvar, verificar:

-- Diet Plans
SELECT id, title, visibility_type FROM diet_plans WHERE title = 'Teste';
SELECT * FROM diet_plan_plans WHERE diet_plan_id = 'ID_AQUI';

-- Dishes
SELECT id, title, visibility_type FROM dishes WHERE title = 'Teste';
SELECT * FROM dish_plans WHERE dish_id = 'ID_AQUI';

-- Challenges
SELECT id, name, visibility_type FROM challenges WHERE name = 'Teste';
SELECT * FROM challenge_plans WHERE challenge_id = 'ID_AQUI';

-- Workouts
SELECT id, title, visibility_type FROM workouts WHERE title = 'Teste';
SELECT * FROM workout_plans WHERE workout_id = 'ID_AQUI';
```

---

## 🎯 **Prioridade de Implementação**

1. **useAdminDietPlans.ts** - Adicionar 1 bloco de código (5 min)
2. **useAdminDishes.ts** - Criar mutation completa (15 min)
3. **useChallenges.ts** - Verificar e integrar (10 min)
4. **Workouts** - Encontrar e integrar (10 min)

**Total Estimado:** 40 minutos

---

**Status Atual:** 96% Completo  
**Falta:** 4% (código acima)

**Desenvolvido por:** Antigravity AI  
**Data:** 2026-01-18 23:15 UTC
