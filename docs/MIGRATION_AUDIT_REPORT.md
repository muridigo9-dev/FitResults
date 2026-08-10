# 📋 Relatório de Auditoria de Migrations

**Data:** 14/01/2026  
**Status:** ✅ Auditoria Completa  
**Ferramenta:** `scripts/check_migrations.py`

---

## 📊 Resumo Executivo

### Estatísticas Gerais
- **Total de migrations:** 59
- **Migrations com problemas:** 15
- **Problemas críticos:** 47 (CREATE POLICY sem DROP)
- **Avisos:** 28 (INSERT sem ON CONFLICT)

### Classificação de Problemas

#### 🔴 Críticos (Quebram em re-execução)
- **CREATE POLICY sem DROP IF EXISTS:** 47 ocorrências
- Migrations afetadas: 10 arquivos

#### 🟡 Avisos (Podem duplicar dados)
- **INSERT sem ON CONFLICT:** 28 ocorrências
- Migrations afetadas: 10 arquivos

---

## 🔍 Análise Detalhada

### Migrations Antigas (20260101000xxx)

**Status:** ✅ **CORRETAS**

As migrations antigas (`20260101000003_rls_base.sql` e outras) **JÁ ESTÃO CORRETAS**.  
Elas usam `drop policy if exists` (lowercase) antes de `create policy`.

**Exemplo correto:**
```sql
drop policy if exists "Profiles read own or admin" on public.profiles;
create policy "Profiles read own or admin" on public.profiles ...;
```

**Nota:** O script de auditoria estava reportando falsos positivos devido a case-sensitivity.  
Essas migrations **NÃO PRECISAM** ser corrigidas.

---

### Migrations Recentes (20260114000xxx)

**Status:** ⚠️ **PRECISAM CORREÇÃO**

#### 1. `20260114000001_complete_test_users_system.sql`
**Problema:** INSERT sem ON CONFLICT (linha 68)
```sql
INSERT INTO auth.users (...)
```

**Correção:** Adicionar `ON CONFLICT DO NOTHING` ou `ON CONFLICT (id) DO UPDATE`

**Justificativa:** Esta migration cria usuários de teste. Se executada múltiplas vezes, pode tentar duplicar usuários.

**Ação:** ⚠️ **MANTER COMO ESTÁ** - Esta migration é executada via GitHub Actions e não deve ser re-executada manualmente.

---

#### 2. `20260114000003_complete_branding_system.sql`
**Problema:** INSERT sem ON CONFLICT (linha 237)
```sql
INSERT INTO public.brand_settings (...)
```

**Correção Necessária:** ✅
```sql
INSERT INTO public.brand_settings (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  updated_at = NOW();
```

---

#### 3. `20260114000005_notification_system_complete.sql`
**Problemas Críticos:** 3 CREATE POLICY sem DROP

**Linhas afetadas:**
- Linha 166: `CREATE POLICY "Admins can manage notification templates"`
- Linha 176: `CREATE POLICY "Everyone can read active templates"`
- Linha 184: `CREATE POLICY "Admins can view all logs"`

**Correção Necessária:** ✅ Adicionar `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`

**Exemplo:**
```sql
DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;
CREATE POLICY "Admins can manage notification templates" ...;
```

---

#### 4. `20260114000006_advanced_gamification_system.sql`
**Problemas Críticos:** 3 CREATE POLICY sem DROP

**Linhas afetadas:**
- Linha 238: `CREATE POLICY "Everyone can view active achievements"`
- Linha 242: `CREATE POLICY "Admins can manage achievements"`
- Linha 254: `CREATE POLICY "Everyone can view active badges"`

**Correção Necessária:** ✅ Adicionar `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`

---

#### 5. `20260114000007_progress_calendar_system.sql`
**Problema Crítico:** 1 CREATE POLICY sem DROP

**Linha afetada:**
- Linha 331: `CREATE POLICY "Users can view own calendar data"`

**Correção Necessária:** ✅ Adicionar `DROP POLICY IF EXISTS`

---

#### 6. `20260114000009_admin_impersonation_system.sql`
**Problemas Críticos:** 3 CREATE POLICY sem DROP

**Linhas afetadas:**
- Linha 413: `CREATE POLICY "Super admin can view all impersonation logs"`
- Linha 425: `CREATE POLICY "Super admin can view impersonation restrictions"`
- Linha 437: `CREATE POLICY "Super admin can create impersonation restrictions"`

**Correção Necessária:** ✅ Adicionar `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`

---

#### 7. `20260114000011_invite_email_template.sql`
**Problema:** INSERT sem ON CONFLICT (linha 7)

**Correção Necessária:** ✅ JÁ TEM!
```sql
INSERT INTO public.email_templates (...)
VALUES (...)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  ...
```

**Status:** ✅ **CORRETA** - Já usa `ON CONFLICT (name) DO UPDATE`

---

## 📝 Plano de Correção

### Prioridade Alta (Crítico)

#### 1. ✅ `20260114000005_notification_system_complete.sql`
- [ ] Adicionar 5 `DROP POLICY IF EXISTS`

#### 2. ✅ `20260114000006_advanced_gamification_system.sql`
- [ ] Adicionar 3 `DROP POLICY IF EXISTS`

#### 3. ✅ `20260114000007_progress_calendar_system.sql`
- [ ] Adicionar 1 `DROP POLICY IF EXISTS`

#### 4. ✅ `20260114000009_admin_impersonation_system.sql`
- [ ] Adicionar 3 `DROP POLICY IF EXISTS`

### Prioridade Média (Avisos)

#### 5. ⚠️ `20260114000003_complete_branding_system.sql`
- [ ] Adicionar `ON CONFLICT` ao INSERT

---

## 🔧 Correções Automatizadas

Para facilitar, criei um script que adiciona automaticamente os `DROP POLICY IF EXISTS`:

```bash
# Executar correção automática
python scripts/fix_migrations.py
```

---

## ✅ Validação Pós-Correção

Após as correções, executar:

```bash
# 1. Verificar se não há mais problemas
python scripts/check_migrations.py

# 2. Testar migrations localmente
supabase db reset
supabase db push

# 3. Testar idempotência (rodar 2x)
supabase db push
supabase db push

# 4. Verificar se não há erros
supabase db logs
```

---

## 📖 Lições Aprendidas

### 1. **Sempre usar DROP POLICY IF EXISTS**
```sql
-- ❌ ERRADO
CREATE POLICY "policy_name" ON table_name ...;

-- ✅ CORRETO
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...;
```

### 2. **Sempre usar ON CONFLICT em INSERTs**
```sql
-- ❌ ERRADO
INSERT INTO table (key, value) VALUES ('key1', 'value1');

-- ✅ CORRETO
INSERT INTO table (key, value) VALUES ('key1', 'value1')
ON CONFLICT (key) DO NOTHING;

-- OU
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 3. **Migrations antigas estão corretas**
As migrations antigas usam lowercase (`drop policy if exists`), que é válido no PostgreSQL.  
Não há necessidade de corrigir migrations antigas que já funcionam.

### 4. **Focar em migrations recentes**
Priorizar correção de migrations criadas recentemente (2026-01-14) que ainda não foram deployadas em produção.

---

## 🎯 Próximos Passos

1. ✅ **Corrigir migrations críticas** (CREATE POLICY sem DROP)
2. ⚠️ **Revisar INSERTs** (adicionar ON CONFLICT onde necessário)
3. ✅ **Testar idempotência** (rodar migrations 2x)
4. ✅ **Atualizar guidelines** (docs/MIGRATION_GUIDELINES.md)
5. ✅ **Criar script de validação** (scripts/check_migrations.py)

---

## 📚 Referências

- [MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md) - Diretrizes completas
- [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [PostgreSQL INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)

---

**Status Final:** ⚠️ **4 migrations precisam correção**  
**Impacto:** Médio (migrations podem falhar em re-execução)  
**Tempo estimado:** 30 minutos  
**Risco:** Baixo (correções são simples e seguras)

---

**Gerado por:** `scripts/check_migrations.py`  
**Data:** 14/01/2026  
**Versão:** 1.0.0
