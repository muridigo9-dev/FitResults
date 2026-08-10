# 📚 Documentação - Sistema Unificado de Visibilidade

## 🎯 Visão Geral

Este diretório contém toda a documentação do **Sistema Unificado de Visibilidade por Plano**, implementado em 2026-01-18.

---

## 📖 Índice de Documentos

### 1. 🚀 [Quick Start Guide](./VISIBILITY_QUICK_START.md)
**Comece aqui!** Guia de implementação rápida em 5 minutos.

**Conteúdo:**
- ⚡ Quick Start (5 min)
- 📝 Exemplos básicos de uso
- 🔍 Queries úteis
- 🐛 Troubleshooting

**Quando usar:** Primeira implementação ou referência rápida.

---

### 2. 📋 [Proposta Técnica Completa](./UNIFIED_VISIBILITY_PROPOSAL.md)
Análise arquitetural detalhada e justificativa da solução.

**Conteúdo:**
- 🔍 Auditoria do código atual
- 📊 Comparação de abordagens (Opção A vs B)
- 🏗️ Proposta de implementação
- 📈 Roadmap de 3 sprints
- ⚠️ Riscos e mitigações

**Quando usar:** Entender decisões arquiteturais ou propor mudanças.

---

### 3. ✅ [Checklist de Validação](./VISIBILITY_VALIDATION_CHECKLIST.md)
50 testes organizados em 7 fases para validar a implementação.

**Conteúdo:**
- ✅ Testes de Migration (5 testes)
- ✅ Testes Funcionais (20 testes)
- ✅ Testes de Performance (5 testes)
- ✅ Testes de Segurança (5 testes)
- ✅ Testes de Frontend (8 testes)
- ✅ Testes de Edge Cases (5 testes)
- ✅ Testes de Compatibilidade (3 testes)

**Quando usar:** Validar implementação antes de deploy.

---

### 4. 📦 [Sumário de Implementação](./IMPLEMENTATION_SUMMARY.md)
Resumo executivo de tudo que foi implementado.

**Conteúdo:**
- ✅ Status da implementação
- 📦 Arquivos criados
- 🎯 O que foi implementado
- 📊 Impacto e benefícios
- 🔧 Arquitetura
- 🎓 Lições aprendidas
- 🔮 Roadmap futuro

**Quando usar:** Apresentar o projeto ou onboarding de novos devs.

---

### 5. 🔧 [Guia de Integração useAdminContent](./USEADMINCONTENT_INTEGRATION_GUIDE.md)
Como integrar o sistema no hook useAdminContent.ts existente.

**Conteúdo:**
- 📝 Mudanças necessárias passo a passo
- 🔄 Exemplos antes/depois
- 📋 Padrões para todos os domínios
- ✅ Checklist de integração

**Quando usar:** Integrar o sistema em hooks/componentes existentes.

---

### 6. 📊 [Esquema do Banco de Dados](./DATABASE_SCHEMA.md)
Documentação completa do schema do banco de dados.

**Conteúdo:**
- 📋 Tabelas principais
- 🔗 Relacionamentos
- 📝 Colunas e tipos
- 🔒 RLS Policies

**Quando usar:** Referência de schema ou criar novas migrations.

---

## 🗂️ Estrutura de Arquivos

```
docs/
├── README.md                              # Este arquivo
├── VISIBILITY_QUICK_START.md              # ⚡ Guia rápido (5 min)
├── UNIFIED_VISIBILITY_PROPOSAL.md         # 📋 Proposta técnica completa
├── VISIBILITY_VALIDATION_CHECKLIST.md     # ✅ 50 testes de validação
├── IMPLEMENTATION_SUMMARY.md              # 📦 Sumário executivo
├── USEADMINCONTENT_INTEGRATION_GUIDE.md   # 🔧 Guia de integração
└── DATABASE_SCHEMA.md                     # 📊 Schema do banco
```

---

## 🚀 Fluxo de Trabalho Recomendado

### Para Novos Desenvolvedores

1. **Entender o Sistema**
   - Ler: [Sumário de Implementação](./IMPLEMENTATION_SUMMARY.md)
   - Ler: [Proposta Técnica](./UNIFIED_VISIBILITY_PROPOSAL.md)

2. **Implementar**
   - Seguir: [Quick Start Guide](./VISIBILITY_QUICK_START.md)
   - Consultar: [Guia de Integração](./USEADMINCONTENT_INTEGRATION_GUIDE.md)

3. **Validar**
   - Executar: [Checklist de Validação](./VISIBILITY_VALIDATION_CHECKLIST.md)

### Para Manutenção

1. **Referência Rápida**
   - Consultar: [Quick Start Guide](./VISIBILITY_QUICK_START.md)
   - Consultar: [Database Schema](./DATABASE_SCHEMA.md)

2. **Troubleshooting**
   - Verificar: Seção de troubleshooting no [Quick Start](./VISIBILITY_QUICK_START.md)
   - Executar: Testes relevantes do [Checklist](./VISIBILITY_VALIDATION_CHECKLIST.md)

### Para Novas Features

1. **Planejamento**
   - Revisar: [Proposta Técnica](./UNIFIED_VISIBILITY_PROPOSAL.md)
   - Consultar: Roadmap no [Sumário](./IMPLEMENTATION_SUMMARY.md)

2. **Implementação**
   - Seguir padrões do [Guia de Integração](./USEADMINCONTENT_INTEGRATION_GUIDE.md)
   - Atualizar: [Database Schema](./DATABASE_SCHEMA.md) se necessário

3. **Validação**
   - Adicionar testes ao [Checklist](./VISIBILITY_VALIDATION_CHECKLIST.md)

---

## 📚 Recursos Adicionais

### Código Fonte

**Backend (SQL):**
- 🗄️ Migration: `supabase/migrations/20260118000001_unified_visibility_system.sql`

**Frontend (TypeScript/React):**
- 🎣 Hook: `src/hooks/useUnifiedVisibility.ts`
- 🎨 Componente: `src/components/admin/VisibilitySelector.tsx`
- 💡 Exemplos: `src/components/admin/VisibilitySelector.examples.tsx`

### Exemplos de Uso

Veja 10 exemplos práticos em:
- 📁 `src/components/admin/VisibilitySelector.examples.tsx`

Exemplos incluem:
1. State Management
2. Handler para mudanças
3. Salvar com visibilidade
4. Carregar visibilidade existente
5. Versão compacta
6. Integração com hooks existentes
7. Validação
8. Buscar entidades visíveis
9. Aplicar em outros domínios
10. Resumo de integração

---

## 🎯 Conceitos Principais

### Tipos de Visibilidade

| Tipo | Descrição | Quem Vê? |
|------|-----------|----------|
| **global** | Conteúdo público | TODOS os usuários |
| **academy** | Conteúdo de academia | Apenas membros da academia |
| **private** | Conteúdo privado | Apenas o criador |
| **plan_restricted** | Restrito por plano | Usuários com planos específicos |

### Regra Especial: Fallback

Quando `visibility_type = 'plan_restricted'` **MAS** não há planos associados:
- ✅ Conteúdo é visível para **TODOS** (comportamento fallback)
- ⚠️ Aviso é mostrado no UI para evitar confusão

### Domínios Suportados

- ✅ **Exercises** (padrão: `plan_restricted`)
- ✅ **Workouts** (padrão: `global`)
- ✅ **Dishes** (padrão: `global`)
- ✅ **Diet Plans** (padrão: `global`)
- ✅ **Challenges** (padrão: `global`)

---

## 🔒 Segurança

### RLS Policies

Todas as entidades possuem RLS policies que utilizam a função centralizada:

```sql
CREATE POLICY "Entity Visibility Policy" ON public.entities
FOR SELECT TO authenticated
USING (
    public.can_view_entity_by_plan(
        'entity_type',
        id,
        visibility_type,
        academy_id,
        owner_id,
        auth.uid()
    )
);
```

### Hierarquia de Permissões

1. **Admin**: Vê TUDO (override)
2. **Global**: Todos veem
3. **Academy**: Apenas membros
4. **Private**: Apenas dono
5. **Plan Restricted**: Apenas com plano correspondente

---

## ⚡ Performance

### Índices Criados

Todos os domínios possuem índices otimizados:

```sql
-- Índices em tabelas de relacionamento
CREATE INDEX idx_entity_plans_entity_id ON entity_plans(entity_id);
CREATE INDEX idx_entity_plans_plan_id ON entity_plans(plan_id);

-- Índices em visibility_type
CREATE INDEX idx_entities_visibility_type ON entities(visibility_type) 
WHERE is_active = true;
```

### Queries Otimizadas

- ✅ Uso de `ARRAY_AGG` para agregação
- ✅ `COALESCE` para fallback sem overhead
- ✅ Índices parciais (`WHERE is_active = true`)
- ✅ Função `SECURITY DEFINER` com `search_path` seguro

---

## 🧪 Testes

### Executar Todos os Testes

```bash
# Testes SQL (backend)
psql -U postgres -d flexi_bloom -f tests/visibility_tests.sql

# Testes TypeScript (frontend)
npm run test:integration

# Testes E2E
npm run test:e2e
```

### Testes Manuais

Criar usuários de teste:
- User 1: Sem plano
- User 2: Plano Básico
- User 3: Plano Premium
- User 4: Admin
- User 5: Membro de Academia A

Testar fluxos:
- Criar conteúdo com cada tipo de visibilidade
- Verificar listagem como cada tipo de usuário
- Tentar acessar conteúdo restrito

---

## 📞 Suporte

### Problemas Comuns

**1. Usuário não vê conteúdo esperado**
- Verificar `visibility_type` do conteúdo
- Verificar planos associados
- Verificar plano ativo do usuário

**2. Erro ao salvar visibilidade**
- Verificar se migration foi aplicada
- Verificar permissões RLS
- Verificar se usuário é admin

**3. Performance lenta**
- Verificar se índices existem
- Executar `ANALYZE` nas tabelas
- Verificar query plan

### Onde Buscar Ajuda

1. **Documentação**: Consulte os documentos listados acima
2. **Exemplos**: Veja `VisibilitySelector.examples.tsx`
3. **Troubleshooting**: Seção no [Quick Start](./VISIBILITY_QUICK_START.md)
4. **Issues**: GitHub Issues
5. **Discussões**: GitHub Discussions

---

## 🎓 Aprendizado

### Recursos Educacionais

**Conceitos Importantes:**
- Row Level Security (RLS) no PostgreSQL
- Multi-tenancy em SaaS
- Visibilidade por plano de assinatura
- React Hooks customizados
- TypeScript generics

**Leitura Recomendada:**
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)

---

## 🔄 Atualizações

### Histórico de Versões

**v1.0 (2026-01-18)**
- ✅ Implementação inicial completa
- ✅ Suporte para 5 domínios
- ✅ 4 tipos de visibilidade
- ✅ Documentação completa
- ✅ 50 testes de validação

### Próximas Versões

**v1.1 (Planejado)**
- Cache de visibilidade
- Audit log de mudanças
- Bulk operations
- Preview de visibilidade

**v2.0 (Futuro)**
- Múltiplos planos por usuário
- Herança de planos
- Visibilidade por região
- Visibilidade time-based

---

## ✅ Checklist Rápido

### Antes de Começar
- [ ] Ler [Sumário de Implementação](./IMPLEMENTATION_SUMMARY.md)
- [ ] Ler [Quick Start Guide](./VISIBILITY_QUICK_START.md)

### Durante Implementação
- [ ] Aplicar migration SQL
- [ ] Integrar hook `useUnifiedVisibility`
- [ ] Adicionar `VisibilitySelector` aos formulários
- [ ] Atualizar tipos TypeScript

### Após Implementação
- [ ] Executar [Checklist de Validação](./VISIBILITY_VALIDATION_CHECKLIST.md)
- [ ] Testar manualmente com diferentes usuários
- [ ] Validar performance
- [ ] Deploy em staging
- [ ] Coletar feedback
- [ ] Deploy em produção

---

## 🎉 Conclusão

Esta documentação fornece tudo que você precisa para:
- ✅ Entender o sistema
- ✅ Implementar corretamente
- ✅ Validar a implementação
- ✅ Manter e evoluir o sistema

**Comece pelo [Quick Start Guide](./VISIBILITY_QUICK_START.md)!**

---

**Última Atualização:** 2026-01-18  
**Versão da Documentação:** 1.0  
**Mantido por:** Equipe FlexiBloom
