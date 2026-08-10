# 📋 Sprint 3: Edge Functions - Status e Próximos Passos

## ✅ Concluído

### 1. Edge Function: `create-invite`
**Arquivo**: `supabase/functions/create-invite/index.ts`

**Funcionalidades Implementadas**:
- ✅ Validação de permissões (academy admin, personal trainer)
- ✅ Verificação de limites da academia (usa `can_add_academy_member`)
- ✅ Validação de email duplicado
- ✅ Verificação de convites pendentes existentes
- ✅ Criação de registro de convite com token único
- ✅ Expiração automática (7 dias)
- ✅ Logs detalhados para debugging
- ✅ Tratamento de erros estruturado

**Tipos de Convite Suportados**:
- `academy_trainer` - Academy admin convida personal trainer
- `academy_nutritionist` - Academy admin convida nutricionista
- `academy_student` - Academy admin convida aluno
- `academy_content_creator` - Academy admin convida criador de conteúdo
- `trainer_student` - Personal trainer convida aluno

**Validações**:
- Formato de email válido
- Permissões do solicitante
- Limites do plano da academia
- Convites duplicados/expirados
- Membros existentes

**Resposta**:
```typescript
{
  success: boolean;
  code: string;
  message: string;
  invite_id?: string;
  token?: string;
}
```

---

### 2. Edge Function: `accept-invite`
**Arquivo**: `supabase/functions/accept-invite/index.ts`

**Funcionalidades Implementadas**:
- ✅ Validação de token (pendente e não expirado)
- ✅ Criação de usuário se não existir (via Admin API)
- ✅ Auto-confirmação de email para usuários convidados
- ✅ Adição a `academy_members` com role correto
- ✅ Adição de role global em `user_roles`
- ✅ Criação de relacionamento `trainer_students`
- ✅ Atualização de `primary_academy_id`
- ✅ Marcação de convite como aceito
- ✅ Notificação para quem convidou
- ✅ Suporte a usuários existentes e novos

**Fluxo de Aceite**:
1. Validar token e convite
2. Verificar se usuário existe
3. Se não existe: criar usuário (requer senha no request)
4. Processar convite baseado no tipo
5. Adicionar a academia/trainer
6. Atualizar roles
7. Marcar convite como aceito
8. Enviar notificações

**Resposta**:
```typescript
{
  success: boolean;
  code: string;
  message: string;
  user_id?: string;
  academy_id?: string;
  requires_signup?: boolean; // true se usuário precisa fornecer senha
}
```

---

## 🔄 Pendente / Próximos Passos

### 1. Integração com Send-Email Function
**Prioridade**: Alta

**O que fazer**:
- Criar template de email para convites (`invite.html`)
- Integrar `create-invite` com `send-email` function
- Integrar `accept-invite` com `send-email` para boas-vindas

**Template Variables para Convite**:
```typescript
{
  inviter_name: string;
  academy_name?: string;
  trainer_name?: string;
  accept_url: string;
  message?: string; // Mensagem customizada
  invite_type: string;
  expires_at: string;
}
```

---

### 2. Atualizar Stripe Webhook
**Prioridade**: Alta

**Arquivo**: `supabase/functions/stripe-webhook/index.ts`

**Mudanças Necessárias**:

#### A. Suporte a Academias em Checkout
```typescript
// No handleCheckoutCompleted, verificar metadata:
const metadata = session.metadata;
const isAcademyCheckout = metadata.context === 'academy';
const academyId = metadata.academy_id;

if (isAcademyCheckout && academyId) {
  // Criar/atualizar academia em vez de usuário individual
  await createOrUpdateAcademy(supabaseAdmin, {
    academyId,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: subscription.id,
    planType: metadata.plan_type, // starter, professional, enterprise
    // Limites baseados no plano
  });
}
```

#### B. Atualizar Limites de Academia
```typescript
// No handleSubscriptionUpdated
if (metadata.academy_id) {
  const planLimits = getPlanLimits(subscription.items.data[0].price.id);
  
  await supabaseAdmin
    .from('academies')
    .update({
      max_trainers: planLimits.trainers,
      max_nutritionists: planLimits.nutritionists,
      max_students: planLimits.students,
      status: 'active',
    })
    .eq('id', metadata.academy_id);
}
```

#### C. Helper Function: getPlanLimits
```typescript
function getPlanLimits(priceId: string): AcademyLimits {
  // Mapear price_id para limites
  const plans = {
    'price_starter': { trainers: 1, nutritionists: 0, students: 50 },
    'price_professional': { trainers: 5, nutritionists: 2, students: 200 },
    'price_enterprise': { trainers: 20, nutritionists: 10, students: 1000 },
  };
  
  return plans[priceId] || plans['price_starter'];
}
```

---

### 3. Atualizar Create-Checkout-Session
**Prioridade**: Alta

**Arquivo**: `supabase/functions/create-checkout-session/index.ts`

**Mudanças Necessárias**:

#### A. Suporte a Checkout de Academia
```typescript
interface CheckoutRequest {
  // ... campos existentes
  context?: 'user' | 'academy'; // Novo
  academy_id?: string; // Novo
  academy_data?: {
    name: string;
    slug: string;
    owner_email: string;
  }; // Novo
}

// No handler:
if (body.context === 'academy') {
  // Criar checkout para academia
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: body.academy_data.owner_email,
    line_items: [{
      price: body.price_id, // Plan selecionado
      quantity: 1,
    }],
    metadata: {
      context: 'academy',
      academy_id: body.academy_id || 'new',
      academy_name: body.academy_data.name,
      academy_slug: body.academy_data.slug,
      plan_type: body.plan_type,
    },
    success_url: `${body.redirect_url}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: body.redirect_url,
  });
}
```

---

### 4. Criar Migration para Email Templates
**Prioridade**: Média

**O que fazer**:
```sql
-- Adicionar template de convite
INSERT INTO public.email_templates (template_type, subject, body_html, body_text, is_active)
VALUES (
  'invite',
  '{{inviter_name}} convidou você para {{academy_name}}',
  '<html>...</html>', -- Template HTML
  'Você foi convidado...', -- Template texto
  true
);
```

---

### 5. Testes Necessários
**Prioridade**: Alta

**Testes Manuais**:
- [ ] Criar convite como academy admin
- [ ] Criar convite como personal trainer
- [ ] Aceitar convite com usuário existente
- [ ] Aceitar convite criando novo usuário
- [ ] Verificar expiração de convite (7 dias)
- [ ] Verificar limite de membros por academia
- [ ] Verificar convites duplicados
- [ ] Verificar permissões (usuário sem permissão não pode convidar)

**Testes Automatizados** (futuro):
```typescript
// Deno test para Edge Functions
Deno.test("create-invite: academy admin can invite trainer", async () => {
  // ...
});

Deno.test("accept-invite: creates user if not exists", async () => {
  // ...
});
```

---

### 6. Documentação de API
**Prioridade**: Média

**Criar**: `docs/API_INVITES.md`

**Conteúdo**:
- Endpoints das Edge Functions
- Exemplos de request/response
- Códigos de erro
- Fluxo completo (criação -> aceite)

---

## 🛠️ Como Testar Localmente

### 1. Deploy das Edge Functions

```bash
# Deploy create-invite
supabase functions deploy create-invite

# Deploy accept-invite
supabase functions deploy accept-invite

# Verificar logs
supabase functions logs create-invite --tail
supabase functions logs accept-invite --tail
```

### 2. Teste Manual com cURL

**Criar Convite**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-invite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invited_email": "trainer@example.com",
    "invite_type": "academy_trainer",
    "academy_id": "ACADEMY_UUID",
    "target_role": "personal_trainer",
    "message": "Bem-vindo à nossa academia!"
  }'
```

**Aceitar Convite (novo usuário)**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/accept-invite \
  -H "Content-Type: application/json" \
  -d '{
    "token": "INVITE_TOKEN_HERE",
    "user_data": {
      "full_name": "João Silva",
      "password": "senha_segura_123"
    }
  }'
```

**Aceitar Convite (usuário existente)**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/accept-invite \
  -H "Authorization: Bearer EXISTING_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "INVITE_TOKEN_HERE"
  }'
```

---

## 📊 Próximas Sprints

### Sprint 4: Frontend (estimativa: 1 semana)
- [ ] `AcademyContext` - Gerenciar academia ativa
- [ ] `AdminAcademies.tsx` - CRUD de academias
- [ ] `AdminAcademyDetail.tsx` - Detalhes e membros
- [ ] `AcademyDashboard.tsx` - Dashboard da academia
- [ ] `AcademyInvites.tsx` - Criar e gerenciar convites
- [ ] `AcceptInvitePage.tsx` - Página para aceitar convite

### Sprint 5: Integrações (estimativa: 1 semana)
- [ ] Atualizar `AuthGuard` para contexto de academia
- [ ] Filtros de conteúdo por academy
- [ ] Sistema de notificações (convite aceito, novo membro)
- [ ] Testes end-to-end
- [ ] Correções de bugs

### Sprint 6: Polish & Produção (estimativa: 1 semana)
- [ ] Testes de carga
- [ ] Documentação completa
- [ ] Monitoramento e alertas
- [ ] Rollout plan
- [ ] Feature flag: `multi_tenant_mode_enabled` = true

---

## 🚨 Avisos Importantes

1. **Edge Functions usam Service Role**: Tenha cuidado com segurança, sempre validar permissões
2. **Auto-confirmação de email**: Usuários convidados têm email confirmado automaticamente
3. **Convites expiram em 7 dias**: Ajustar se necessário
4. **Limites são checados na criação do convite E no aceite**: Dupla validação
5. **Notificações são best-effort**: Não falhar fluxo se notificação falhar

---

**Status Geral**: 🟡 **Sprint 3: 60% Completa**
**Próximo Passo Crítico**: Integração com send-email e atualização do Stripe webhook
