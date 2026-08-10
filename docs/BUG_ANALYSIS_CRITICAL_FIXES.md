# 🐛 Análise Detalhada de Bugs Críticos

## 📋 Resumo Executivo

Identificados 5 bugs críticos que afetam a sincronização entre módulos (Dietas, Check-in, Desafios, Conquistas e Saúde).

---

## 🔍 Análise por Bug

### 1️⃣ BUG: Dietas → Registrar Refeição não aparece no Check-in

#### **Status Atual**
```typescript
// src/contexts/DiaryContext.tsx (linha 140-170)
const logMealMutation = useMutation({
  mutationFn: async (diet: Diet) => {
    const { error } = await supabase.from("diary_entries").insert({
      user_id: user.id,
      date: getTodayISO(),
      entry_type: "meal",
      source: "diet",
      reference_id: diet.id,
      // ...
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
    toast.success("Refeição registrada!");
  },
});
```

#### **Problema Identificado**
- ✅ Salva em `diary_entries` (diário)
- ❌ **NÃO salva** em `checkin_meals` (check-in)
- ❌ **NÃO invalida** queries do check-in
- ❌ Check-in usa `daily_checkins` + `checkin_meals`, não `diary_entries`

#### **Tabelas Envolvidas**
```sql
-- Tabela atual (USADA)
diary_entries (
  user_id, date, entry_type, source, reference_id, title, calories, etc
)

-- Tabela necessária (NÃO USADA)
checkin_meals (
  id, checkin_id, diet_id, diet_source, meal_type, completed
)

-- Tabela pai (PRECISA EXISTIR PRIMEIRO)
daily_checkins (
  id, user_id, date, status, water_current, mood, weight, etc
)
```

#### **Correção Necessária**
1. Criar/buscar `daily_checkins` do dia atual
2. Inserir em `checkin_meals` com `checkin_id` correto
3. Manter inserção em `diary_entries` para histórico
4. Invalidar queries do check-in: `["today-checkin"]`

---

### 2️⃣ BUG: Aba Check-in → Refeições não persistem

#### **Status Atual**
```typescript
// src/hooks/useCheckin.ts (linha 433-488)
const saveCheckin = useCallback(async () => {
  // Upsert daily_checkins
  const { data: savedCheckin } = await supabase
    .from("daily_checkins")
    .upsert({
      user_id: user.id,
      date: today,
      water_current: dataToSave.water.current,
      mood: dataToSave.mood,
      weight: dataToSave.weight,
      status: "complete",
      // ...
    })
    .select("id")
    .single();

  // ❌ NÃO SALVA MEALS
  // ❌ NÃO SALVA WORKOUTS
  // ❌ NÃO SALVA HABITS
}, [user, localCheckin, checkin, queryClient]);
```

#### **Problema Identificado**
- ✅ Salva `daily_checkins` (container)
- ❌ **NÃO salva** `checkin_meals` (refeições)
- ❌ **NÃO salva** `checkin_workouts` (treinos)
- ❌ **NÃO salva** `habit_logs` (hábitos)

#### **Dados no Estado Local**
```typescript
interface DailyCheckin {
  meals: MealEntry[];      // ❌ Não persiste
  workouts: WorkoutEntry[]; // ❌ Não persiste
  habits: HabitEntry[];     // ❌ Não persiste
  water: WaterEntry;        // ✅ Persiste
  mood?: MoodType;          // ✅ Persiste
  weight?: number;          // ✅ Persiste
}
```

#### **Correção Necessária**
1. Após salvar `daily_checkins`, pegar o `checkin_id`
2. Deletar `checkin_meals` antigas do mesmo checkin_id
3. Inserir novos `checkin_meals` do estado local
4. Fazer o mesmo para `checkin_workouts`
5. Inserir/upsert `habit_logs` (tabela separada)

---

### 3️⃣ BUG: Desafios → Erro falso ao concluir

#### **Status Atual**
```typescript
// src/hooks/useChallenges.ts (linha 173-215)
const completeTaskMutation = useMutation({
  mutationFn: async ({ challengeId, dayNumber, taskId }) => {
    // Get/create checkin
    let { data: checkin } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (!checkin) {
      const { data: newCheckin, error: createError } = await supabase
        .from("daily_checkins")
        .insert({ user_id: user.id, date: today, status: "partial" })
        .select("id")
        .single();
      if (createError) throw createError;
      checkin = newCheckin;
    }

    // Insert task
    const { error } = await supabase
      .from("checkin_challenge_tasks")
      .insert({
        checkin_id: checkin.id,
        challenge_id: challengeId,
        task_id: taskId,
        day_number: dayNumber,
        completed: true,
      });

    if (error) throw error; // ❌ Pode lançar erro de duplicação
    return { taskId };
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });
    toast.success("Tarefa concluída!");
  },
  onError: () => {
    toast.error("Erro ao completar tarefa"); // ❌ Exibe mesmo quando sucede
  },
});
```

#### **Problema Identificado**
- ✅ Task é inserida corretamente
- ✅ Aparece no Check-in
- ❌ **Error handler** é chamado incorretamente
- ❌ Pode haver erro de **duplicação** se clicar 2x rápido
- ❌ Não há `unique constraint` ou idempotência

#### **Possíveis Causas**
1. **Timing issue**: Promise resolve antes do commit
2. **Unique constraint**: Tabela `checkin_challenge_tasks` pode ter constraint
3. **RLS issue**: Política pode estar negando leitura mas permitindo escrita
4. **Frontend state**: Estado não sincroniza antes de exibir erro

#### **Correção Necessária**
1. Adicionar idempotência: `ON CONFLICT DO NOTHING` ou verificar existência
2. Melhorar tratamento de erro: diferenciar erro real de sucesso
3. Atualizar `user_challenge_progress.current_day` se necessário
4. Invalidar múltiplas queries: challenge-progress E today-checkin

---

### 4️⃣ BUG: Conquista "Primeiro Check-in" não registrada

#### **Status Atual**
```typescript
// src/hooks/useProgress.ts (linha 133-171)
const { data: achievements = [] } = useQuery({
  queryKey: ["achievements", user?.id],
  queryFn: async () => {
    // Get all achievements
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("is_active", true);

    // Get user's earned achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id, earned_at")
      .eq("user_id", user.id);

    // Mark as unlocked
    return allAchievements.map((a) => ({
      id: a.id,
      name: a.name,
      unlocked: earnedIds.has(a.id),
    }));
  },
});
```

#### **Problema Identificado**
- ✅ Query busca conquistas corretamente
- ❌ **Nenhum código** concede a conquista "Primeiro Check-in"
- ❌ Não há **listener** de evento de check-in
- ❌ Não há **trigger** ou **edge function** para conceder conquistas

#### **Conquistas Esperadas**
```sql
-- Deve existir em achievements
INSERT INTO achievements VALUES (
  'first-checkin',
  'Primeiro Check-in',
  'Complete seu primeiro check-in diário',
  'CheckCircle',
  'green',
  'checkin_count',
  'count',
  1,  -- requirement_value
  10  -- xp_reward
);
```

#### **Onde Deveria Ser Concedida**
1. **Opção A (Backend)**: Trigger SQL após INSERT em `daily_checkins`
2. **Opção B (Edge Function)**: Função que verifica e concede
3. **Opção C (Frontend)**: Hook após `saveCheckin()` com sucesso

#### **Correção Necessária**
1. Criar sistema centralizado de conquistas
2. Verificar após cada check-in se é o primeiro
3. Inserir em `user_achievements` se não existir
4. Conceder XP correspondente em `user_xp`
5. Invalidar query `["achievements"]`

---

### 5️⃣ BUG: Aba Saúde não atualiza dados

#### **Status Atual**
```typescript
// src/pages/Health.tsx (precisa investigar)
// Provavelmente usa useProgress() ou useDashboardData()

// src/hooks/useProgress.ts (linha 97-131)
const { data: weeklyWeightData = [] } = useQuery({
  queryKey: ["weekly-weight", user?.id],
  enabled: !!user,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("weight_logs")
      .select("date, weight")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: true });

    if (error) throw error;
    return data || [];
  },
  // ❌ SEM staleTime/refetchOnMount
});
```

#### **Problema Identificado**
- ✅ Query busca `weight_logs` corretamente
- ❌ **Não refetch** ao abrir aba Saúde
- ❌ **Não invalida** após check-in com peso
- ❌ Dados podem estar em **cache stale**

#### **Queries Envolvidas na Aba Saúde**
```typescript
["weekly-weight", user?.id]       // Peso semanal
["last-weight", user?.id]          // Último peso
["user-metrics", user?.id]         // Métricas corporais
["weekly-checkins", user?.id]      // Check-ins da semana
["body-metrics", user?.id]         // IMC, BF%, etc
```

#### **Correção Necessária**
1. Adicionar `refetchOnMount: "always"` nas queries da aba Saúde
2. Invalidar queries corretas em `saveCheckin()`:
   - `["weekly-weight"]`
   - `["last-weight"]`
   - `["user-metrics"]`
   - `["body-metrics"]`
3. Recalcular métricas derivadas (IMC) após update

---

## 🎯 Plano de Correção

### Fase 1: Refeições e Check-in
- [ ] **Bug #1**: Integrar DiaryContext com checkin_meals
- [ ] **Bug #2**: Persistir meals/workouts/habits no saveCheckin()
- [ ] Criar helper: `ensureTodayCheckin()` (DRY)

### Fase 2: Desafios
- [ ] **Bug #3**: Adicionar idempotência em completeTask
- [ ] Melhorar error handling
- [ ] Invalidar queries corretas

### Fase 3: Conquistas e Gamificação
- [ ] **Bug #4**: Criar sistema de achievement checking
- [ ] Implementar concessão de "Primeiro Check-in"
- [ ] Conceder XP ao completar check-in

### Fase 4: Saúde e Métricas
- [ ] **Bug #5**: Adicionar refetch nas queries da aba Saúde
- [ ] Invalidar queries corretas após check-in
- [ ] Recalcular métricas derivadas

### Fase 5: Testes
- [ ] Testar fluxo: Dietas → Check-in
- [ ] Testar fluxo: Check-in → Persistência
- [ ] Testar fluxo: Desafios → Conclusão
- [ ] Testar fluxo: Conquistas → Concessão
- [ ] Testar fluxo: Saúde → Atualização

---

## 📊 Impacto Estimado

| Bug | Severidade | Usuários Afetados | Esforço |
|-----|------------|-------------------|---------|
| #1: Dietas → Check-in | 🔴 Alto | 100% | 2h |
| #2: Check-in persist | 🔴 Alto | 100% | 3h |
| #3: Desafios erro | 🟡 Médio | 60% | 1h |
| #4: Conquistas | 🟡 Médio | 100% | 2h |
| #5: Saúde cache | 🟠 Médio-Alto | 80% | 1h |

**Total:** ~9 horas de trabalho estimado

---

## 🚀 Próximos Passos

1. Validar análise com testes manuais
2. Criar branch `fix/critical-bugs`
3. Implementar correções em ordem de prioridade
4. Testar cada correção isoladamente
5. Merge e deploy

---

**Data:** Janeiro 2026  
**Status:** 📋 Análise Completa  
**Próximo:** 🛠️ Implementação
