# 🧪 Testes - Flexi Bloom Core

Este diretório contém testes unitários e E2E para o sistema multi-tenant.

## 📁 Estrutura

```
tests/
├── e2e/                          # Testes End-to-End
│   └── invite-flow.test.ts       # Fluxo completo de convites
│
supabase/functions/
├── create-invite/
│   └── create-invite.test.ts     # Testes unitários da Edge Function
└── accept-invite/
    └── accept-invite.test.ts     # Testes unitários da Edge Function
```

## 🚀 Executando os Testes

### Pré-requisitos

1. **Supabase CLI instalado**:
```bash
npm install -g supabase
```

2. **Projeto Supabase inicializado localmente**:
```bash
supabase init
supabase start
```

3. **Migrations aplicadas**:
```bash
supabase db push
```

4. **Variáveis de ambiente configuradas**:
```bash
# .env.test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_URL=http://localhost:5173
```

### Testes Unitários (Edge Functions)

#### create-invite
```bash
cd supabase/functions/create-invite
deno test --allow-net --allow-env create-invite.test.ts
```

**Testes incluídos**:
- ✅ Falha sem autorização
- ✅ Falha com campos faltando
- ✅ Falha com email inválido
- ✅ Academy admin pode criar convite para trainer
- ✅ Personal trainer pode criar convite para aluno
- ✅ Previne convites duplicados pendentes
- ✅ Respeita limites de membros da academia

#### accept-invite
```bash
cd supabase/functions/accept-invite
deno test --allow-net --allow-env accept-invite.test.ts
```

**Testes incluídos**:
- ✅ Falha sem token
- ✅ Falha com token inválido
- ✅ Requer dados de signup para novo usuário
- ✅ Cria usuário e aceita convite
- ✅ Falha para convite já aceito
- ✅ Falha para convite expirado
- ✅ Vincula usuário existente à academia
- ✅ Cria relacionamento trainer-student

### Testes E2E

```bash
cd tests/e2e
deno test --allow-net --allow-env invite-flow.test.ts
```

**Cenários incluídos**:
- 🎬 **Academy invites trainer**: Fluxo completo desde criação da academia até trainer aceitar e fazer login
- 🎬 **Trainer invites student**: Personal trainer convida aluno e estabelece relacionamento

### Executar Todos os Testes

```bash
# No root do projeto
./scripts/run-all-tests.sh
```

Ou manualmente:
```bash
# Unit tests
deno test --allow-net --allow-env supabase/functions/create-invite/create-invite.test.ts
deno test --allow-net --allow-env supabase/functions/accept-invite/accept-invite.test.ts

# E2E tests
deno test --allow-net --allow-env tests/e2e/invite-flow.test.ts
```

## 📊 Cobertura de Testes

### Edge Functions
- **create-invite**: 8 testes unitários
- **accept-invite**: 9 testes unitários
- **Total**: 17 testes unitários

### E2E
- 2 cenários completos
- 30+ asserções por cenário

### Cobertura de Funcionalidades

| Funcionalidade | Unit Tests | E2E Tests |
|----------------|------------|-----------|
| Validação de permissões | ✅ | ✅ |
| Criação de convites | ✅ | ✅ |
| Limites de academia | ✅ | ✅ |
| Convites duplicados | ✅ | ❌ |
| Convites expirados | ✅ | ❌ |
| Aceite de convite (novo usuário) | ✅ | ✅ |
| Aceite de convite (usuário existente) | ✅ | ❌ |
| Relacionamento trainer-student | ✅ | ✅ |
| Notificações | ❌ | ❌ |
| Email de convite | ❌ | ❌ |

## 🐛 Debugging

### Logs em Tempo Real

Terminal 1 - Logs da Edge Function:
```bash
supabase functions logs create-invite --tail
```

Terminal 2 - Executar testes:
```bash
deno test --allow-net --allow-env supabase/functions/create-invite/create-invite.test.ts
```

### Inspecionar Banco de Dados

Durante os testes:
```bash
# Conectar ao PostgreSQL local
supabase db connect

# Queries úteis
SELECT * FROM invites ORDER BY created_at DESC LIMIT 10;
SELECT * FROM academy_members WHERE academy_id = 'YOUR_TEST_ACADEMY_ID';
SELECT * FROM user_roles WHERE user_id = 'YOUR_TEST_USER_ID';
```

### Reset do Banco de Dados Local

Se os testes deixarem dados órfãos:
```bash
supabase db reset
```

## 🔧 Configuração de CI/CD

### GitHub Actions

Criar `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Start Supabase
        run: supabase start
      
      - name: Apply migrations
        run: supabase db push
      
      - name: Run unit tests
        run: |
          deno test --allow-net --allow-env supabase/functions/create-invite/create-invite.test.ts
          deno test --allow-net --allow-env supabase/functions/accept-invite/accept-invite.test.ts
      
      - name: Run E2E tests
        run: deno test --allow-net --allow-env tests/e2e/invite-flow.test.ts
```

## 📝 Adicionando Novos Testes

### Template de Teste Unitário

```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test({
  name: "feature: should do something",
  async fn() {
    // Arrange
    const input = "test";
    
    // Act
    const result = await myFunction(input);
    
    // Assert
    assertEquals(result, "expected");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

### Template de Teste E2E

```typescript
Deno.test({
  name: "E2E: Complete user journey",
  async fn() {
    console.log("\n📋 SCENARIO: User completes action X\n");

    // STEP 1: Setup
    console.log("1️⃣ Setting up...");
    // ... setup code

    // STEP 2: Action
    console.log("\n2️⃣ Performing action...");
    // ... action code

    // STEP 3: Verify
    console.log("\n3️⃣ Verifying results...");
    // ... assertions

    // CLEANUP
    console.log("\n🧹 Cleaning up...");
    // ... cleanup code

    console.log("🎉 E2E TEST PASSED!\n");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

## 🎯 Melhores Práticas

1. **Isolamento**: Cada teste deve criar seus próprios dados e limpar no final
2. **Nomenclatura**: Use nomes descritivos `"feature: should do X when Y"`
3. **Asserções**: Use asserções específicas (`assertEquals` vs `assert`)
4. **Cleanup**: Sempre limpe dados de teste, mesmo se o teste falhar
5. **Logs**: Use `console.log` para facilitar debugging
6. **Performance**: Testes devem rodar em < 30 segundos cada

## 📚 Recursos

- [Deno Testing](https://deno.land/manual/testing)
- [Supabase Functions Testing](https://supabase.com/docs/guides/functions/unit-test)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

**Mantido por**: Equipe Flexi Bloom
**Última atualização**: 2026-01-13
