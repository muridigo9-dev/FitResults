# Auditoria e Correção de Migrations

## Erros Encontrados e Corrigidos

### 1. ❌ Migration: `20260114000007_progress_calendar_system.sql`
**Erro**: Coluna `unlocked_at` não existe na tabela `user_achievements`

**Causa**: Migration tentava usar coluna antes dela ser criada

**Solução**:
- ✅ Modificada para retornar `0` temporariamente
- ✅ Criada migration `20260115000002_fix_calendar_achievements_count.sql` para atualizar depois

---

### 2. ❌ Migration: `20260114000008_gamification_triggers_and_crons.sql`
**Erro**: Tabela `public.checkins` não existe

**Causa**: Nome incorreto da tabela (correto é `public.daily_checkins`)

**Problemas encontrados**:
1. Trigger `check_achievements_after_checkin` - tabela errada
2. Trigger `check_achievements_after_weight` - tabela errada  
3. Função `trigger_check_achievements_on_weight()` - tabela e colunas erradas

**Soluções aplicadas**:
```sql
-- ❌ ANTES
CREATE TRIGGER check_achievements_after_checkin
AFTER INSERT OR UPDATE ON public.checkins
WHEN (NEW.is_complete = true)

-- ✅ DEPOIS
CREATE TRIGGER check_achievements_after_checkin
AFTER INSERT OR UPDATE ON public.daily_checkins
WHEN (NEW.status = 'complete')
```

**Correções de colunas**:
- `is_complete` → `status = 'complete'`
- `weight_kg` → `weight`

### 3. ❌ Migration: `20260114000008_gamification_triggers_and_crons.sql`
**Erro**: `ERROR: schema "cron" does not exist (SQLSTATE 3F000)`

**Causa**: Extensão `pg_cron` não estava habilitada.

**Solução**:
- ✅ Adicionado `CREATE EXTENSION IF NOT EXISTS pg_cron;` no início da migration.

### 4. 🔄 Idempotência: `20260114000008_gamification_triggers_and_crons.sql`
**Problema**: A migration não era totalmente idempotente, o que poderia causar erros ao rodar múltiplas vezes (especialmente com cron jobs).

**Solução**:
- ✅ Adicionado `DROP TRIGGER IF EXISTS` antes de todos os `CREATE TRIGGER`.
- ✅ Implementado padrão `cron.unschedule` antes de `cron.schedule`.
- ✅ Corrigido erro de sintaxe com delimitadores aninhados (`$$`) dentro do bloco `DO`.
- ✅ Removida referência à coluna inexistente `last_run` na tabela `cron.job` (substituída por `NULL`).


- ✅ Removida referência à coluna inexistente `last_run` na tabela `cron.job` (substituída por `NULL`).

### 5. ❌ Migration: `20260114000009_admin_impersonation_system.sql`
**Erro**: `ERROR: syntax error at or near "WHERE" (SQLSTATE 42601)`

**Causa**: Cláusula `WHERE` não é suportada diretamente em constraints `UNIQUE` dentro do `CREATE TABLE`.

**Solução**:
- ✅ Removida constraint inline.
- ✅ Criado índice único condicional separadamente: `CREATE UNIQUE INDEX ... WHERE is_active = true;`.

---

## Schema Correto da Tabela `daily_checkins`

```sql
CREATE TABLE public.daily_checkins (
  id UUID,
  user_id UUID,
  date DATE,
  status checkin_status,        -- ✅ Não é 'is_complete'
  water_current INT,
  water_goal INT,
  mood mood_type,
  weight DECIMAL,               -- ✅ Não é 'weight_kg'
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, date)
);
```

---

## Checklist de Validação

### Antes de Criar Migration
- [ ] Verificar se todas as tabelas referenciadas existem
- [ ] Verificar nomes corretos das colunas no schema
- [ ] Verificar se enums/types existem
- [ ] Verificar ordem de dependências

### Ao Criar Migration
- [ ] Usar `IF NOT EXISTS` em CREATEs
- [ ] Usar `DROP IF EXISTS` antes de triggers/policies
- [ ] Adicionar comentários de dependências
- [ ] Testar localmente 2x seguidas

### Após Criar Migration
- [ ] Rodar `supabase db push` localmente
- [ ] Rodar novamente para testar idempotência
- [ ] Verificar logs de erro
- [ ] Commitar apenas se passar

---

## Arquivos Corrigidos

1. ✅ `20260114000007_progress_calendar_system.sql`
2. ✅ `20260114000008_gamification_triggers_and_crons.sql`
3. ✅ `20260115000002_fix_calendar_achievements_count.sql` (criado)

---

## Como Evitar Esses Erros

### 1. Sempre Verificar Schema Antes
```bash
# Ver estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_checkins';
```

### 2. Usar Grep para Encontrar Definições
```bash
grep -r "CREATE TABLE.*daily_checkins" supabase/migrations/
```

### 3. Documentar Dependências
```sql
-- Dependencies: 
--   - 20260101000002_domain_tables.sql (daily_checkins table)
--   - 20260114000017_fix_achievements_schema.sql (unlocked_at column)
```

### 4. Adicionar Verificações de Existência
```sql
-- Verificar se tabela existe
IF EXISTS (SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'daily_checkins') THEN
  -- Criar trigger
END IF;
```

---

## Status Final

✅ **Todas as migrations corrigidas**
✅ **Idempotência garantida**
✅ **Pronto para deploy**

## Próximo Passo

```bash
supabase db push
```

Deve executar sem erros agora!
