# Sistema de Registro de Execução de Treino

## Visão Geral

Sistema completo para tracking de execução de treinos com registro individual de séries, cálculo de métricas, análises de progressão e integração com gamificação.

## Funcionalidades Principais

### 1. Tracking Individual de Séries

Permite que alunos registrem peso e repetições em cada série durante o treino:

- ✅ Iniciar série individual
- ✅ Completar série com peso e reps reais
- ✅ Atualizar série em andamento
- ✅ Pular série com motivo
- ✅ Separação clara entre planejado vs executado

### 2. Cálculo de Métricas

- **Volume Total**: Soma de peso × reps de todas as séries
- **Progressão de Carga**: Comparação entre primeira e última sessão
- **Consistência**: Percentual de séries/sessões completadas
- **Histórico**: Registro completo de execução por exercício

### 3. Análises Avançadas

- **Por Aluno**: Consistência, volume, top exercícios
- **Por Exercício**: Performance global, média de peso/reps
- **Por Período**: Resumo com volume e treinos por data
- **Por Academia**: Analytics agregados de todos os alunos

### 4. Gamificação

- **XP por Série**: 2 XP base + 3 XP bônus por progressão de carga
- **XP por Exercício**: 10 XP ao completar
- **XP por Treino**: 50 XP + bônus de streak
- **Achievements**: Progressão, volume, consistência

---

## Funções SQL Disponíveis

### Tracking de Séries

#### `start_session_set()`
Inicia uma série individual.

```sql
SELECT public.start_session_set(
  p_session_exercise_id := '<uuid>',
  p_set_number := 1,
  p_planned_reps := 12,
  p_planned_weight_kg := 20.0
);
```

**Retorna**: UUID da série criada

---

#### `complete_session_set()`
Completa uma série com dados reais de execução.

```sql
SELECT public.complete_session_set(
  p_session_exercise_id := '<uuid>',
  p_set_number := 1,
  p_actual_reps := 12,
  p_actual_weight_kg := 20.0,
  p_rpe := 8,
  p_notes := 'Série difícil mas completada'
);
```

**Retorna**: 
```json
{
  "success": true,
  "set_id": "uuid",
  "completed_sets": 3,
  "total_sets": 4,
  "xp_gained": 5,
  "progression_bonus": 3
}
```

**Features**:
- Detecta automaticamente progressão de carga
- Adiciona XP com bônus por progressão
- Atualiza volume total da sessão
- Atualiza contadores de séries completadas

---

#### `update_session_set()`
Atualiza uma série em andamento.

```sql
SELECT public.update_session_set(
  p_session_exercise_id := '<uuid>',
  p_set_number := 1,
  p_actual_reps := 10,
  p_actual_weight_kg := 22.5
);
```

---

#### `skip_session_set()`
Marca uma série como pulada.

```sql
SELECT public.skip_session_set(
  p_session_exercise_id := '<uuid>',
  p_set_number := 4,
  p_reason := 'Fadiga excessiva'
);
```

---

### Cálculo de Métricas

#### `calculate_session_volume()`
Calcula volume total de uma sessão (peso × reps).

```sql
SELECT public.calculate_session_volume('<session_id>');
```

**Retorna**: `DECIMAL(10,2)` - Volume total em kg

---

#### `calculate_exercise_progression()`
Calcula progressão de carga de um exercício.

```sql
SELECT public.calculate_exercise_progression(
  p_student_id := '<uuid>',
  p_exercise_id := '<uuid>',
  p_days := 30
);
```

**Retorna**:
```json
{
  "has_data": true,
  "first_session": {
    "date": "2026-01-01",
    "weight": 20.0,
    "reps": 12,
    "volume": 240
  },
  "last_session": {
    "date": "2026-01-15",
    "weight": 25.0,
    "reps": 12,
    "volume": 300
  },
  "progression_percent": 25.0,
  "trend": "improving"
}
```

**Trends**:
- `improving`: Progressão > 5%
- `stable`: Progressão entre -5% e 5%
- `declining`: Progressão < -5%

---

#### `calculate_training_consistency()`
Calcula consistência de treino do aluno.

```sql
SELECT public.calculate_training_consistency(
  p_student_id := '<uuid>',
  p_days := 30
);
```

**Retorna**:
```json
{
  "period_days": 30,
  "total_sessions": 12,
  "completed_sessions": 10,
  "session_completion_rate": 83.33,
  "total_sets": 120,
  "completed_sets": 110,
  "sets_completion_rate": 91.67,
  "consistency_score": 88.33
}
```

**Consistency Score**: Média ponderada (60% sessões + 40% séries)

---

#### `get_exercise_history()`
Retorna histórico de execução de um exercício.

```sql
SELECT public.get_exercise_history(
  p_student_id := '<uuid>',
  p_exercise_id := '<uuid>',
  p_limit := 10
);
```

**Retorna**: Array JSON com últimas execuções incluindo todas as séries

---

### Análises

#### `get_student_progress_analysis()`
Análise completa de progresso do aluno.

```sql
SELECT public.get_student_progress_analysis(
  p_student_id := '<uuid>',
  p_days := 30
);
```

**Retorna**:
```json
{
  "student_id": "uuid",
  "period_days": 30,
  "consistency": { /* TrainingConsistency */ },
  "volume": {
    "total": 15000.0,
    "avg_per_session": 1250.0
  },
  "top_exercises": [
    {
      "exercise_id": "uuid",
      "exercise_name": "Supino Reto",
      "total_volume": 3000.0,
      "avg_weight": 60.0,
      "total_sets": 50
    }
  ]
}
```

---

#### `get_exercise_performance_analysis()`
Análise de performance de um exercício.

```sql
SELECT public.get_exercise_performance_analysis(
  p_exercise_id := '<uuid>',
  p_days := 30,
  p_academy_id := '<uuid>' -- Opcional
);
```

**Retorna**: Estatísticas agregadas (alunos, completions, peso médio, volume)

---

#### `get_academy_workout_analytics()`
Analytics de treinos de uma academia.

```sql
SELECT public.get_academy_workout_analytics(
  p_academy_id := '<uuid>',
  p_days := 30
);
```

**Retorna**: Total de sessões, alunos ativos, volume total, consistência média

---

#### `get_period_workout_summary()`
Resumo de treinos em um período específico.

```sql
SELECT public.get_period_workout_summary(
  p_student_id := '<uuid>',
  p_start_date := '2026-01-01',
  p_end_date := '2026-01-31'
);
```

**Retorna**: Resumo com treinos por data e volume diário

---

## Fluxo de Uso

### Durante o Treino

```typescript
// 1. Iniciar sessão de treino
const { sessionId } = await startWorkoutSession(workoutId, seriesId);

// 2. Para cada exercício
for (const exercise of exercises) {
  // 3. Para cada série
  for (let setNum = 1; setNum <= exercise.sets; setNum++) {
    // 4. Iniciar série (opcional)
    await startSessionSet(sessionExerciseId, setNum, plannedReps, plannedWeight);
    
    // 5. Aluno executa a série
    // ...
    
    // 6. Registrar execução
    const result = await completeSessionSet(
      sessionExerciseId,
      setNum,
      actualReps,
      actualWeight,
      rpe,
      notes
    );
    
    // 7. Mostrar feedback
    console.log(`XP ganho: ${result.xpGained}`);
    if (result.progressionBonus > 0) {
      console.log('🎉 Progressão de carga!');
    }
  }
}

// 8. Completar sessão
await completeWorkoutSession(sessionId, mood, rating, notes);
```

### Análise de Progresso

```typescript
// Análise completa do aluno
const analysis = await getStudentProgressAnalysis(studentId, 30);

console.log(`Consistência: ${analysis.consistency.consistencyScore}%`);
console.log(`Volume total: ${analysis.volume.total} kg`);
console.log(`Top exercício: ${analysis.topExercises[0].exerciseName}`);

// Progressão de um exercício específico
const progression = await calculateExerciseProgression(studentId, exerciseId, 30);

if (progression.hasData) {
  console.log(`Progressão: ${progression.progressionPercent}%`);
  console.log(`Tendência: ${progression.trend}`);
}
```

---

## Triggers Automáticos

### `update_session_volume_on_set_complete`

Atualiza automaticamente o volume total da sessão quando uma série é completada.

**Dispara em**: INSERT ou UPDATE em `session_sets` quando `is_completed = true`

---

## Índices de Performance

Criados automaticamente para otimizar queries:

- `idx_session_sets_completed_weight` - Para queries de progressão
- `idx_session_sets_completed_at` - Para ordenação temporal
- `idx_workout_sessions_user_date` - Para análises por aluno
- `idx_workout_sessions_academy_date` - Para analytics de academia
- `idx_session_exercises_exercise_session` - Para joins frequentes
- `idx_session_sets_volume_calc` - Para cálculo de volume

---

## Integração com Gamificação

### XP Automático

| Ação | XP Base | Bônus |
|------|---------|-------|
| Completar série | 2 XP | +3 XP por progressão |
| Completar exercício | 10 XP | - |
| Completar treino | 50 XP | +10/25 XP por streak |

### Achievements

Verificados automaticamente:
- `weight_progression` - Progressão de carga
- `exercises_completed` - Total de exercícios
- `workouts_completed` - Total de treinos
- `streak_days` - Dias consecutivos

---

## Segurança

Todas as funções possuem:
- ✅ `SECURITY DEFINER` com `SET search_path = public`
- ✅ Verificação de ownership (auth.uid())
- ✅ RLS policies aplicadas
- ✅ Tratamento de erros para funções opcionais

---

## Compatibilidade

- ✅ **Backward Compatible**: Não quebra código existente
- ✅ **Idempotente**: Migration pode rodar múltiplas vezes
- ✅ **Graceful Degradation**: Funciona mesmo sem sistema de XP/achievements

---

## Próximos Passos

1. ✅ Aplicar migration: `supabase db push`
2. ✅ Testar funções básicas
3. 🔄 Criar hooks React para facilitar uso
4. 🔄 Criar componentes UI para registro de séries
5. 🔄 Criar dashboards de análise

---

## Suporte

Para dúvidas ou problemas, consulte:
- Migration: `20260115000001_workout_execution_tracking.sql`
- Types: `src/types/workout.ts`
- Plano de implementação: `implementation_plan.md`
