# Checklist de Validação - Sistema Unificado de Visibilidade

## ✅ FASE 1: VALIDAÇÃO DA MIGRATION

### 1.1 Tabelas Criadas
- [ ] Tabela `workout_plans` existe
- [ ] Tabela `dish_plans` existe
- [ ] Tabela `diet_plan_plans` existe
- [ ] Tabela `challenge_plans` existe
- [ ] Tabela `exercise_plans` existe (já existia)

**Query de Verificação:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_plans'
ORDER BY table_name;
```

### 1.2 Colunas Adicionadas
- [ ] `exercises.visibility_type` existe
- [ ] `workouts.visibility_type` existe
- [ ] `dishes.visibility_type` existe
- [ ] `diet_plans.visibility_type` existe
- [ ] `challenges.visibility_type` existe

**Query de Verificação:**
```sql
SELECT 
    table_name, 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'visibility_type'
ORDER BY table_name;
```

### 1.3 Função Criada
- [ ] Função `can_view_entity_by_plan` existe
- [ ] Função aceita 6 parâmetros corretos
- [ ] Função retorna BOOLEAN

**Query de Verificação:**
```sql
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'can_view_entity_by_plan';
```

### 1.4 RLS Policies Aplicadas
- [ ] Policy "Exercises Visibility Policy" existe
- [ ] Policy "Workouts Visibility Policy" existe
- [ ] Policy "Dishes Visibility Policy" existe
- [ ] Policy "Diet Plans Visibility Policy" existe
- [ ] Policy "Challenges Visibility Policy" existe

**Query de Verificação:**
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%Visibility Policy'
ORDER BY tablename;
```

### 1.5 Índices Criados
- [ ] Índices em `*_plans` tables (workout_id, plan_id)
- [ ] Índices em `visibility_type` columns

**Query de Verificação:**
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE '%_plans_%' OR indexname LIKE '%visibility_type%')
ORDER BY tablename, indexname;
```

---

## ✅ FASE 2: TESTES FUNCIONAIS

### 2.1 Visibilidade Global
**Cenário:** Exercício com `visibility_type = 'global'`

- [ ] **Teste 1:** Usuário sem plano consegue ver
- [ ] **Teste 2:** Usuário com plano básico consegue ver
- [ ] **Teste 3:** Usuário com plano premium consegue ver
- [ ] **Teste 4:** Admin consegue ver

**Query de Teste:**
```sql
-- Criar exercício global
INSERT INTO exercises (name, visibility_type) 
VALUES ('Exercício Global Teste', 'global')
RETURNING id;

-- Verificar visibilidade (executar como diferentes usuários)
SELECT id, name, visibility_type 
FROM exercises 
WHERE name = 'Exercício Global Teste';
```

### 2.2 Visibilidade Plan Restricted (Vazio = Fallback)
**Cenário:** Exercício com `visibility_type = 'plan_restricted'` SEM planos associados

- [ ] **Teste 5:** Usuário sem plano consegue ver (fallback)
- [ ] **Teste 6:** Usuário com qualquer plano consegue ver (fallback)

**Query de Teste:**
```sql
-- Criar exercício plan_restricted sem planos
INSERT INTO exercises (name, visibility_type) 
VALUES ('Exercício Fallback Teste', 'plan_restricted')
RETURNING id;

-- Verificar que NÃO há planos associados
SELECT COUNT(*) FROM exercise_plans WHERE exercise_id = '<id_do_exercicio>';
-- Deve retornar 0

-- Verificar visibilidade
SELECT id, name FROM exercises WHERE name = 'Exercício Fallback Teste';
```

### 2.3 Visibilidade Plan Restricted (Com Planos)
**Cenário:** Exercício com `visibility_type = 'plan_restricted'` COM planos associados

- [ ] **Teste 7:** Usuário SEM plano NÃO vê
- [ ] **Teste 8:** Usuário com plano DIFERENTE NÃO vê
- [ ] **Teste 9:** Usuário com plano CORRESPONDENTE vê
- [ ] **Teste 10:** Usuário com MÚLTIPLOS planos (um correspondente) vê

**Query de Teste:**
```sql
-- Criar exercício plan_restricted
INSERT INTO exercises (name, visibility_type) 
VALUES ('Exercício Premium Teste', 'plan_restricted')
RETURNING id;

-- Associar ao plano Premium
INSERT INTO exercise_plans (exercise_id, plan_id)
VALUES ('<id_do_exercicio>', '<id_plano_premium>');

-- Verificar visibilidade (executar como usuário COM plano premium)
SELECT id, name FROM exercises WHERE name = 'Exercício Premium Teste';
-- Deve retornar 1 linha

-- Verificar visibilidade (executar como usuário SEM plano premium)
SELECT id, name FROM exercises WHERE name = 'Exercício Premium Teste';
-- Deve retornar 0 linhas
```

### 2.4 Visibilidade Academy
**Cenário:** Conteúdo com `visibility_type = 'academy'`

- [ ] **Teste 11:** Membro da academia vê
- [ ] **Teste 12:** Não-membro NÃO vê
- [ ] **Teste 13:** Membro de OUTRA academia NÃO vê

**Query de Teste:**
```sql
-- Criar workout de academia
INSERT INTO workouts (title, visibility_type, academy_id) 
VALUES ('Treino Academia Teste', 'academy', '<id_da_academia>')
RETURNING id;

-- Verificar visibilidade (executar como membro da academia)
SELECT id, title FROM workouts WHERE title = 'Treino Academia Teste';
-- Deve retornar 1 linha

-- Verificar visibilidade (executar como não-membro)
SELECT id, title FROM workouts WHERE title = 'Treino Academia Teste';
-- Deve retornar 0 linhas
```

### 2.5 Visibilidade Private
**Cenário:** Conteúdo com `visibility_type = 'private'`

- [ ] **Teste 14:** Dono vê
- [ ] **Teste 15:** Outro usuário NÃO vê
- [ ] **Teste 16:** Admin vê (override)

**Query de Teste:**
```sql
-- Criar prato privado
INSERT INTO dishes (title, visibility_type, owner_id) 
VALUES ('Prato Privado Teste', 'private', auth.uid())
RETURNING id;

-- Verificar visibilidade (executar como dono)
SELECT id, title FROM dishes WHERE title = 'Prato Privado Teste';
-- Deve retornar 1 linha

-- Verificar visibilidade (executar como outro usuário)
SELECT id, title FROM dishes WHERE title = 'Prato Privado Teste';
-- Deve retornar 0 linhas
```

### 2.6 Admin Override
**Cenário:** Admin deve ver TODO conteúdo

- [ ] **Teste 17:** Admin vê conteúdo global
- [ ] **Teste 18:** Admin vê conteúdo plan_restricted
- [ ] **Teste 19:** Admin vê conteúdo academy
- [ ] **Teste 20:** Admin vê conteúdo private

**Query de Teste:**
```sql
-- Executar como admin
SELECT 
    'exercises' as type, COUNT(*) as total FROM exercises
UNION ALL
SELECT 'workouts', COUNT(*) FROM workouts
UNION ALL
SELECT 'dishes', COUNT(*) FROM dishes
UNION ALL
SELECT 'diet_plans', COUNT(*) FROM diet_plans
UNION ALL
SELECT 'challenges', COUNT(*) FROM challenges;
-- Admin deve ver TODOS os registros
```

---

## ✅ FASE 3: TESTES DE PERFORMANCE

### 3.1 Query Performance
- [ ] **Teste 21:** Listagem de 1000+ exercícios < 500ms
- [ ] **Teste 22:** Filtro por visibilidade usa índice
- [ ] **Teste 23:** Join com `*_plans` não causa N+1

**Query de Teste:**
```sql
EXPLAIN ANALYZE
SELECT 
    e.id,
    e.name,
    e.visibility_type,
    ARRAY_AGG(ep.plan_id) as plan_ids
FROM exercises e
LEFT JOIN exercise_plans ep ON e.id = ep.exercise_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.visibility_type
LIMIT 100;
```

### 3.2 Índices Utilizados
- [ ] **Teste 24:** Query usa `idx_exercises_visibility_type`
- [ ] **Teste 25:** Query usa `idx_exercise_plans_exercise_id`

**Verificar no EXPLAIN ANALYZE acima**

---

## ✅ FASE 4: TESTES DE SEGURANÇA

### 4.1 RLS Enforcement
- [ ] **Teste 26:** Usuário não consegue ver conteúdo restrito via API direta
- [ ] **Teste 27:** Usuário não consegue modificar `visibility_type` de conteúdo alheio
- [ ] **Teste 28:** Usuário não consegue adicionar planos a conteúdo alheio

**Teste Manual:**
```javascript
// Executar no console do navegador (como usuário comum)
const { data, error } = await supabase
  .from('exercises')
  .select('*')
  .eq('visibility_type', 'private')
  .neq('created_by_id', '<meu_user_id>');

console.log('Deve retornar vazio:', data);
```

### 4.2 Injection Protection
- [ ] **Teste 29:** Função `can_view_entity_by_plan` usa EXECUTE format corretamente
- [ ] **Teste 30:** Parâmetros são sanitizados

**Verificar código da função SQL**

---

## ✅ FASE 5: TESTES DE INTEGRAÇÃO FRONTEND

### 5.1 Hook useUnifiedVisibility
- [ ] **Teste 31:** Hook carrega planos corretamente
- [ ] **Teste 32:** `saveVisibilityConfig` atualiza banco
- [ ] **Teste 33:** `getVisibilityConfig` retorna dados corretos

**Teste Manual:**
```typescript
// Em um componente de teste
const { plans, saveVisibilityConfig } = useUnifiedVisibility();

console.log('Planos carregados:', plans);

await saveVisibilityConfig({
  entityType: 'exercise',
  entityId: 'test-id',
  config: {
    visibilityType: 'plan_restricted',
    planIds: ['plan-1', 'plan-2']
  }
});
```

### 5.2 Componente VisibilitySelector
- [ ] **Teste 34:** Renderiza corretamente
- [ ] **Teste 35:** Troca de tipo de visibilidade funciona
- [ ] **Teste 36:** Seleção de planos funciona
- [ ] **Teste 37:** Aviso de fallback aparece quando sem planos
- [ ] **Teste 38:** Disabled state funciona

**Teste Manual:**
```typescript
// Renderizar componente
<VisibilitySelector
  entityType="exercise"
  value={{ visibilityType: 'global', planIds: [] }}
  onChange={(config) => console.log(config)}
/>
```

---

## ✅ FASE 6: TESTES DE EDGE CASES

### 6.1 Dados Inconsistentes
- [ ] **Teste 39:** Exercício sem `visibility_type` usa fallback 'plan_restricted'
- [ ] **Teste 40:** Workout sem `visibility_type` usa fallback 'global'
- [ ] **Teste 41:** Plano deletado remove relacionamentos automaticamente (CASCADE)

**Query de Teste:**
```sql
-- Teste 39
INSERT INTO exercises (name) VALUES ('Sem Visibility Type');
SELECT visibility_type FROM exercises WHERE name = 'Sem Visibility Type';
-- Deve usar default 'plan_restricted'

-- Teste 41
DELETE FROM plans WHERE id = '<id_plano_teste>';
SELECT COUNT(*) FROM exercise_plans WHERE plan_id = '<id_plano_teste>';
-- Deve retornar 0 (CASCADE deletou)
```

### 6.2 Múltiplos Planos
- [ ] **Teste 42:** Usuário com 2 planos vê conteúdo de ambos
- [ ] **Teste 43:** Conteúdo associado a 3 planos é visível para usuários com qualquer um deles

**Query de Teste:**
```sql
-- Criar exercício com múltiplos planos
INSERT INTO exercises (name, visibility_type) 
VALUES ('Exercício Multi-Plano', 'plan_restricted')
RETURNING id;

INSERT INTO exercise_plans (exercise_id, plan_id) VALUES
('<id_exercicio>', '<plano_1>'),
('<id_exercicio>', '<plano_2>'),
('<id_exercicio>', '<plano_3>');

-- Verificar visibilidade (usuário com plano_2)
SELECT id, name FROM exercises WHERE name = 'Exercício Multi-Plano';
-- Deve retornar 1 linha
```

### 6.3 Transições de Estado
- [ ] **Teste 44:** Mudar de 'global' para 'plan_restricted' limpa planos antigos
- [ ] **Teste 45:** Mudar de 'plan_restricted' para 'global' remove associações

**Teste Manual via Hook:**
```typescript
// Mudar de global para plan_restricted
await saveVisibilityConfig({
  entityType: 'exercise',
  entityId: 'test-id',
  config: { visibilityType: 'plan_restricted', planIds: ['plan-1'] }
});

// Mudar de volta para global
await saveVisibilityConfig({
  entityType: 'exercise',
  entityId: 'test-id',
  config: { visibilityType: 'global', planIds: [] }
});

// Verificar que planos foram removidos
const config = await getVisibilityConfig('exercise', 'test-id');
console.log('Plan IDs devem estar vazios:', config.planIds);
```

---

## ✅ FASE 7: TESTES DE COMPATIBILIDADE

### 7.1 Dados Existentes
- [ ] **Teste 46:** Exercícios antigos (sem visibility_type) funcionam
- [ ] **Teste 47:** Dishes com visibility_type antigo funcionam
- [ ] **Teste 48:** Migração não quebrou queries existentes

**Query de Verificação:**
```sql
-- Contar registros com visibility_type NULL
SELECT 
    'exercises' as table_name,
    COUNT(*) as null_visibility
FROM exercises 
WHERE visibility_type IS NULL
UNION ALL
SELECT 'workouts', COUNT(*) FROM workouts WHERE visibility_type IS NULL
UNION ALL
SELECT 'dishes', COUNT(*) FROM dishes WHERE visibility_type IS NULL;
-- Idealmente deve retornar 0 para todos
```

### 7.2 Queries Antigas
- [ ] **Teste 49:** `useAdminContent` hook ainda funciona
- [ ] **Teste 50:** Listagens antigas não quebraram

**Teste Manual:**
Executar aplicação e verificar que:
- Lista de exercícios carrega
- Lista de workouts carrega
- Lista de dishes carrega
- Formulários de edição funcionam

---

## 📊 RESUMO DE VALIDAÇÃO

**Total de Testes:** 50

### Por Categoria:
- ✅ Migration: 5 testes
- ✅ Funcionalidade: 20 testes
- ✅ Performance: 5 testes
- ✅ Segurança: 5 testes
- ✅ Frontend: 8 testes
- ✅ Edge Cases: 5 testes
- ✅ Compatibilidade: 3 testes

### Critério de Aprovação:
- **Mínimo:** 45/50 testes passando (90%)
- **Ideal:** 50/50 testes passando (100%)

### Próximos Passos após Validação:
1. ✅ Todos os testes passaram → Deploy em produção
2. ⚠️ 90-99% passaram → Investigar falhas, corrigir, re-testar
3. ❌ < 90% passaram → Rollback, revisar implementação

---

## 🔧 FERRAMENTAS DE TESTE

### SQL Test Runner
```bash
# Executar todos os testes SQL
psql -U postgres -d flexi_bloom -f tests/visibility_tests.sql
```

### Frontend Test Runner
```bash
# Executar testes de integração
npm run test:integration

# Executar testes E2E
npm run test:e2e
```

### Manual Testing Checklist
Criar usuários de teste:
- [ ] User 1: Sem plano
- [ ] User 2: Plano Básico
- [ ] User 3: Plano Premium
- [ ] User 4: Admin
- [ ] User 5: Membro de Academia A
- [ ] User 6: Membro de Academia B

Testar fluxos:
- [ ] Criar exercício com cada tipo de visibilidade
- [ ] Editar visibilidade de exercício existente
- [ ] Verificar listagem como cada tipo de usuário
- [ ] Tentar acessar conteúdo restrito diretamente via URL

---

**Data de Criação:** 2026-01-18  
**Última Atualização:** 2026-01-18  
**Status:** Pronto para Execução
