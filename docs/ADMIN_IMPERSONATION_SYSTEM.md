## 🔐 Sistema de Impersonação de Usuários - LGPD Compliant

## 📋 Visão Geral

Sistema seguro e auditável para SUPER ADMIN impersonar usuários, permitindo:
- Suporte técnico eficiente
- Debug de problemas específicos
- Validação de dados e funcionalidades
- Testes internos

**100% conforme LGPD** com auditoria completa e rastreabilidade total.

---

## 🎯 Funcionalidades

### 1. **Impersonação Segura**
- ✅ Apenas SUPER ADMIN pode impersonar
- ✅ Sessões temporárias (30 minutos)
- ✅ Token único por sessão
- ✅ Validação contínua de permissões

### 2. **Auditoria Completa (LGPD)**
- ✅ Log de TODAS as impersonações
- ✅ Registro de quem, quando, por quê
- ✅ IP address e user agent
- ✅ Duração da sessão
- ✅ Logs imutáveis

### 3. **Proteções de Segurança**
- ✅ Não permite impersonar a si mesmo
- ✅ Restrições por usuário (LGPD, segurança)
- ✅ Justificativa obrigatória para usuários reais
- ✅ Expiração automática de sessões
- ✅ Banner visível durante impersonação

### 4. **Conformidade Legal**
- ✅ Termo de responsabilidade LGPD
- ✅ Justificativa documentada
- ✅ Transparência total
- ✅ Rastreabilidade completa

---

## 🏗️ Arquitetura

### Backend (PostgreSQL + Supabase)

#### Tabelas

**`admin_impersonation_logs`**
```sql
- id: UUID (PK)
- admin_id: UUID (quem está impersonando)
- impersonated_user_id: UUID (quem está sendo impersonado)
- reason: TEXT (justificativa)
- started_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
- ip_address: INET
- user_agent: TEXT
- status: TEXT (active, ended, expired, revoked)
- session_token: TEXT (único)
- expires_at: TIMESTAMPTZ (30 min)
```

**`impersonation_restrictions`**
```sql
- id: UUID (PK)
- user_id: UUID (usuário restrito)
- reason: TEXT (motivo da restrição)
- restriction_type: TEXT (lgpd_request, security, permanent, temporary)
- expires_at: TIMESTAMPTZ (se temporária)
- is_active: BOOLEAN
```

#### Funções SQL

1. **`can_impersonate_user(admin_id, target_user_id)`**
   - Verifica se admin pode impersonar usuário
   - Valida role SUPER_ADMIN
   - Verifica restrições ativas
   - Retorna: `can_impersonate: boolean, reason: text`

2. **`start_impersonation(admin_id, target_user_id, reason, ip, user_agent)`**
   - Inicia sessão de impersonação
   - Gera token único
   - Registra log
   - Retorna: `success, message, session_token, expires_at`

3. **`validate_impersonation_session(session_token)`**
   - Valida se sessão está ativa
   - Verifica expiração
   - Retorna: `is_valid, admin_id, impersonated_user_id, expires_at`

4. **`end_impersonation(session_token)`**
   - Encerra sessão de impersonação
   - Atualiza log
   - Retorna: `success, message`

5. **`get_impersonation_logs(admin_id, limit)`**
   - Retorna logs de impersonação
   - Com detalhes completos
   - Ordenados por data

#### Cron Job

- **`expire-impersonation-sessions`**: A cada 5 minutos
  - Expira sessões antigas automaticamente
  - Atualiza status para `expired`

---

### Frontend (React + TypeScript)

#### Hook: `useImpersonation`

**Funções:**
- `useCanImpersonate(userId)` - Verifica permissão
- `useStartImpersonation()` - Inicia impersonação
- `useEndImpersonation()` - Encerra impersonação
- `useImpersonationLogs()` - Busca logs
- `useImpersonationStatus()` - Status atual

**LocalStorage:**
```typescript
{
  isImpersonating: boolean,
  impersonatedUserId: string,
  impersonatedEmail: string,
  sessionToken: string,
  expiresAt: string
}
```

#### Componentes

**1. `ImpersonationBanner`**
- Banner vermelho no topo da tela
- Visível apenas durante impersonação
- Mostra email do usuário impersonado
- Tempo restante da sessão
- Botão "Sair da Impersonação"
- Aviso legal LGPD

**2. `ImpersonateUserDialog`**
- Dialog para iniciar impersonação
- Verificação de permissões
- Campo de justificativa (obrigatório para usuários reais)
- Termo de responsabilidade LGPD
- Checkbox de aceite

**3. `AdminImpersonationLogs`**
- Página de logs de auditoria
- Cards de estatísticas
- Lista de todas as sessões
- Filtros e busca
- Detalhes completos de cada sessão

---

## 🔒 Segurança

### Validações

1. **Role Check**
   - Apenas `admin` (SUPER_ADMIN) pode impersonar
   - Validado no backend (RLS)

2. **Restrições**
   - Usuários com solicitação LGPD não podem ser impersonados
   - Restrições de segurança
   - Restrições temporárias ou permanentes

3. **Justificativa**
   - Obrigatória para usuários reais (mínimo 10 caracteres)
   - Opcional para usuários de teste (@test.com)
   - Registrada nos logs

4. **Sessão Temporária**
   - Expira em 30 minutos
   - Token único e criptografado
   - Validação contínua

5. **Termo de Responsabilidade**
   - Aceite obrigatório antes de impersonar
   - Aviso legal LGPD
   - Responsabilidades claras

### RLS Policies

```sql
-- Apenas SUPER ADMIN pode ver logs
CREATE POLICY "Super admin can view all impersonation logs"
  ON admin_impersonation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
```

---

## 📊 Fluxo de Uso

### 1. Iniciar Impersonação

```
SUPER ADMIN acessa painel de usuários
       ↓
Clica em "Impersonar Usuário"
       ↓
Dialog abre com verificações
       ↓
Verifica permissões (can_impersonate_user)
       ↓
Se usuário real: pede justificativa
       ↓
Exibe termo LGPD
       ↓
Admin aceita termo
       ↓
Clica em "Iniciar Impersonação"
       ↓
Backend cria sessão e log
       ↓
Frontend salva token no localStorage
       ↓
Página recarrega
       ↓
Banner vermelho aparece
       ↓
Admin navega como usuário
```

### 2. Durante Impersonação

```
Banner visível no topo
       ↓
Mostra email do usuário
       ↓
Mostra tempo restante
       ↓
Admin realiza ações
       ↓
Todas as ações são auditáveis
       ↓
Sessão expira em 30 min
```

### 3. Encerrar Impersonação

```
Admin clica em "Sair da Impersonação"
       ↓
Backend atualiza log (ended_at)
       ↓
Frontend limpa localStorage
       ↓
Redireciona para /admin/dashboard
       ↓
Banner desaparece
```

---

## 🧪 Casos de Uso

### Caso 1: Suporte Técnico

**Cenário:** Usuário reporta bug específico

1. SUPER ADMIN acessa AdminUsers
2. Encontra usuário
3. Clica em "Impersonar"
4. Preenche justificativa: "Debug de erro ao salvar dieta"
5. Aceita termo LGPD
6. Inicia impersonação
7. Reproduz o bug
8. Identifica problema
9. Encerra impersonação
10. Log registrado com duração e justificativa

### Caso 2: Validação de Dados

**Cenário:** Verificar se dados estão corretos

1. SUPER ADMIN impersona usuário
2. Justificativa: "Validação de dados após migração"
3. Navega pelas telas
4. Verifica informações
5. Encerra impersonação
6. Tudo registrado nos logs

### Caso 3: Teste de Funcionalidade

**Cenário:** Testar nova feature

1. SUPER ADMIN impersona usuário de teste
2. Sem necessidade de justificativa (é @test.com)
3. Testa funcionalidade
4. Encerra impersonação
5. Log registrado

### Caso 4: Usuário com Restrição LGPD

**Cenário:** Usuário solicitou não ser impersonado

1. SUPER ADMIN tenta impersonar
2. Sistema bloqueia
3. Mensagem: "Usuário possui restrição de impersonação"
4. Impersonação não é permitida
5. Tentativa registrada nos logs

---

## 📝 Logs de Auditoria

### Informações Registradas

Cada sessão de impersonação registra:

- ✅ **Quem**: Admin ID, nome e email
- ✅ **Quem foi impersonado**: User ID, nome e email
- ✅ **Quando**: Data/hora de início e fim
- ✅ **Duração**: Tempo total da sessão
- ✅ **Por quê**: Justificativa fornecida
- ✅ **De onde**: IP address
- ✅ **Como**: User agent (browser)
- ✅ **Status**: active, ended, expired, revoked

### Visualização de Logs

**Página:** `/admin/impersonation`

**Estatísticas:**
- Total de sessões
- Sessões ativas
- Sessões encerradas
- Sessões expiradas

**Lista de Logs:**
- Ordenada por data (mais recente primeiro)
- Filtros por admin, usuário, status
- Detalhes completos de cada sessão
- Badges de status coloridos

---

## ⚖️ Conformidade LGPD

### Princípios Atendidos

1. **Transparência**
   - Logs completos e acessíveis
   - Justificativa obrigatória
   - Termo de responsabilidade

2. **Finalidade**
   - Uso apenas para suporte, debug e testes
   - Justificativa documentada
   - Tempo limitado (30 min)

3. **Necessidade**
   - Apenas SUPER ADMIN
   - Apenas quando necessário
   - Restrições respeitadas

4. **Segurança**
   - Sessões temporárias
   - Token único
   - Validação contínua
   - Logs imutáveis

5. **Responsabilização**
   - Auditoria completa
   - Rastreabilidade total
   - Termo de aceite
   - Logs permanentes

### Direitos do Titular

- ✅ Usuário pode solicitar restrição de impersonação
- ✅ Usuário pode ver logs de acessos (via LGPD)
- ✅ Restrições são respeitadas automaticamente
- ✅ Logs são mantidos para auditoria

---

## 🚀 Como Usar

### Para SUPER ADMIN

#### 1. Impersonar Usuário de Teste

```typescript
// No painel de usuários
<ImpersonateUserDialog
  open={open}
  onOpenChange={setOpen}
  userId={user.id}
  userEmail={user.email}
  userName={user.full_name}
/>

// Usuário @test.com não precisa de justificativa
// Clique em "Iniciar Impersonação"
// Banner aparece
// Navegue normalmente
// Clique em "Sair da Impersonação"
```

#### 2. Impersonar Usuário Real

```typescript
// No painel de usuários
<ImpersonateUserDialog
  open={open}
  onOpenChange={setOpen}
  userId={user.id}
  userEmail={user.email}
  userName={user.full_name}
/>

// Preencha justificativa (mínimo 10 caracteres)
// Ex: "Debug de erro ao salvar check-in"
// Aceite termo LGPD
// Clique em "Iniciar Impersonação"
// Banner aparece
// Navegue normalmente
// Clique em "Sair da Impersonação"
```

#### 3. Ver Logs

```typescript
// Acesse /admin/impersonation
// Veja todas as sessões
// Filtre por admin, usuário, status
// Veja estatísticas
```

### Para Desenvolvedores

#### Verificar se está impersonando

```typescript
import { useImpersonationStatus } from "@/hooks/useImpersonation";

const { data: status } = useImpersonationStatus();

if (status?.isImpersonating) {
  console.log("Impersonando:", status.impersonatedEmail);
}
```

#### Adicionar restrição

```sql
INSERT INTO impersonation_restrictions (
  user_id,
  reason,
  restriction_type,
  is_active
) VALUES (
  'user-uuid',
  'Solicitação LGPD - Direito à privacidade',
  'lgpd_request',
  true
);
```

---

## 📁 Arquivos do Sistema

### Backend
- `supabase/migrations/20260114000009_admin_impersonation_system.sql`

### Frontend
- `src/hooks/useImpersonation.ts`
- `src/components/admin/ImpersonationBanner.tsx`
- `src/components/admin/ImpersonateUserDialog.tsx`
- `src/pages/admin/AdminImpersonationLogs.tsx`

### Documentação
- `docs/ADMIN_IMPERSONATION_SYSTEM.md`

---

## ✅ Checklist de Implementação

- [x] Tabelas de banco de dados
- [x] Funções SQL (can_impersonate, start, validate, end, get_logs)
- [x] RLS Policies
- [x] Cron job para expirar sessões
- [x] Hook useImpersonation
- [x] Componente ImpersonationBanner
- [x] Componente ImpersonateUserDialog
- [x] Página AdminImpersonationLogs
- [x] Integração no App.tsx
- [x] Rota /admin/impersonation
- [x] Documentação completa

---

## 🎯 Resultado Final

✅ **Sistema 100% funcional e LGPD compliant**  
✅ **Auditoria completa de todas as impersonações**  
✅ **Segurança robusta com múltiplas validações**  
✅ **UX clara com avisos e banners**  
✅ **Logs imutáveis para compliance**  
✅ **Restrições respeitadas automaticamente**  
✅ **Sessões temporárias (30 min)**  
✅ **Termo de responsabilidade obrigatório**  

**Status:** ✅ Implementado e Pronto para Uso  
**Versão:** 1.0.0  
**Data:** 14/01/2026

**🔐 Impersonação segura, auditável e LGPD compliant! 🔐**
