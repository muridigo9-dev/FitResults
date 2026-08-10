# 📅 Sistema de Calendário de Progresso

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Banco de Dados](#banco-de-dados)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Funcionalidades](#funcionalidades)
7. [Performance](#performance)
8. [Testes](#testes)
9. [Roadmap](#roadmap)

---

## 🎯 Visão Geral

O **Sistema de Calendário de Progresso** permite aos usuários visualizar seu histórico de check-ins de forma intuitiva e moderna, através de:

- **Calendário Interativo**: Visualização mensal com indicadores visuais
- **Comparação de Períodos**: Compare semanas, meses ou anos
- **Estatísticas Agregadas**: Métricas consolidadas por período
- **Integração com Gamificação**: Streaks, conquistas e XP

### Objetivos

✅ Aumentar engajamento através de visualização clara do progresso  
✅ Motivar consistência destacando streaks e conquistas  
✅ Facilitar análise de padrões de comportamento  
✅ Fornecer insights acionáveis sobre evolução do usuário

---

## 🏗️ Arquitetura

### Estrutura de Camadas

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│  - CalendarView                     │
│  - PeriodComparison                 │
│  - ProgressCalendar Page            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Hooks & State Management       │
│  - useProgressCalendar              │
│  - useCalendarMonth                 │
│  - usePeriodStatistics              │
│  - useComparePeriods                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Supabase RPC Functions         │
│  - get_calendar_month_data()        │
│  - get_period_statistics()          │
│  - compare_periods()                │
│  - get_streak_days()                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Materialized View + Database      │
│  - daily_checkin_summary            │
│  - checkins, profiles, etc          │
└─────────────────────────────────────┘
```

---

## 🗄️ Banco de Dados

### Materialized View: `daily_checkin_summary`

Agrega todos os dados de check-in por dia para performance otimizada.

**Colunas:**
- `user_id`: UUID do usuário
- `date`: Data do check-in
- `completion_status`: 'complete' | 'partial' | 'empty'
- `water_ml`, `water_completed`: Dados de hidratação
- `weight_kg`: Peso registrado
- `mood`: Humor do dia
- `meals_count`: Número de refeições
- `workouts_count`: Número de treinos
- `habits_count`: Número de hábitos
- `challenge_tasks_count`: Tarefas de desafios
- `xp_earned`: XP ganho no dia
- `achievements_count`: Conquistas desbloqueadas
- `has_streak`: Se o dia faz parte do streak atual

**Índices:**
```sql
idx_daily_checkin_summary_user_date (user_id, date DESC)
idx_daily_checkin_summary_completion (user_id, completion_status)
```

**Atualização:**
- Refresh manual via `refresh_daily_checkin_summary()`
- Pode ser agendado via cron para refresh automático
- Refresh concorrente para não bloquear leituras

---

## ⚙️ Backend

### Funções SQL

#### 1. `get_calendar_month_data(p_user_id, p_year, p_month)`

Retorna dados agregados de um mês específico.

**Parâmetros:**
- `p_user_id`: UUID do usuário
- `p_year`: Ano (ex: 2026)
- `p_month`: Mês (1-12)

**Retorno:**
Array de objetos `DayData` com todos os dados do dia.

**Exemplo:**
```sql
SELECT * FROM get_calendar_month_data(
  'user-uuid',
  2026,
  1
);
```

#### 2. `get_period_statistics(p_user_id, p_start_date, p_end_date)`

Retorna estatísticas agregadas para um período customizado.

**Parâmetros:**
- `p_user_id`: UUID do usuário
- `p_start_date`: Data inicial (YYYY-MM-DD)
- `p_end_date`: Data final (YYYY-MM-DD)

**Retorno:**
JSON com estatísticas completas do período.

**Exemplo:**
```sql
SELECT * FROM get_period_statistics(
  'user-uuid',
  '2026-01-01',
  '2026-01-31'
);
```

#### 3. `compare_periods(...)`

Compara dois períodos e retorna diferenças.

**Parâmetros:**
- `p_user_id`: UUID do usuário
- `p_period1_start`, `p_period1_end`: Período 1
- `p_period2_start`, `p_period2_end`: Período 2

**Retorno:**
JSON com estatísticas de ambos os períodos e diferenças.

#### 4. `get_streak_days(p_user_id)`

Retorna os dias que fazem parte do streak atual.

**Retorno:**
Array de datas com número do dia no streak.

---

## 🎨 Frontend

### Componentes

#### 1. **CalendarView** (`src/components/progress/CalendarView.tsx`)

Calendário interativo mensal com:
- Navegação entre meses
- Indicadores visuais de status (completo/parcial/vazio)
- Ícones de atividades (treino, dieta, água, desafios)
- Indicador de streak (🔥)
- Indicador de conquistas (🏆)
- Modal de detalhes ao clicar no dia

**Props:**
```typescript
interface CalendarViewProps {
  onDayClick?: (day: DayData) => void;
}
```

**Recursos:**
- Animações suaves com `framer-motion`
- Responsivo (mobile e desktop)
- Skeleton loaders contextuais
- Legenda explicativa

#### 2. **PeriodComparison** (`src/components/progress/PeriodComparison.tsx`)

Comparação visual entre períodos com:
- Seletor de tipo de período (semanal/mensal/anual)
- Cards de comparação com indicadores de tendência
- Estatísticas detalhadas lado a lado
- Diferenças destacadas (↑ ↓)

**Métricas Comparadas:**
- Consistência
- Treinos
- Refeições
- XP ganho
- Taxa de hidratação
- Variação de peso

#### 3. **ProgressCalendar** (`src/pages/ProgressCalendar.tsx`)

Página principal com:
- Tabs: Calendário | Comparação | Tendências
- Quick stats do mês atual
- Dicas de uso
- Integração completa

### Hooks

#### `useProgressCalendar.ts`

Conjunto de hooks para buscar dados:

```typescript
// Dados do mês
const { data, isLoading } = useCalendarMonth(year, month);

// Estatísticas de período
const { data } = usePeriodStatistics(startDate, endDate);

// Comparação de períodos
const { data } = useComparePeriods(
  period1Start, period1End,
  period2Start, period2End
);

// Dias do streak
const { data } = useStreakDays();
```

**Helpers:**
```typescript
// Obter range de datas para período
getDateRangeForPeriod('month', new Date());

// Obter período anterior
getPreviousPeriod('month', currentStart, currentEnd);
```

---

## 🚀 Funcionalidades

### 1. Visualização em Calendário

**Estados do Dia:**
- 🟢 **Completo**: Check-in completo (verde)
- 🟡 **Parcial**: Check-in parcial (amarelo)
- ⚪ **Vazio**: Sem check-in (cinza)

**Indicadores:**
- 🏋️ Treino realizado
- 🍎 Refeição registrada
- 💧 Meta de água atingida
- 🏆 Tarefa de desafio completada
- 🔥 Dia no streak atual
- 🏅 Conquista desbloqueada

**Interação:**
- Clique no dia → Modal com detalhes completos
- Navegação entre meses
- Botão "Hoje" para voltar ao mês atual

### 2. Comparação de Períodos

**Tipos de Período:**
- Semanal (7 dias)
- Mensal (30-31 dias)
- Anual (365 dias)

**Comparação Automática:**
- Compara período atual vs anterior
- Ex: Janeiro 2026 vs Dezembro 2025

**Métricas:**
- Consistência (%)
- Total de treinos
- Total de refeições
- XP ganho
- Taxa de hidratação
- Variação de peso

**Visualização:**
- Cards com valores lado a lado
- Setas de tendência (↑ ↓)
- Cores para melhora (verde) ou queda (vermelho)

### 3. Integração com Gamificação

**Streaks:**
- Destaque visual nos dias do streak
- Ícone de fogo (🔥) nos dias consecutivos
- Contagem de dias no streak

**Conquistas:**
- Ícone de troféu (🏆) em dias com conquistas
- Listagem de conquistas no modal do dia
- XP ganho destacado

**XP:**
- Total de XP ganho por período
- Comparação de XP entre períodos
- Destaque de dias com alto XP

---

## ⚡ Performance

### Otimizações Implementadas

#### 1. Materialized View
- Pré-agregação de dados
- Evita joins complexos em tempo real
- Refresh concorrente para não bloquear

#### 2. Índices Estratégicos
```sql
-- Busca por usuário e data
idx_daily_checkin_summary_user_date

-- Filtro por status
idx_daily_checkin_summary_completion
```

#### 3. Caching Frontend
- `staleTime: 5 minutos` para dados de calendário
- `staleTime: 1 minuto` para streak (muda frequentemente)
- React Query para cache automático

#### 4. Lazy Loading
- Dados carregados apenas para o mês visível
- Não carrega histórico completo de uma vez
- View limitada a últimos 2 anos

#### 5. Queries Otimizadas
- Funções SQL retornam apenas dados necessários
- Agregações no banco (não no frontend)
- Uso de JSON para retornos complexos

### Benchmarks Esperados

| Operação | Tempo Esperado |
|----------|----------------|
| Carregar mês | < 200ms |
| Comparar períodos | < 300ms |
| Buscar streak | < 100ms |
| Refresh view | < 2s |

---

## 🧪 Testes

### Testes Unitários

```typescript
// Hook de calendário
describe('useCalendarMonth', () => {
  it('should fetch month data correctly');
  it('should handle loading states');
  it('should handle errors');
});

// Helpers
describe('getDateRangeForPeriod', () => {
  it('should return correct range for week');
  it('should return correct range for month');
  it('should return correct range for year');
});
```

### Testes de Integração

```typescript
// Fluxo completo
describe('Calendar Flow', () => {
  it('should display calendar for current month');
  it('should navigate between months');
  it('should open day details on click');
  it('should highlight streak days');
});

// Comparação
describe('Period Comparison', () => {
  it('should compare two periods correctly');
  it('should show correct trends');
  it('should handle edge cases');
});
```

### Testes de Performance

```sql
-- Teste de performance da view
EXPLAIN ANALYZE
SELECT * FROM daily_checkin_summary
WHERE user_id = 'test-uuid'
AND date >= '2026-01-01'
AND date <= '2026-01-31';

-- Teste de refresh
EXPLAIN ANALYZE
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_checkin_summary;
```

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Completo)
- [x] Calendário interativo mensal
- [x] Comparação de períodos
- [x] Integração com streaks
- [x] Integração com conquistas
- [x] Modal de detalhes do dia
- [x] Estatísticas agregadas

### 🚧 Fase 2: Melhorias (Em Desenvolvimento)
- [ ] Análise de tendências com gráficos
- [ ] Previsões baseadas em histórico
- [ ] Insights personalizados
- [ ] Exportação de dados (PDF/CSV)

### 📅 Fase 3: Avançado (Planejado)
- [ ] Comparação com outros usuários (anônima)
- [ ] Metas personalizadas por período
- [ ] Notificações de padrões detectados
- [ ] Integração com wearables
- [ ] Modo Personal Trainer (visualizar calendário do aluno)

---

## 📊 Métricas de Sucesso

### KPIs

1. **Engajamento**
   - Taxa de acesso ao calendário
   - Tempo médio na página
   - Interações com dias (cliques)

2. **Retenção**
   - Aumento de check-ins após visualizar calendário
   - Manutenção de streaks
   - Retorno à página

3. **Performance**
   - Tempo de carregamento < 300ms
   - Taxa de erro < 1%
   - Satisfação do usuário > 4.5/5

---

## 🔧 Manutenção

### Refresh da Materialized View

**Manual:**
```sql
SELECT refresh_daily_checkin_summary();
```

**Automático (via cron):**
```sql
-- Executar a cada hora
SELECT cron.schedule(
  'refresh-checkin-summary',
  '0 * * * *',
  $$SELECT refresh_daily_checkin_summary()$$
);
```

### Monitoramento

```sql
-- Verificar tamanho da view
SELECT pg_size_pretty(pg_total_relation_size('daily_checkin_summary'));

-- Verificar última atualização
SELECT max(updated_at) FROM daily_checkin_summary;

-- Verificar performance de queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%daily_checkin_summary%'
ORDER BY mean_exec_time DESC;
```

---

## 📚 Referências

- [React Query Documentation](https://tanstack.com/query/latest)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [Framer Motion](https://www.framer.com/motion/)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)

---

## 🤝 Contribuindo

Para adicionar novas funcionalidades ao calendário:

1. Adicione campos necessários na materialized view
2. Atualize funções SQL se necessário
3. Adicione tipos TypeScript correspondentes
4. Implemente UI no componente apropriado
5. Adicione testes
6. Atualize documentação

---

**Status:** ✅ Implementado e Funcional  
**Versão:** 1.0.0  
**Última Atualização:** 14/01/2026
