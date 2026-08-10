# Correção de Erros de Migration

## Problema Identificado

A migration `20260114000007_progress_calendar_system.sql` estava falhando com o erro:

```
ERROR: column ua.unlocked_at does not exist (SQLSTATE 42703)
```

## Causa Raiz

A migration tentava usar a coluna `unlocked_at` da tabela `user_achievements`, mas essa coluna só é criada na migration `20260114000017_fix_achievements_schema.sql`, que pode rodar **depois** da migration do calendário dependendo da ordem de execução.

## Solução Implementada

### 1. Correção da Migration Original
**Arquivo**: `20260114000007_progress_calendar_system.sql`

Alterado o campo `achievements_count` para retornar `0` temporariamente com um comentário explicativo:

```sql
-- Achievements unlocked
-- NOTE: This count will be 0 until user_achievements table has proper date columns
-- The table may have either 'unlocked_at', 'earned_at', or 'created_at' depending on migration order
0 as achievements_count,
```

**Por quê?** Isso garante que a migration sempre funciona, independentemente da ordem de execução.

### 2. Nova Migration de Correção
**Arquivo**: `20260115000002_fix_calendar_achievements_count.sql`

Criada uma nova migration que:
- Roda **depois** da migration que cria a coluna `unlocked_at`
- Recria a view materializada com a query correta
- Usa `unlocked_at IS NOT NULL` para evitar erros com valores NULL

```sql
-- Achievements unlocked (now using unlocked_at column)
COALESCE(
  (SELECT COUNT(*) 
   FROM public.user_achievements ua 
   WHERE ua.user_id = c.user_id 
   AND ua.unlocked_at IS NOT NULL
   AND ua.unlocked_at::date = c.date),
  0
) as achievements_count,
```

## Ordem de Execução Correta

```
1. 20260114000007_progress_calendar_system.sql (achievements_count = 0)
2. 20260114000017_fix_achievements_schema.sql (cria unlocked_at)
3. 20260115000002_fix_calendar_achievements_count.sql (atualiza view)
```

## Como Aplicar

```bash
# Aplicar todas as migrations
supabase db push

# Ou via Dashboard do Supabase
# 1. SQL Editor
# 2. Executar cada migration em ordem
```

## Verificação

Após aplicar as migrations, verificar:

```sql
-- 1. Verificar se a view existe
SELECT * FROM public.daily_checkin_summary LIMIT 1;

-- 2. Verificar se a coluna unlocked_at existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_achievements' 
AND column_name IN ('unlocked_at', 'earned_at');

-- 3. Testar a contagem de achievements
SELECT date, achievements_count 
FROM public.daily_checkin_summary 
WHERE achievements_count > 0
LIMIT 5;
```

## Prevenção de Erros Futuros

### Checklist para Novas Migrations

✅ **Sempre verificar dependências de colunas**
- Se uma migration usa uma coluna, verificar se ela já existe
- Usar `IF NOT EXISTS` ou queries condicionais

✅ **Documentar dependências**
```sql
-- Dependencies: 20260114000017_fix_achievements_schema.sql (unlocked_at column must exist)
```

✅ **Usar COALESCE para valores NULL**
```sql
COALESCE((SELECT ...), 0) as count_field
```

✅ **Adicionar verificações de existência**
```sql
WHERE column_name IS NOT NULL
AND column_name::date = target_date
```

✅ **Testar idempotência**
```bash
# Rodar 2x seguidas - não deve dar erro
supabase db push
supabase db push
```

## Arquivos Modificados

1. ✅ `20260114000007_progress_calendar_system.sql` - Corrigido
2. ✅ `20260115000002_fix_calendar_achievements_count.sql` - Criado

## Status

✅ **Problema resolvido**
✅ **Migrations idempotentes**
✅ **Documentação atualizada**
