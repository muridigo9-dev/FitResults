# 📋 PLANO DE REFATORAÇÃO: SISTEMA MULTI-TENANT

## 🎯 Objetivo
Evoluir o sistema de usuários para suportar dois modos de operação:
1. **Modo Padrão (SaaS)**: Super Admin + Usuários Comuns
2. **Modo Personal/Academia (Multi-Tenant)**: Isolamento total entre academias

---

## 📊 ESTADO ATUAL DO SISTEMA

### Roles Existentes (enum `app_role`)
- ✅ `admin` - Super Admin global
- ✅ `user` - Usuário comum
- ✅ `content_creator` - Criador de conteúdo
- ✅ `personal_trainer` - Personal Trainer (parcialmente implementado)
- ✅ `aluno` - Aluno (parcialmente implementado)
- ❓ `academy_admin` - Academia (mencionado em schema mas não nas migrations)

### Tabelas Relevantes
- `profiles` - Perfil do usuário
- `user_roles` - Tabela de roles (muitos-para-muitos)
- `trainer_students` - Relacionamento personal-aluno
- `content_assignments` - Atribuição de conteúdo por período
- `community_rankings` - Rankings por comunidade

### Feature Flags Existentes
- `personal_trainer_mode_enabled` - Modo personal trainer (não usado como multi-tenant ainda)
- `personal_billing_mode` - Modo de cobrança (personal paga vs aluno paga)
- `personal_custom_content_enabled` - Conteúdo customizado
- `personal_community_mode` - Ranking e gamificação

### Limitações Atuais
1. **Sem isolamento real**: Personal trainers não têm "contexto" de academia
2. **Sem multi-academia**: Personal não pode atuar em múltiplas academias
3. **Sem nutricionista**: Role não existe
4. **Sem convites obrigatórios**: Qualquer um pode se registrar
5. **Sem planos por academia**: Todos os limites são globais
6. **Conteúdos do admin são globais**: Não há controle de visibilidade por academia

---

## 🏗️ ARQUITETURA PROPOSTA

### FASE 1: PREPARAÇÃO E ESTRUTURA BASE (SEM QUEBRAR O EXISTENTE)

#### 1.1 Novos Enums e Roles
```sql
-- Adicionar à app_role (se não existir):
- 'academy_admin'           -- Admin de uma academia
- 'multi_academy_admin'     -- Admin de múltiplas academias
- 'nutritionist'            -- Nutricionista
- 'student'                 -- Renomear/deprecar 'aluno'
```

#### 1.2 Nova Tabela: `academies`
```sql
CREATE TABLE public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  
  -- Contato
  email TEXT,
  phone TEXT,
  
  -- Endereço
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'BR',
  
  -- Settings
  settings JSONB DEFAULT '{}'::JSONB,
  
  -- Billing (referência ao Stripe)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  
  -- Plan limits (definidos pelo Super Admin)
  plan_type TEXT CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'custom')),
  max_trainers INT DEFAULT 1,
  max_nutritionists INT DEFAULT 0,
  max_students INT DEFAULT 50,
  allow_multi_academy_professionals BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'pending')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

#### 1.3 Nova Tabela: `academy_members`
```sql
CREATE TABLE public.academy_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'trainer', 'nutritionist', 'student')),
  
  -- Permissions (para roles admin/owner)
  permissions JSONB DEFAULT '[]'::JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_invite')),
  
  -- Metadata
  notes TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(academy_id, user_id)
);
```

#### 1.4 Nova Tabela: `professional_academy_links`
```sql
-- Para profissionais que atuam em múltiplas academias
CREATE TABLE public.professional_academy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  
  professional_type TEXT NOT NULL CHECK (professional_type IN ('trainer', 'nutritionist')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval')),
  
  -- Permissions/Settings per academy
  can_create_content BOOLEAN DEFAULT true,
  can_assign_content BOOLEAN DEFAULT true,
  can_view_all_students BOOLEAN DEFAULT false, -- ou só os dele
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(professional_id, academy_id)
);
```

#### 1.5 Nova Tabela: `invites`
```sql
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Context
  invite_type TEXT NOT NULL CHECK (invite_type IN ('academy_trainer', 'academy_nutritionist', 'trainer_student', 'academy_student')),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Role to be assigned
  target_role TEXT NOT NULL CHECK (target_role IN ('personal_trainer', 'nutritionist', 'student')),
  
  -- Token
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  
  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  -- Metadata
  message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.6 Atualização de Tabelas Existentes

**`profiles`** - Adicionar coluna opcional:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
```

**`trainer_students`** - Adicionar contexto de academia:
```sql
ALTER TABLE public.trainer_students
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
```

**`content_assignments`** - Adicionar contexto de academia:
```sql
ALTER TABLE public.content_assignments
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
```

**Tabelas de conteúdo (diets, workouts, challenges, habits)** - Adicionar:
```sql
-- Já tem: assigned_to_type, assigned_to_id
ALTER TABLE public.diets
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'academy', 'private'));

-- Repetir para workouts, challenges, habits
```

---

### FASE 2: FUNÇÕES HELPER E RLS

#### 2.1 Funções de Verificação

```sql
-- Verificar se modo multi-tenant está ativo
CREATE OR REPLACE FUNCTION public.is_multi_tenant_enabled()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'personal_mode_enabled'),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar se usuário é membro de uma academia
CREATE OR REPLACE FUNCTION public.is_academy_member(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE user_id = _user_id 
    AND academy_id = _academy_id
    AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obter academias do usuário
CREATE OR REPLACE FUNCTION public.get_user_academy_ids(_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(academy_id),
    ARRAY[]::UUID[]
  )
  FROM public.academy_members
  WHERE user_id = _user_id
  AND status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obter contexto do usuário (para RLS dinâmico)
CREATE OR REPLACE FUNCTION public.get_user_context(_user_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'is_admin', public.has_role(_user_id, 'admin'),
    'is_multi_tenant', public.is_multi_tenant_enabled(),
    'academy_ids', public.get_user_academy_ids(_user_id),
    'is_trainer', public.has_role(_user_id, 'personal_trainer'),
    'is_nutritionist', public.has_role(_user_id, 'nutritionist'),
    'primary_academy', (SELECT primary_academy_id FROM public.profiles WHERE id = _user_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar se conteúdo é visível para o usuário
CREATE OR REPLACE FUNCTION public.can_view_content(
  _content_visibility TEXT,
  _content_academy_id UUID,
  _content_created_by UUID,
  _user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_multi_tenant BOOLEAN;
  v_user_academies UUID[];
BEGIN
  v_is_admin := public.has_role(_user_id, 'admin');
  v_multi_tenant := public.is_multi_tenant_enabled();
  
  -- Admin sempre vê tudo
  IF v_is_admin THEN RETURN true; END IF;
  
  -- Modo SaaS padrão (sem multi-tenant)
  IF NOT v_multi_tenant THEN
    -- Global: todos veem
    IF _content_visibility = 'global' THEN RETURN true; END IF;
    -- Private: só o criador vê
    IF _content_visibility = 'private' AND _content_created_by = _user_id THEN RETURN true; END IF;
    RETURN false;
  END IF;
  
  -- Modo Multi-Tenant
  v_user_academies := public.get_user_academy_ids(_user_id);
  
  -- Conteúdo da academia do usuário
  IF _content_visibility = 'academy' AND _content_academy_id = ANY(v_user_academies) THEN
    RETURN true;
  END IF;
  
  -- Conteúdo privado do próprio usuário
  IF _content_visibility = 'private' AND _content_created_by = _user_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### 2.2 RLS Policies para Novas Tabelas

```sql
-- ACADEMIES: Super Admin gerencia, membros visualizam
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin full access to academies"
  ON public.academies FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Academy members can view their academies"
  ON public.academies FOR SELECT TO authenticated
  USING (
    id = ANY(public.get_user_academy_ids(auth.uid()))
  );

-- ACADEMY_MEMBERS: Admin da academia gerencia
ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin full access to members"
  ON public.academy_members FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Academy admins manage their members"
  ON public.academy_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.academy_id = academy_members.academy_id
      AND am.role IN ('owner', 'admin')
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users view their own memberships"
  ON public.academy_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INVITES
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin full access to invites"
  ON public.invites FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Inviters can manage their invites"
  ON public.invites FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Invited users can view their invites"
  ON public.invites FOR SELECT TO authenticated
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
```

#### 2.3 Atualizar RLS de Conteúdos

```sql
-- DIETS: Atualizar policy para considerar academy_id e visibility
DROP POLICY IF EXISTS "Users can view diets" ON public.diets;
CREATE POLICY "Users can view diets"
  ON public.diets FOR SELECT TO authenticated
  USING (
    public.can_view_content(
      visibility,
      academy_id,
      created_by,
      auth.uid()
    )
  );

-- Repetir para workouts, challenges, habits
```

---

### FASE 3: EDGE FUNCTIONS E LÓGICA DE NEGÓCIO

#### 3.1 Nova Edge Function: `create-invite`
```typescript
// Criação de convites (academy admin ou trainer)
// Valida permissões, cria registro, envia email
```

#### 3.2 Nova Edge Function: `accept-invite`
```typescript
// Aceitar convite
// Valida token, cria perfil se necessário, adiciona a academy_members, atribui role
```

#### 3.3 Atualizar Edge Function: `create-checkout-session`
```typescript
// Adicionar suporte para:
// - Planos de academia (não só usuário individual)
// - Cobrança por pacote de alunos
// - Metadata incluindo academy_id
```

#### 3.4 Atualizar Edge Function: `stripe-webhook`
```typescript
// Ao receber payment_intent.succeeded:
// - Se academy_id nos metadata, atualizar limites da academia
// - Criar/atualizar academy no banco
// - Atualizar status de plano
```

---

### FASE 4: FRONTEND E UX

#### 4.1 Novo Contexto: `AcademyContext`
```typescript
// Gerenciar academia ativa, switching entre academias (multi-academy), permissões
```

#### 4.2 Novos Componentes Admin
- `AdminAcademies.tsx` - Listar e gerenciar academias
- `AdminAcademyDetail.tsx` - Detalhes da academia, membros, limites
- `AdminPlans.tsx` - Definir planos e limites por tipo

#### 4.3 Novos Componentes Academy Admin
- `AcademyDashboard.tsx` - Dashboard da academia
- `AcademyMembers.tsx` - Gerenciar membros (trainers, nutritionists, students)
- `AcademyInvites.tsx` - Criar e gerenciar convites
- `AcademyContent.tsx` - Conteúdos da academia

#### 4.4 Atualizar Componentes Existentes
- `AuthGuard.tsx` - Verificar contexto de academia quando multi-tenant ativo
- `FeatureFlagsContext.tsx` - Adicionar `is_multi_tenant_enabled`
- Todos os listagens de conteúdo - filtrar por `academy_id` quando aplicável

---

### FASE 5: MIGRAÇÕES SEGURAS E ROLLBACK

#### 5.1 Estratégia de Rollout
1. Criar todas as novas tabelas **SEM** afetar tabelas existentes ✅
2. Adicionar colunas opcionais (`academy_id`, `visibility`) com defaults seguros ✅
3. Implementar funções helper e RLS policies **adicionais** (não substituir) ✅
4. Criar feature flag `multi_tenant_mode_enabled` (default: `false`) ✅
5. Testar em ambiente de staging com feature flag ativada
6. Migração gradual: permitir que academias se cadastrem voluntariamente
7. Manter modo SaaS como padrão até migração completa

#### 5.2 Plano de Rollback
- Todas as mudanças são **aditivas** (não destrutivas)
- Feature flag pode ser desativada a qualquer momento
- Funções helper retornam comportamento legado quando multi-tenant desabilitado
- Colunas opcionais não afetam queries existentes

#### 5.3 Testes Críticos
- [ ] Modo SaaS continua funcionando normalmente (feature flag OFF)
- [ ] Super Admin pode criar academias
- [ ] Academy Admin só vê seus dados (isolamento)
- [ ] Personal Trainer vê apenas seus alunos
- [ ] Conteúdos globais não aparecem em academias
- [ ] Convites funcionam corretamente
- [ ] Billing por academia funciona no Stripe
- [ ] Rollback para modo SaaS funciona

---

## 🚨 PONTOS CRÍTICOS DE ATENÇÃO

1. **Não quebrar o existente**: Todo código legado deve continuar funcionando
2. **Feature flag**: Todo novo comportamento deve ser controlado por feature flag
3. **Performance**: Índices em `academy_id` em todas as tabelas relevantes
4. **RLS**: Garantir isolamento total entre academias
5. **Billing**: Não misturar cobrança de usuários SaaS com academias
6. **Convites**: Validar emails duplicados, expiração, permissões
7. **Multi-Academy**: Personal/Nutricionista pode ter dados em múltiplas academias
8. **Conteúdo Global**: Super Admin cria conteúdo que **não** aparece automaticamente em academias (evitar poluição)

---

## 📅 CRONOGRAMA SUGERIDO

### Sprint 1 (1 semana)
- [ ] Criar novas tabelas (academies, academy_members, invites, professional_academy_links)
- [ ] Adicionar colunas opcionais a tabelas existentes
- [ ] Criar índices

### Sprint 2 (1 semana)
- [ ] Implementar funções helper
- [ ] Criar/atualizar RLS policies
- [ ] Testes unitários de RLS

### Sprint 3 (1 semana)
- [ ] Edge Functions (create-invite, accept-invite)
- [ ] Atualizar Stripe webhook
- [ ] Atualizar create-checkout-session

### Sprint 4 (1 semana)
- [ ] Frontend: AcademyContext
- [ ] Frontend: Componentes Super Admin (academias, planos)
- [ ] Frontend: Componentes Academy Admin (dashboard, membros)

### Sprint 5 (1 semana)
- [ ] Atualizar componentes existentes (filtros, guards)
- [ ] Sistema de convites (UI + fluxo completo)
- [ ] Testes end-to-end

### Sprint 6 (1 semana)
- [ ] Testes de carga e performance
- [ ] Documentação completa
- [ ] Preparação para produção

---

## ✅ CHECKLIST FINAL ANTES DO DEPLOY

- [ ] Feature flag `multi_tenant_mode_enabled` criada e OFF por padrão
- [ ] Todas as migrations são reversíveis
- [ ] RLS testado com múltiplos cenários
- [ ] Billing Stripe testado (test mode)
- [ ] Invites testados (criação, aceitação, expiração)
- [ ] Performance testada com 100+ academias e 10k+ usuários
- [ ] Documentação de API atualizada
- [ ] Testes automatizados passando
- [ ] Rollback plan documentado e testado
- [ ] Usuários de teste criados (Super Admin, Academy Admin, Trainer, Nutritionist, Student)

---

## 📝 NOTAS IMPORTANTES

1. **Backward Compatibility**: CRÍTICO - não quebrar usuários SaaS existentes
2. **Feature Flag**: Tudo novo deve ser opt-in via feature flag
3. **RLS First**: Segurança e isolamento são prioridade #1
4. **Gradual Migration**: Permitir migração gradual de usuários SaaS para academias
5. **Audit Log**: Considerar audit log para ações críticas (mudança de plano, adição de membros)

---

**Status**: 📋 PLANEJAMENTO COMPLETO
**Próximos Passos**: Revisão e aprovação do plano antes de iniciar implementação
**Estimativa Total**: 6 semanas (ajustável conforme prioridades)
