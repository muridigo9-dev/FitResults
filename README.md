# FitWell - Fitness & Nutrition Tracker

Aplicativo SaaS de acompanhamento de hábitos, nutrição e treinos com gamificação.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| Backend | Supabase (Auth, DB, RLS, Edge Functions) |
| Pagamentos | Stripe (Checkout, Webhooks, Subscriptions) |
| E-mails | Resend |
| Charts | Recharts |

---

## Variáveis de Ambiente

### Frontend (`.env`)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PWA Push Notifications (opcional)
VITE_VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxx
```

### Supabase Edge Functions (Secrets)

Configure em **Supabase Dashboard > Settings > Edge Functions > Secrets**:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxx ou sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Resend (opcional - pode ser configurado via Admin Panel)
RESEND_API_KEY=re_xxxx

# Push Notifications (opcional)
VAPID_PRIVATE_KEY=xxxxx
VAPID_PUBLIC_KEY=BNxxxxx
```

### GitHub Secrets (CI/CD)

```bash
SUPABASE_PROJECT_ID=your-project-ref
SUPABASE_ACCESS_TOKEN=sbp_xxxx
SUPABASE_DB_PASSWORD=your-db-password
```

---

## Fluxo de Deploy Completo

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote o **Project URL** e **anon key** (Settings > API)
3. Configure as variáveis de ambiente no frontend

### 2. Rodar Migrations

```bash
# Via CLI
npx supabase db push

# Ou via GitHub Actions (automático ao fazer push)
```

**Ordem das migrations importantes:**
1. `initial_schema.sql` - Tabelas base (profiles, etc)
2. `rls_base.sql` - Funções `is_admin()`, `has_role()`
3. `stripe_subscription_system.sql` - Sistema de assinaturas
4. `email_system.sql` - Templates de e-mail

### 3. Criar Admin Inicial

Rode o workflow **Deploy Database (Supabase) + Bootstrap Test Users**
(`db-main.yml`) pelo GitHub Actions. Ele cria as contas iniciais pela Auth Admin
API usando o `SUPABASE_SERVICE_ROLE_KEY` guardado nos secrets do repositório, e
a migration `20260101000023_provision_default_admin.sql` concede o papel
`admin` a `admin@admin.com`.

A senha inicial vem do workflow e todas as contas nascem com
`must_change_password: true`.

⚠️ **Altere a senha imediatamente após o primeiro login.**

> Isto já foi feito por uma edge function `provision-admin` sem nenhuma
> verificação de autenticação: qualquer POST anônimo criava um `admin@admin.com`
> com senha fixa no repositório. A função foi removida. Bootstrap de contas
> privilegiadas roda no CI, com a service role key, nunca num endpoint público.

### 4. Configurar Stripe

#### 4.1 Obter Chaves

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers > API keys**
3. Copie a **Secret key** (começa com `sk_test_` ou `sk_live_`)

#### 4.2 Configurar Webhook

1. Vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Selecione os eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** (começa com `whsec_`)

#### 4.3 Salvar Secrets no Supabase

1. Vá em **Supabase Dashboard > Settings > Edge Functions > Secrets**
2. Adicione:
   - `STRIPE_SECRET_KEY` = sua secret key
   - `STRIPE_WEBHOOK_SECRET` = seu signing secret

### 5. Configurar Resend (E-mails)

1. Crie conta em [resend.com](https://resend.com)
2. Vá em **API Keys** e crie uma nova key
3. No app, acesse **Admin Panel > E-mails**
4. Cole a API Key e configure o remetente

**Para produção:**
- Verifique seu domínio no Resend
- Configure o sender email com seu domínio verificado

### 6. Deploy Frontend

```bash
# Build
npm run build

# O projeto está pronto para deploy em:
# - Vercel
# - Netlify
# - Cloudflare Pages
```

### 7. Testes Finais

- [ ] Acessar landing page (`/`)
- [ ] Fazer login com admin (`admin@admin.com`)
- [ ] Verificar acesso ao painel admin (`/admin`)
- [ ] Testar checkout com cartão de teste Stripe
- [ ] Verificar webhook no Stripe Dashboard
- [ ] Testar envio de e-mail

---

## Fluxo de Autenticação

```
Usuário acessa o app
        │
        ▼
    É rota pública?  ──(Sim)──► Renderiza normalmente
    (/, /auth, /checkout)       (sem verificações)
        │
       (Não)
        │
        ▼
    Está autenticado? ──(Não)──► Redireciona para /auth
        │
       (Sim)
        │
        ▼
    É admin? ──────────(Sim)──► Acesso total (bypass subscription)
        │
       (Não)
        │
        ▼
    Rota requer assinatura?
        │
       (Sim)
        │
        ▼
    Tem assinatura ativa? ──(Não)──► Redireciona para /reactivate
        │
       (Sim)
        │
        ▼
    Renderiza conteúdo protegido
```

### Rotas Públicas (sem auth)
- `/` - Landing page
- `/auth` - Login/Signup
- `/checkout` - Seleção de planos
- `/checkout/success` - Confirmação de pagamento
- `/install` - Instalação PWA

### Rotas Autenticadas (sem subscription)
- `/reactivate` - Reativação de assinatura

### Rotas Protegidas (auth + subscription)
- `/dashboard` - Dashboard principal
- `/checkin` - Check-in diário
- `/progress` - Progresso
- `/profile/*` - Perfil do usuário
- `/diets/*`, `/workouts/*`, `/challenges/*` - Conteúdo

### Rotas Admin (auth, bypass subscription)
- `/admin/*` - Painel administrativo

---

## Fluxo de Assinatura

```
1. Usuário seleciona plano (/checkout)
        │
        ▼
2. Edge function create-checkout-session
   cria sessão no Stripe
        │
        ▼
3. Usuário preenche dados de pagamento
   no Stripe Checkout
        │
        ▼
4. Stripe processa pagamento
        │
        ▼
5. Webhook checkout.session.completed
   é disparado para edge function
        │
        ▼
6. Edge function stripe-webhook:
   - Cria profile (se não existe)
   - Define subscription_status = "active"
   - Salva stripe_customer_id e subscription_id
        │
        ▼
7. Usuário é redirecionado para /dashboard
   com acesso liberado
```

### Estados de Assinatura

| subscription_status | account_status | Comportamento |
|---------------------|----------------|---------------|
| `active` | `active` | Acesso total |
| `trialing` | `active` | Acesso total (período trial) |
| `past_due` | `active` | Redireciona para /reactivate |
| `cancelled` | `cancelled` | Acesso bloqueado |
| `null` | `pending` | Redireciona para /checkout |

### Admin

Admins **nunca** são bloqueados por subscription. A role `admin` em `user_roles` garante acesso total.

---

## Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Políticas principais:

```sql
-- Usuário vê apenas seus dados
CREATE POLICY "Users see own data" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin vê tudo
CREATE POLICY "Admins see all" ON profiles
  FOR ALL USING (public.is_admin());
```

### Funções de Segurança

```sql
-- Verifica se usuário é admin
public.is_admin() → boolean

-- Verifica se usuário tem role específica
public.has_role(user_id uuid, role app_role) → boolean

-- Verifica assinatura ativa
public.has_active_subscription(user_id uuid) → boolean
```

### Webhooks Verificados

O Stripe webhook verifica a assinatura de cada evento:

```typescript
const signature = req.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

### Sanitização de HTML

Templates de e-mail usam DOMPurify para sanitização:

```typescript
import DOMPurify from "dompurify";
const safeHtml = DOMPurify.sanitize(htmlContent);
```

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── admin/          # Componentes do painel admin
│   ├── checkin/        # Wizard de check-in diário
│   ├── dashboard/      # Cards do dashboard
│   ├── layout/         # AppLayout, AuthGuard, Sidebar
│   ├── progress/       # Gráficos de progresso
│   └── ui/             # shadcn/ui components
├── contexts/           # React contexts (Auth, Theme, etc)
├── hooks/              # Custom hooks
├── pages/
│   ├── admin/          # Páginas do painel admin
│   └── profile/        # Páginas de perfil
├── lib/                # Utilitários e helpers
└── integrations/       # Supabase client

supabase/
├── functions/          # Edge functions
│   ├── create-checkout-session/
│   ├── stripe-webhook/
│   └── send-email/
├── schema/             # SQL schemas (referência)
└── migrations/         # Migrations ordenadas
```

---

## Troubleshooting

### "Sua assinatura expirou"

1. Verifique se o webhook está configurado corretamente no Stripe
2. Verifique os logs da edge function `stripe-webhook`
3. Confirme que `STRIPE_WEBHOOK_SECRET` está correto

### Admin não consegue acessar

1. Verifique se existe registro em `user_roles` com `role = 'admin'`
2. Rode novamente o workflow `db-main.yml`, que reaplica as migrations de
   bootstrap e reconcilia perfil e papel da conta
3. Confirme que o email é exatamente `admin@admin.com`

### Emails não chegam

1. Verifique a API Key do Resend no Admin Panel
2. Em produção, verifique se o domínio está verificado
3. Consulte os logs em Admin Panel > E-mails > Métricas

### Webhook não processa

1. Verifique se a URL está correta no Stripe Dashboard
2. Confirme os eventos selecionados
3. Teste com `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

---

## Notas Importantes

- ⚠️ **Nunca commite `.env`** - use `.env.example` como referência
- ⚠️ **Altere a senha do admin** após primeiro login
- ⚠️ **Cada fork precisa de suas próprias chaves** (Stripe, Resend, VAPID)
- ⚠️ **Em produção**, use modo live do Stripe e domínio verificado no Resend

---

## Licença

© 2024 FitWell. Todos os direitos reservados.
