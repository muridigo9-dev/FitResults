# 📋 Diretrizes para Migrations Seguras e Idempotentes

## 🎯 Objetivo

Garantir que todas as migrations sejam **idempotentes**, **seguras** e **não quebrem** em múltiplas execuções.

---

## ⚠️ Problemas Comuns

### 1. **Tabela não existe**
```sql
-- ❌ ERRADO
ALTER TABLE user_preferences ADD COLUMN pwa_dismissed BOOLEAN;

-- ✅ CORRETO
CREATE TABLE IF NOT EXISTS user_preferences (...);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS pwa_dismissed BOOLEAN;
```

### 2. **Enum não existe**
```sql
-- ❌ ERRADO
INSERT INTO email_templates (type) VALUES ('invite');

-- ✅ CORRETO
-- Migration 1: Adiciona enum
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'invite';

-- Migration 2: Usa o enum
INSERT INTO email_templates (type) VALUES ('invite');
```

### 3. **Colunas com nomes errados**
```sql
-- ❌ ERRADO (verificar schema antes)
INSERT INTO feature_flags (flag_name, config) VALUES (...);

-- ✅ CORRETO (usar nomes corretos)
INSERT INTO feature_flags (key, affects) VALUES (...);
```

### 4. **Policies duplicadas**
```sql
-- ❌ ERRADO
CREATE POLICY "policy_name" ON table_name ...;

-- ✅ CORRETO
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...;
```

### 5. **Triggers duplicados**
```sql
-- ❌ ERRADO
CREATE TRIGGER trigger_name ...;

-- ✅ CORRETO
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;
```

### 6. **Indexes duplicados**
```sql
-- ❌ ERRADO
CREATE INDEX idx_name ON table_name(column);

-- ✅ CORRETO
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);
```

---

## ✅ Checklist de Migration Segura

### Antes de Criar a Migration

- [ ] Verificar se a tabela existe no schema
- [ ] Verificar nomes corretos das colunas
- [ ] Verificar tipos de dados corretos
- [ ] Verificar se enums existem
- [ ] Verificar ordem de dependências

### Ao Criar a Migration

- [ ] Usar `CREATE TABLE IF NOT EXISTS`
- [ ] Usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- [ ] Usar `DROP ... IF EXISTS` antes de `CREATE`
- [ ] Usar `CREATE INDEX IF NOT EXISTS`
- [ ] Usar `ON CONFLICT DO NOTHING` em INSERTs
- [ ] Adicionar comentários explicativos

### Estrutura da Migration

```sql
-- ============================================
-- NOME DA MIGRATION
-- ============================================
-- Descrição: O que esta migration faz
-- Created: YYYY-MM-DD
-- Idempotent: Safe to run multiple times
-- Dependencies: Lista de migrations necessárias

-- 1. CREATE TABLES (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.table_name (...);

-- 2. ALTER TABLES (ADD COLUMN IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'table_name' 
      AND column_name = 'column_name'
  ) THEN
    ALTER TABLE public.table_name ADD COLUMN column_name TYPE;
  END IF;
END $$;

-- 3. DROP OLD OBJECTS
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
DROP TRIGGER IF EXISTS trigger_name ON public.table_name;
DROP INDEX IF EXISTS idx_name;

-- 4. CREATE NEW OBJECTS
CREATE POLICY "policy_name" ON public.table_name ...;
CREATE TRIGGER trigger_name ...;
CREATE INDEX IF NOT EXISTS idx_name ...;

-- 5. INSERT DATA (WITH CONFLICT HANDLING)
INSERT INTO public.table_name (key, value)
VALUES ('key1', 'value1')
ON CONFLICT (key) DO NOTHING;

-- 6. COMMENTS
COMMENT ON TABLE public.table_name IS 'Description';
```

---

## 🔧 Padrões por Tipo de Operação

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS public.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ALTER TABLE - ADD COLUMN

**Opção 1: Simples**
```sql
ALTER TABLE public.table_name 
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

**Opção 2: Com verificação (mais seguro)**
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'table_name' 
      AND column_name = 'column_name'
  ) THEN
    ALTER TABLE public.table_name ADD COLUMN column_name TYPE DEFAULT value;
  END IF;
END $$;
```

### ALTER TYPE - ADD ENUM VALUE

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'enum_type_name' 
      AND e.enumlabel = 'new_value'
  ) THEN
    ALTER TYPE public.enum_type_name ADD VALUE 'new_value';
  END IF;
END $$;
```

### CREATE POLICY

```sql
DROP POLICY IF EXISTS "policy_name" ON public.table_name;

CREATE POLICY "policy_name" 
ON public.table_name 
FOR SELECT 
USING (auth.uid() = user_id);
```

### CREATE INDEX

```sql
CREATE INDEX IF NOT EXISTS idx_table_column 
ON public.table_name(column_name);
```

### CREATE TRIGGER

```sql
DROP TRIGGER IF EXISTS trigger_name ON public.table_name;

CREATE TRIGGER trigger_name
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION function_name();
```

### INSERT DATA

```sql
INSERT INTO public.table_name (key, value)
VALUES 
  ('key1', 'value1'),
  ('key2', 'value2')
ON CONFLICT (key) DO NOTHING;

-- OU para atualizar se existir
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

---

## 📝 Ordem de Execução

### 1. **Criar Enums**
```sql
-- Migration: 001_create_enums.sql
CREATE TYPE IF NOT EXISTS status_type AS ENUM ('active', 'inactive');
```

### 2. **Criar Tabelas**
```sql
-- Migration: 002_create_tables.sql
CREATE TABLE IF NOT EXISTS users (...);
```

### 3. **Adicionar Colunas**
```sql
-- Migration: 003_add_columns.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS status status_type;
```

### 4. **Criar Indexes**
```sql
-- Migration: 004_create_indexes.sql
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

### 5. **Criar Policies**
```sql
-- Migration: 005_create_policies.sql
DROP POLICY IF EXISTS "policy_name" ON users;
CREATE POLICY "policy_name" ON users ...;
```

### 6. **Inserir Dados**
```sql
-- Migration: 006_insert_data.sql
INSERT INTO users (...) VALUES (...) ON CONFLICT DO NOTHING;
```

---

## 🚫 O Que NUNCA Fazer

### ❌ Assumir que tabela existe
```sql
ALTER TABLE table_name ADD COLUMN ...;  -- Pode falhar!
```

### ❌ Assumir que coluna não existe
```sql
ALTER TABLE table_name ADD COLUMN name TEXT;  -- Pode duplicar!
```

### ❌ Criar policy sem DROP
```sql
CREATE POLICY "name" ...;  -- Pode duplicar!
```

### ❌ Usar nomes de colunas sem verificar
```sql
INSERT INTO feature_flags (flag_name) ...;  -- Coluna pode não existir!
```

### ❌ Adicionar enum value sem verificar
```sql
ALTER TYPE enum_type ADD VALUE 'new';  -- Pode duplicar!
```

### ❌ Criar migration sem idempotência
```sql
-- Migration sem IF NOT EXISTS, DROP IF EXISTS, ON CONFLICT
```

---

## ✅ Exemplo Completo de Migration Segura

```sql
-- ============================================
-- USER NOTIFICATIONS SYSTEM
-- ============================================
-- Description: Creates notification system for users
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Dependencies: Requires auth.users table

-- 1. Create enum for notification types
DO $$
BEGIN
  CREATE TYPE IF NOT EXISTS notification_type AS ENUM (
    'info', 'warning', 'success', 'error'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add new enum value if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' 
      AND e.enumlabel = 'achievement'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'achievement';
  END IF;
END $$;

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- 6. Create new policies
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read_at 
ON public.notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

-- 8. Create trigger for cleanup
DROP TRIGGER IF EXISTS cleanup_old_notifications ON public.notifications;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '90 days' 
    AND read_at IS NOT NULL;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_old_notifications
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_notifications();

-- 9. Insert default data
INSERT INTO public.feature_flags (key, enabled, description, affects)
VALUES ('notifications_enabled', true, 'Enable notification system', '["notifications"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 10. Comments
COMMENT ON TABLE public.notifications IS 
'User notifications for in-app messages and alerts';

COMMENT ON COLUMN public.notifications.type IS 
'Type of notification: info, warning, success, error, achievement';
```

---

## 🧪 Como Testar Migrations

### 1. **Teste Local**
```bash
# Aplicar migration
supabase db push

# Aplicar novamente (deve ser idempotente)
supabase db push

# Verificar se não há erros
```

### 2. **Teste de Rollback**
```bash
# Criar migration de rollback
supabase migration new rollback_feature_name

# Testar rollback
supabase db reset
```

### 3. **Teste em Staging**
```bash
# Deploy para staging
supabase db push --project-ref staging-ref

# Verificar logs
supabase db logs --project-ref staging-ref
```

---

## 📚 Referências

- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL IF NOT EXISTS](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL Idempotent Scripts](https://wiki.postgresql.org/wiki/Idempotent_DDL)

---

## ✅ Checklist Final

Antes de fazer commit de uma migration:

- [ ] Migration é idempotente (pode rodar múltiplas vezes)
- [ ] Usa `IF NOT EXISTS` em CREATEs
- [ ] Usa `DROP IF EXISTS` antes de policies/triggers
- [ ] Usa `ON CONFLICT` em INSERTs
- [ ] Verifica nomes de colunas no schema
- [ ] Verifica tipos de dados corretos
- [ ] Adiciona comentários explicativos
- [ ] Testa localmente 2x seguidas
- [ ] Documenta dependências

---

**Status:** ✅ Diretrizes Completas  
**Versão:** 1.0.0  
**Data:** 14/01/2026

**🔒 Migrations seguras = Deploy confiável! 🔒**
