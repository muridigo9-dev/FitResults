# Refatoração do Módulo de Hábitos - Arquitetura de Produto

Com base na análise do sistema, apresento a especificação técnica para o novo módulo de Habit Tracker.

## 1. Diagnóstico do Cenário Atual
*   **Dados Efêmeros:** O histórico de hábitos vive apenas dentro de JSONs de check-in (`daily_checkins`), impossibilitando queries analíticas e cálculo de streaks históricos.
*   **Gamificação Inexistente:** A conclusão de hábitos não gera XP ou recompensas, desconectada do sistema de níveis.
*   **Gestão Limitada:** Hábitos globais poluem a visão de todos os alunos, sem segmentação por Plano ou Academia.

---

## 2. Nova Modelagem de Dados

O novo modelo remove a dependência do Check-in diário para a definição do hábito e cria um histórico relacional.

### A. Tabela: `habits` (Definição)
*Tabela mestre de configuração.*
*   `id` (PK)
*   `scope`: ENUM (`'global'`, `'academy'`, `'personal'`)
*   `owner_id`: FK User (apenas para scope 'personal')
*   `academy_id`: FK Academy (apenas para scope 'academy')
*   `frequency_type`: ENUM (`'daily'`, `'weekly'`, `'custom'`)
*   `frequency_config`: JSONB (ex: `[1, 3, 5]` para Seg/Qua/Sex)
*   `goal_value`: NUMERIC (Meta quantitativa, ex: 2000)
*   `goal_unit`: TEXT (ex: 'ml')
*   `xp_reward`: INT (XP ganho por conclusão)
*   `coin_reward`: INT (Moedas ganhas por conclusão)
*   `streak_penalty_xp`: INT (Penalidade por quebra)
*   `is_active`: BOOLEAN

### B. Tabela: `habit_assignments` (Atribuição)
*Define quem recebe os hábitos globais.*
*   `habit_id`: FK
*   `target_type`: ENUM (`'plan'`, `'level'`, `'academy_all'`)
*   `target_id`: UUID (ID do plano, academia, etc)

### C. Tabela: `habit_logs` (Execução)
*Log diário imutável.*
*   `id` (PK)
*   `user_id`, `habit_id`: FKs
*   `date`: DATE (Data de referência)
*   `value`: NUMERIC (Valor realizado)
*   `completed`: BOOLEAN (Meta atingida?)
*   `performed_at`: TIMESTAMPTZ (Hora real)

### D. Tabela: `habit_tracker_state` (Estado & Streak)
*Cache de performance para a UI.*
*   `user_id`, `habit_id`: FKs
*   `current_streak`: INT
*   `longest_streak`: INT
*   `last_completed_date`: DATE
*   `total_completions`: INT
*   `total_xp_earned`: INT

---

## 3. Regras de Negócio e Permissões

### Tipos e Visibilidade
*   **Globais (Admin):** Visíveis se atribuídos ao Plano/Academia do usuário via `assignments`.
*   **Personalizados (Aluno):**
    *   Criação controlada pela Feature Flag `enable_custom_habits_for_students`.
    *   Se flag = false: Criação bloqueada, existentes mantidos.
    *   Visíveis apenas para o criador.

### Execução e Streaks
*   **Janela de Tempo:** Permite marcar "Hoje" ou "Ontem" (tolerância para esquecimentos).
*   **Cálculo de Streak (Diário):**
    *   `last_date == ontem` → Streak +1.
    *   `last_date == hoje` → Mantém.
    *   `last_date < ontem` → Streak Reset (1).
*   **Validadores:** O backend deve rejeitar logs duplicados para a mesma data (agregando valor se for quantitativo).

---

## 4. Integração: XP e Recompensas

A integração via **PostgreSQL Triggers** garante segurança e consistência:

1.  **Evento:** Insert/Update em `habit_logs` (`completed = true`).
2.  **Ação 1 (Gamificação):** Executa função `add_xp_to_user(user_id, habit.xp_reward)`.
3.  **Ação 2 (Stats):** Atualiza `habit_tracker_state` (streak e total XP).
4.  **Ação 3 (Penalidade):** Job diário verifica streaks quebrados e subtrai XP se configurado (`streak_penalty_xp`).

---

## 5. Estratégia de Migração

Para garantir continuidade:

1.  **Schema Update:** Criar tabelas novas.
2.  **Backfill Script:**
    *   Ler `daily_checkins` (JSONB).
    *   Para cada item "completed" no histórico -> Inserir em `habit_logs`.
    *   Recalcular `habit_tracker_state` para restaurar os streaks históricos dos alunos.
3.  **Frontend Update:** Refatorar hooks para usar nova API.

## 6. Pontos de Atenção Técnicos

*   **Fuso Horário:** A data (`date`) do hábito deve ser enviada pelo cliente (local time) para evitar quebras de streak injustas na virada do dia UTC.
*   **Escalabilidade:** `habit_logs` cresce rápido. Índices em `(user_id, date)` são obrigatórios.
*   **Segurança (RLS):** Garantir que usuários só possam inserir logs para si mesmos.
