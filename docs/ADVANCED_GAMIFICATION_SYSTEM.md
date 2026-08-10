# 🎮 Sistema Avançado de Gamificação - Documentação Completa

## 📅 Data: 14 de Janeiro de 2026

---

## ✅ Status: BACKEND COMPLETO - PRONTO PARA FRONTEND

---

## 🎯 Objetivo Alcançado

Sistema avançado de gamificação com:
- ✅ 17 conquistas pré-configuradas
- ✅ Sistema de badges customizáveis
- ✅ Leaderboard com rankings periódicos
- ✅ Sistema de eventos e histórico
- ✅ Funções SQL otimizadas
- ✅ RLS completo e seguro
- ✅ Notificações integradas (preparado)
- ✅ Performance otimizada

---

## 🏗️ Arquitetura do Sistema

### 1. Database Schema

#### Tabela: `achievements` (Conquistas)
**Propósito:** Define todas as conquistas disponíveis

**Colunas principais:**
- `key` - Identificador único (ex: "first_workout")
- `name` - Nome da conquista
- `description` - Descrição
- `category` - Categoria (workout, health, challenge, engagement, social, milestone)
- `rarity` - Raridade (common, rare, epic, legendary)
- `condition_type` - Tipo de condição (ex: "workout_count")
- `condition_value` - Valor alvo (ex: 10)
- `xp_reward` - XP concedido
- `badge_id` - Badge associado (FK)
- `send_notification` - Enviar notificação?
- `is_hidden` - Conquista secreta?

**17 Conquistas Padrão:**

**Treinos:**
1. Primeiro Treino (1 treino) - 50 XP
2. 10 Treinos - 100 XP
3. 50 Treinos - 500 XP (rare)
4. Centenário (100 treinos) - 1000 XP (epic)
5. Semana Forte (7 dias streak) - 300 XP (rare)

**Saúde:**
6. Primeiro Check-in - 25 XP
7. Semana Saudável (7 dias streak) - 200 XP (rare)
8. Mês Consistente (30 dias streak) - 1000 XP (epic)
9. Transformação 5kg - 500 XP (rare)

**Desafios:**
10. Desafiador (1 desafio) - 75 XP
11. Competidor (10 desafios) - 500 XP (rare)
12. Perfeição (desafio perfeito) - 750 XP (epic)

**Engajamento:**
13. Primeira Semana - 100 XP
14. Mês Ativo (30 dias) - 500 XP (rare)

**Milestones:**
15. Nível 10 - 300 XP (rare)
16. Nível 25 - 750 XP (epic)
17. Nível 50 - 2000 XP (legendary)

---

#### Tabela: `badges` (Distintivos)
**Propósito:** Badges customizáveis pelo admin

**Tipos:**
- `static` - Ícone estático
- `animated` - Animação Lottie
- `special` - Badge especial

**Raridades:**
- `common` - Comum (verde)
- `rare` - Raro (azul)
- `epic` - Épico (laranja)
- `legendary` - Lendário (roxo)

**4 Badges Padrão:**
1. Iniciante (common) - Verde
2. Dedicado (rare) - Azul
3. Campeão (epic) - Laranja
4. Lenda (legendary) - Roxo

---

#### Tabela: `user_achievements`
**Propósito:** Progresso de conquistas por usuário

**Tracking:**
- `current_progress` - Progresso atual
- `target_progress` - Meta
- `is_unlocked` - Desbloqueado?
- `unlocked_at` - Quando desbloqueou
- `notification_sent` - Notificação enviada?

---

#### Tabela: `user_badges`
**Propósito:** Badges conquistados

**Display:**
- `is_displayed` - Mostrar no perfil?
- `display_order` - Ordem de exibição
- `earned_from` - Origem (achievement, manual, event)

---

#### Tabela: `leaderboard`
**Propósito:** Ranking de usuários

**Scores:**
- `total_xp` - XP total (all-time)
- `daily_xp` - XP do dia
- `weekly_xp` - XP da semana
- `monthly_xp` - XP do mês

**Rankings:**
- `global_rank` - Posição global
- `daily_rank` - Posição diária
- `weekly_rank` - Posição semanal
- `monthly_rank` - Posição mensal

**Multi-tenant:**
- `academy_id` - Para ranking por academia (opcional)

**Índices Otimizados:**
```sql
-- Todos os rankings têm índices DESC para queries rápidas
idx_leaderboard_total_xp
idx_leaderboard_daily_xp
idx_leaderboard_weekly_xp
idx_leaderboard_monthly_xp
idx_leaderboard_academy
```

---

#### Tabela: `gamification_events`
**Propósito:** Histórico de eventos

**Tracking:**
- `event_type` - Tipo (workout_completed, checkin_completed, etc)
- `event_data` - Dados do evento (JSONB)
- `xp_gained` - XP ganho
- `achievements_unlocked` - Conquistas desbloqueadas (array)

---

### 2. Funções SQL

#### `add_xp_to_user(user_id, xp, event_type, event_data)`
**Propósito:** Adiciona XP ao usuário e atualiza tudo

**Fluxo:**
1. Busca nível atual
2. Adiciona XP ao perfil
3. Calcula novo nível: `FLOOR(POWER(xp / 100, 0.5)) + 1`
4. Atualiza leaderboard (total, daily, weekly, monthly)
5. Registra evento
6. Retorna se houve level up

**Retorno:**
```json
{
  "old_level": 5,
  "new_level": 6,
  "level_up": true,
  "xp_gained": 100
}
```

**Exemplo de uso:**
```sql
SELECT add_xp_to_user(
  'user-id',
  100,
  'workout_completed',
  '{"workout_id": "123"}'::jsonb
);
```

---

#### `check_achievement_progress(user_id, achievement_key, increment)`
**Propósito:** Verifica e atualiza progresso de conquista

**Fluxo:**
1. Busca conquista pelo key
2. Cria ou atualiza progresso do usuário
3. Incrementa progresso
4. Se atingiu meta:
   - Marca como desbloqueado
   - Adiciona XP via `add_xp_to_user()`
   - Concede badge (se houver)
   - Marca para notificação

**Retorno:**
```json
{
  "unlocked": true,
  "progress": 10,
  "target": 10,
  "xp_gained": 100
}
```

**Exemplo de uso:**
```sql
-- Incrementar contador de treinos
SELECT check_achievement_progress(
  'user-id',
  'first_workout',
  1
);
```

---

#### `refresh_leaderboard_ranks()`
**Propósito:** Recalcula todos os rankings

**Uso:** Executar periodicamente (cron job)

```sql
-- Recalcula global, daily, weekly, monthly ranks
SELECT refresh_leaderboard_ranks();
```

---

#### Funções de Reset Periódico

**`reset_daily_xp()`** - Zera XP diário (executar à meia-noite)
**`reset_weekly_xp()`** - Zera XP semanal (executar segunda-feira)
**`reset_monthly_xp()`** - Zera XP mensal (executar dia 1)

---

## 📊 Fluxos de Funcionamento

### Fluxo 1: Usuário Completa Treino

```
1. Frontend chama API/Edge Function
   POST /complete-workout
       ↓
2. Backend processa treino
       ↓
3. Chama add_xp_to_user()
   - Adiciona 50 XP
   - Atualiza leaderboard
   - Registra evento
       ↓
4. Chama check_achievement_progress()
   - Incrementa "workout_count"
   - Verifica "first_workout"
   - Verifica "10_workouts"
   - Verifica "50_workouts"
   - etc.
       ↓
5. Se desbloqueou conquista:
   - Adiciona XP extra
   - Concede badge
   - Marca para notificação
       ↓
6. Frontend recebe resposta:
   {
     "xp_gained": 50,
     "level_up": false,
     "achievements_unlocked": ["first_workout"],
     "badges_earned": ["badge-id"]
   }
       ↓
7. Frontend exibe:
   - Animação de XP
   - Toast de conquista
   - Confetti se level up
   - Push notification (se habilitado)
```

---

### Fluxo 2: Leaderboard Atualização

```
Cron Job (a cada hora):
    ↓
SELECT refresh_leaderboard_ranks();
    ↓
Recalcula:
- global_rank
- daily_rank
- weekly_rank
- monthly_rank
    ↓
Frontend consulta:
GET /leaderboard?period=weekly&limit=100
    ↓
Retorna top 100 + posição do usuário
```

---

### Fluxo 3: Reset Periódico

```
Cron Jobs:

Diário (00:00):
  SELECT reset_daily_xp();
  SELECT refresh_leaderboard_ranks();

Semanal (Segunda 00:00):
  SELECT reset_weekly_xp();
  SELECT refresh_leaderboard_ranks();

Mensal (Dia 1 00:00):
  SELECT reset_monthly_xp();
  SELECT refresh_leaderboard_ranks();
```

---

## 🎨 Sistema de Categorias e Raridades

### Categorias de Conquistas

**workout** 💪
- Relacionadas a treinos
- Cor: Roxo (#8B5CF6)

**health** ❤️
- Relacionadas a saúde e check-ins
- Cor: Vermelho (#EF4444)

**challenge** 🏆
- Relacionadas a desafios
- Cor: Laranja (#F59E0B)

**engagement** 📅
- Relacionadas a uso do app
- Cor: Azul (#3B82F6)

**social** 👥
- Relacionadas a comunidade
- Cor: Rosa (#EC4899)

**milestone** ⭐
- Marcos importantes (níveis)
- Cor: Amarelo (#F59E0B)

---

### Raridades

**Common (Comum)** 🟢
- Fácil de conseguir
- XP: 25-100
- Cor: Verde (#10B981)

**Rare (Raro)** 🔵
- Requer esforço
- XP: 100-500
- Cor: Azul (#3B82F6)

**Epic (Épico)** 🟠
- Difícil de conseguir
- XP: 500-1000
- Cor: Laranja (#F59E0B)

**Legendary (Lendário)** 🟣
- Muito raro
- XP: 1000+
- Cor: Roxo (#8B5CF6)

---

## 🔐 Segurança e RLS

### Políticas Implementadas

**Achievements:**
- ✅ Todos podem ver conquistas ativas
- ✅ Apenas admins podem gerenciar

**Badges:**
- ✅ Todos podem ver badges ativos
- ✅ Apenas admins podem gerenciar

**User Achievements:**
- ✅ Usuários veem apenas suas conquistas
- ✅ Sistema pode gerenciar (via funções)

**User Badges:**
- ✅ Usuários veem apenas seus badges
- ✅ Usuários podem configurar exibição
- ✅ Sistema pode conceder badges

**Leaderboard:**
- ✅ Todos podem ver o leaderboard
- ✅ Sistema gerencia scores

**Gamification Events:**
- ✅ Usuários veem apenas seus eventos
- ✅ Admins veem todos os eventos
- ✅ Sistema pode inserir eventos

---

## 📈 Performance e Otimizações

### Índices Criados

**Achievements:**
- `idx_achievements_category` - Busca por categoria
- `idx_achievements_active` - Filtro de ativos
- `idx_achievements_key` - Lookup por key

**User Achievements:**
- `idx_user_achievements_user` - Por usuário
- `idx_user_achievements_unlocked` - Filtro desbloqueados
- `idx_user_achievements_progress` - Ordenação por progresso

**Leaderboard:**
- `idx_leaderboard_total_xp` DESC - Ranking global
- `idx_leaderboard_daily_xp` DESC - Ranking diário
- `idx_leaderboard_weekly_xp` DESC - Ranking semanal
- `idx_leaderboard_monthly_xp` DESC - Ranking mensal
- `idx_leaderboard_academy` - Ranking por academia
- `idx_leaderboard_user` - Lookup por usuário

**Gamification Events:**
- `idx_gamification_events_user` - Por usuário
- `idx_gamification_events_type` - Por tipo
- `idx_gamification_events_created` DESC - Histórico

---

### Queries Otimizadas

**Leaderboard Top 100:**
```sql
SELECT 
  l.*,
  p.full_name,
  p.avatar_url
FROM leaderboard l
JOIN profiles p ON p.id = l.user_id
ORDER BY l.total_xp DESC
LIMIT 100;
```

**Posição do Usuário:**
```sql
SELECT 
  global_rank,
  total_xp,
  (SELECT COUNT(*) FROM leaderboard) as total_users
FROM leaderboard
WHERE user_id = 'user-id';
```

**Conquistas Desbloqueadas:**
```sql
SELECT 
  a.*,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE ua.user_id = 'user-id'
  AND ua.is_unlocked = true
ORDER BY ua.unlocked_at DESC;
```

---

## 🎯 Integração com Notificações

### Quando Enviar Notificações

**1. Conquista Desbloqueada:**
```typescript
if (achievement.send_notification && !user_achievement.notification_sent) {
  await notifyAchievementUnlocked(
    userId,
    achievement.name,
    achievement.description
  );
  
  // Marcar como enviada
  UPDATE user_achievements
  SET notification_sent = true
  WHERE id = user_achievement.id;
}
```

**2. Level Up:**
```typescript
if (result.level_up) {
  await sendDirectNotification({
    userId,
    title: `Parabéns! Nível ${result.new_level}! 🎉`,
    body: `Você subiu para o nível ${result.new_level}!`,
    channel: 'both'
  });
}
```

**3. Top Ranking:**
```typescript
if (user.global_rank <= 10) {
  await sendDirectNotification({
    userId,
    title: `Você está no Top ${user.global_rank}! 🏆`,
    body: `Continue assim para manter sua posição!`,
    channel: 'push'
  });
}
```

---

## 🎨 Frontend - Componentes Sugeridos

### 1. Achievement Card
```tsx
<AchievementCard
  achievement={achievement}
  progress={userAchievement.current_progress}
  target={userAchievement.target_progress}
  unlocked={userAchievement.is_unlocked}
  onClaim={() => claimReward(achievement.id)}
/>
```

### 2. Leaderboard
```tsx
<Leaderboard
  period="weekly"
  limit={100}
  highlightUserId={currentUserId}
  onUserClick={(userId) => navigate(`/profile/${userId}`)}
/>
```

### 3. Level Up Animation
```tsx
<LevelUpAnimation
  oldLevel={5}
  newLevel={6}
  xpGained={100}
  onComplete={() => setShowAnimation(false)}
/>
```

### 4. Achievement Toast
```tsx
<AchievementToast
  achievement={achievement}
  badge={badge}
  xpGained={100}
  autoClose={5000}
/>
```

### 5. Badge Display
```tsx
<BadgeDisplay
  badges={userBadges}
  maxDisplay={3}
  onBadgeClick={(badge) => showBadgeDetails(badge)}
/>
```

---

## 📋 Checklist de Implementação

### Backend ✅
- [x] Schema de conquistas
- [x] Schema de badges
- [x] Schema de leaderboard
- [x] Schema de eventos
- [x] Função add_xp_to_user
- [x] Função check_achievement_progress
- [x] Função refresh_leaderboard_ranks
- [x] Funções de reset periódico
- [x] 17 conquistas padrão
- [x] 4 badges padrão
- [x] RLS policies
- [x] Índices otimizados

### Frontend (Pendente)
- [ ] Hook useAchievements
- [ ] Hook useLeaderboard
- [ ] Hook useBadges
- [ ] Componente AchievementCard
- [ ] Componente Leaderboard
- [ ] Componente BadgeDisplay
- [ ] Animação LevelUp
- [ ] Animação AchievementUnlock
- [ ] Integração com notificações
- [ ] Painel admin de conquistas
- [ ] Painel admin de badges

### Integrações (Pendente)
- [ ] Trigger em workout_completed
- [ ] Trigger em checkin_completed
- [ ] Trigger em challenge_completed
- [ ] Cron job para refresh_ranks
- [ ] Cron job para reset_daily_xp
- [ ] Cron job para reset_weekly_xp
- [ ] Cron job para reset_monthly_xp

---

## 🚀 Próximos Passos

### 1. Implementar Hooks
```typescript
// src/hooks/useAchievements.ts
export function useAchievements() {
  // Buscar conquistas do usuário
  // Calcular progresso
  // Retornar unlocked e locked
}

// src/hooks/useLeaderboard.ts
export function useLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time') {
  // Buscar top 100
  // Buscar posição do usuário
  // Calcular evolução
}
```

### 2. Criar Componentes de Animação
```typescript
// src/components/gamification/LevelUpAnimation.tsx
// Usar framer-motion + confetti
// Animação suave e não intrusiva

// src/components/gamification/AchievementUnlockAnimation.tsx
// Badge aparecendo com efeito
// Som opcional
```

### 3. Integrar com Sistema de Eventos
```typescript
// src/lib/gamificationEvents.ts
export async function triggerWorkoutCompleted(userId: string, workoutId: string) {
  // Adicionar XP
  // Verificar conquistas
  // Enviar notificações
}
```

### 4. Criar Painel Admin
```typescript
// src/pages/admin/AdminGamification.tsx
// Gerenciar conquistas
// Gerenciar badges
// Ver estatísticas
// Testar conquistas
```

---

## 📚 Referências Técnicas

### Arquivos Criados
- `supabase/migrations/20260114000006_advanced_gamification_system.sql` (634 linhas)

### Tabelas Criadas
- `achievements` - Conquistas
- `badges` - Badges
- `user_achievements` - Progresso
- `user_badges` - Badges conquistados
- `leaderboard` - Rankings
- `gamification_events` - Histórico

### Funções Criadas
- `add_xp_to_user()` - Adicionar XP
- `check_achievement_progress()` - Verificar progresso
- `refresh_leaderboard_ranks()` - Atualizar rankings
- `reset_daily_xp()` - Reset diário
- `reset_weekly_xp()` - Reset semanal
- `reset_monthly_xp()` - Reset mensal

### ENUMs Criados
- `achievement_category` - Categorias
- `achievement_rarity` - Raridades
- `badge_type` - Tipos de badge
- `leaderboard_period` - Períodos

---

## 🎯 Resumo Executivo

**Status:** ✅ **BACKEND 100% COMPLETO**

**Características:**
- ✅ 17 conquistas pré-configuradas
- ✅ Sistema de badges customizável
- ✅ Leaderboard com 4 períodos
- ✅ Funções SQL otimizadas
- ✅ Sistema de eventos completo
- ✅ RLS completo e seguro
- ✅ Performance otimizada (índices)
- ✅ Preparado para notificações
- ✅ Multi-tenant ready

**Próximo Passo:**
Implementar frontend (hooks, componentes, animações) e integrações com eventos do sistema.

**Resultado:**
Base sólida para um sistema de gamificação moderno, competitivo e altamente engajador! 🎮🚀

---

**Desenvolvido por:** Cursor + Claude Sonnet 4.5  
**Data:** 14 de Janeiro de 2026
