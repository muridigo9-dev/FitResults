# 🎭 Mapeamento Completo de Roles do Sistema

## 📅 Data: 13 de Janeiro de 2026

---

## 📋 Roles Existentes

### 1. ⚡ `admin` (SUPER ADMIN)
**Descrição:** Administrador supremo do sistema com acesso total.

**Permissões:**
- ✅ Acesso total ao painel administrativo
- ✅ Gerenciar todos os usuários
- ✅ Gerenciar todas as feature flags
- ✅ Gerenciar configurações globais do sistema
- ✅ Criar/editar/excluir qualquer conteúdo (dietas, treinos, desafios, hábitos)
- ✅ Ver estatísticas globais
- ✅ Gerenciar academias
- ✅ Gerenciar assinaturas
- ✅ Gerenciar LGPD requests
- ✅ Aprovar/negar content creators
- ✅ Acesso a todos os logs e auditorias

**Feature Flags:**
- Todos habilitados

**Assinatura:**
- ❌ Não requer assinatura

**Limitações:**
- ✅ Pode criar conteúdo global
- ✅ Pode visualizar todos os alunos
- ✅ Pode ser vinculado a academias (opcional)
- ⚠️ **NÃO pode ser excluído** (proteção do sistema)

**Tela Inicial:** `/admin`

---

### 2. 👤 `user` (Usuário Comum)
**Descrição:** Usuário final padrão do aplicativo.

**Permissões:**
- ✅ Acessar dashboard pessoal
- ✅ Fazer check-ins diários
- ✅ Ver dietas, treinos e desafios atribuídos
- ✅ Registrar progresso (peso, medidas, fotos)
- ✅ Participar de desafios
- ✅ Ver ranking da comunidade
- ✅ Gerenciar hábitos pessoais
- ❌ Criar conteúdo
- ❌ Ver outros usuários
- ❌ Acesso ao painel admin

**Feature Flags:**
- Depende das flags ativas do sistema

**Assinatura:**
- ✅ Requer assinatura ativa
- ⚠️ Sem assinatura: redirecionado para `/reactivate`

**Limitações:**
- ❌ Não pode criar conteúdo
- ❌ Não pode visualizar outros alunos
- ❌ Não pode ser vinculado a academias (exceto como student)
- ✅ Pode ser excluído

**Tela Inicial:** `/dashboard`

---

### 3. 🏋️ `personal_trainer` (Personal Trainer)
**Descrição:** Personal trainer que gerencia alunos e cria conteúdo personalizado.

**Permissões:**
- ✅ Criar/editar conteúdo personalizado (dietas, treinos)
- ✅ Ver seus alunos (students)
- ✅ Atribuir conteúdo aos alunos
- ✅ Ver progresso dos alunos
- ✅ Criar grupos de alunos
- ✅ Gerenciar check-ins dos alunos
- ✅ Chat com alunos
- ❌ Acesso ao painel admin global
- ❌ Ver usuários fora do seu escopo

**Feature Flags:**
- `personal_trainer_mode_enabled` (obrigatório)
- `enable_personal_trainer_chat` (opcional)

**Assinatura:**
- ✅ Requer assinatura ativa (ou vinculo com academia)
- ⚠️ Modo: individual ou vinculado a academia

**Limitações:**
- ✅ Pode criar conteúdo (limitado aos seus alunos)
- ✅ Pode visualizar apenas seus alunos
- ✅ Pode ser vinculado a múltiplas academias (depende do plano da academia)
- ✅ Pode ser excluído
- ⚠️ Ao excluir: conteúdo é reassociado ao admin da academia ou mantido como global

**Vínculo com Academia:**
- Pode ser `trainer` em `academy_members`
- Status: `active`, `inactive`, `suspended`, `pending_invite`

**Tela Inicial:** `/trainer/dashboard`

---

### 4. 🥗 `nutritionist` (Nutricionista)
**Descrição:** Nutricionista que cria dietas e acompanha alunos.

**Permissões:**
- ✅ Criar/editar dietas personalizadas
- ✅ Ver seus alunos
- ✅ Atribuir dietas aos alunos
- ✅ Ver histórico nutricional dos alunos
- ✅ Calcular macros personalizados
- ❌ Criar treinos
- ❌ Acesso ao painel admin global

**Feature Flags:**
- `personal_trainer_mode_enabled` (obrigatório)
- Pode compartilhar flags do personal trainer

**Assinatura:**
- ✅ Requer assinatura ativa (ou vinculo com academia)

**Limitações:**
- ✅ Pode criar conteúdo (limitado a dietas)
- ✅ Pode visualizar apenas seus alunos
- ✅ Pode ser vinculado a múltiplas academias (depende do plano)
- ✅ Pode ser excluído
- ⚠️ Ao excluir: dietas são reassociadas

**Vínculo com Academia:**
- Pode ser `nutritionist` em `academy_members`

**Tela Inicial:** `/nutritionist/dashboard` (ou compartilha com trainer)

---

### 5. 🏢 `academy_admin` (Administrador de Academia)
**Descrição:** Administrador de uma academia (owner ou admin).

**Permissões:**
- ✅ Gerenciar membros da academia (trainers, nutritionists, students)
- ✅ Criar e gerenciar convites
- ✅ Ver estatísticas da academia
- ✅ Configurar branding da academia
- ✅ Gerenciar plano e assinatura da academia
- ✅ Definir permissões de trainers/nutricionists
- ✅ Ver todos os alunos da academia
- ❌ Acesso ao painel admin global
- ❌ Gerenciar outras academias

**Feature Flags:**
- `academy_mode_enabled` (obrigatório)
- `enable_multi_academy` (para multi-academias)

**Assinatura:**
- ✅ Academia precisa ter assinatura ativa
- Planos: `starter`, `professional`, `enterprise`

**Limitações:**
- ✅ Pode criar conteúdo (limitado à academia)
- ✅ Pode visualizar todos os membros da academia
- ✅ Pode gerenciar uma ou múltiplas academias (depende do role)
- ✅ Pode ser excluído
- ⚠️ Ao excluir: academia pode ficar sem owner (validação necessária)

**Vínculo com Academia:**
- Pode ser `owner` ou `admin` em `academy_members`
- `owner`: criador da academia, não pode ser removido
- `admin`: administrador delegado, pode ser removido

**Tela Inicial:** `/academy/dashboard`

---

### 6. 🏢🏢 `multi_academy_admin` (Administrador Multi-Academia)
**Descrição:** Administrador que gerencia múltiplas academias (redes).

**Permissões:**
- ✅ Todas as permissões de `academy_admin`
- ✅ Gerenciar múltiplas academias
- ✅ Ver estatísticas consolidadas
- ✅ Transferir recursos entre academias
- ✅ Definir políticas globais para a rede

**Feature Flags:**
- `academy_mode_enabled` (obrigatório)
- `enable_multi_academy` (obrigatório)

**Assinatura:**
- ✅ Requer plano `enterprise` ou superior

**Limitações:**
- ✅ Pode criar conteúdo global para a rede
- ✅ Pode visualizar todas as academias da rede
- ✅ Gerencia múltiplas academias
- ✅ Pode ser excluído (com validações)

**Tela Inicial:** `/multi-academy/dashboard`

---

### 7. 📝 `content_creator` (Criador de Conteúdo)
**Descrição:** Usuário especializado em criar conteúdo (dietas, treinos, desafios).

**Permissões:**
- ✅ Criar dietas (se permitido)
- ✅ Criar treinos (se permitido)
- ✅ Criar desafios (se permitido)
- ✅ Criar hábitos (se permitido)
- ✅ Atribuir conteúdo a grupos específicos
- ❌ Ver alunos (exceto se também for trainer)
- ❌ Gerenciar usuários
- ❌ Acesso ao painel admin

**Permissões Granulares (tabela `content_creator_permissions`):**
```sql
{
  can_create_diets: boolean,
  can_create_workouts: boolean,
  can_create_challenges: boolean,
  can_create_habits: boolean,
  allowed_group_ids: uuid[], // null = todos os grupos
  max_content_items: number | null,
  is_approved: boolean
}
```

**Feature Flags:**
- `personal_trainer_mode_enabled` (obrigatório)
- `enable_content_creators` (específico)

**Assinatura:**
- ✅ Requer assinatura ativa (ou vinculo com academia/trainer)

**Limitações:**
- ✅ Pode criar conteúdo (conforme permissões)
- ❌ Não pode visualizar alunos diretamente
- ✅ Pode ser vinculado a academias como `content_creator`
- ✅ **Pode ser excluído SEM quebrar o sistema**

**Estratégia de Exclusão do Content Creator:**

Quando um `content_creator` é excluído:

1. **Conteúdos Globais:**
   - Reassociados ao `admin` (SUPER ADMIN)
   - Mantêm metadados: `original_creator_id`, `creator_name`
   
2. **Conteúdos de Academia:**
   - Reassociados ao `owner` da academia
   - Mantêm metadados

3. **Conteúdos de Grupos:**
   - Reassociados ao `admin` do grupo ou academy owner

4. **Registros de Auditoria:**
   - Mantidos com `deleted_user_id`
   - Nome preservado nos logs

**SQL Migration para Reassociação:**
```sql
-- Ao excluir content_creator
UPDATE diets 
SET 
  creator_id = (SELECT id FROM profiles WHERE email = 'admin@admin.com'),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{original_creator}',
    jsonb_build_object(
      'id', creator_id,
      'name', (SELECT full_name FROM profiles WHERE id = creator_id),
      'deleted_at', NOW()
    )
  )
WHERE creator_id = [deleted_user_id];
```

**Tela Inicial:** `/content/dashboard`

---

### 8. 👨‍🎓 `student` / `aluno` (Aluno)
**Descrição:** Aluno vinculado a uma academia ou personal trainer.

**Permissões:**
- ✅ Todas as permissões de `user`
- ✅ Ver conteúdo atribuído pelo trainer/academia
- ✅ Chat com trainer (se habilitado)
- ✅ Ver progresso compartilhado com trainer

**Feature Flags:**
- Herda da academia ou trainer

**Assinatura:**
- ⚠️ Depende da configuração:
  - Academia pode pagar por todos os alunos
  - Aluno pode ter assinatura individual

**Limitações:**
- Mesmas de `user`
- ✅ Vinculado a academia/trainer
- ✅ Pode ser excluído

**Vínculo com Academia:**
- Pode ser `student` em `academy_members`
- Status: `active`, `inactive`, `suspended`

**Tela Inicial:** `/dashboard`

---

## 🔐 Matriz de Permissões

| Permissão | admin | user | PT | nutritionist | academy_admin | multi_academy | content_creator | student |
|-----------|-------|------|----|--------------|--------------|--------------|-----------------| --------|
| Criar Dietas | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Criar Treinos | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| Criar Desafios | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| Ver Alunos | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gerenciar Academias | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Painel Admin | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ |
| Pode Ser Excluído | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legenda:**
- ✅ Permitido
- ❌ Negado
- ⚠️ Condicional (depende de permissões/flags)

---

## 🚩 Feature Flags por Role

### admin
- Todos habilitados por padrão

### user
- Depende das flags globais do sistema

### personal_trainer / nutritionist
- `personal_trainer_mode_enabled` (obrigatório)
- `enable_personal_trainer_chat`
- `enable_group_training`

### academy_admin / multi_academy_admin
- `academy_mode_enabled` (obrigatório)
- `enable_multi_academy` (para multi_academy_admin)
- `enable_academy_branding`
- `enable_academy_invites`

### content_creator
- `personal_trainer_mode_enabled`
- `enable_content_creators`

### student
- Herda da academia/trainer

---

## 💳 Assinaturas por Role

| Role | Requer Assinatura? | Exceções |
|------|-------------------|----------|
| admin | ❌ Não | N/A |
| user | ✅ Sim | Usuários de teste |
| personal_trainer | ✅ Sim | Pode ser vinculado a academia |
| nutritionist | ✅ Sim | Pode ser vinculado a academia |
| academy_admin | ✅ Sim (academia) | N/A |
| multi_academy_admin | ✅ Sim (enterprise) | N/A |
| content_creator | ✅ Sim | Pode ser vinculado a academia |
| student | ⚠️ Depende | Academia pode pagar |

---

## 🗑️ Regras de Exclusão

### Usuários que NÃO podem ser excluídos:
- ✅ `admin` (SUPER ADMIN) - proteção do sistema

### Usuários que podem ser excluídos:
- ✅ `user`
- ✅ `personal_trainer`
- ✅ `nutritionist`
- ✅ `academy_admin` (com validações)
- ✅ `multi_academy_admin` (com validações)
- ✅ `content_creator` ⚠️ **Com reassociação de conteúdo**
- ✅ `student`

### Validações antes de excluir:

#### academy_admin
- ✅ Verificar se não é o único `owner` da academia
- ✅ Transferir ownership se necessário

#### content_creator
- ✅ Reassociar conteúdos globais ao admin
- ✅ Reassociar conteúdos de academia ao owner
- ✅ Preservar metadados de criação

#### personal_trainer / nutritionist
- ✅ Notificar alunos
- ✅ Reassociar ou manter conteúdo
- ✅ Remover vínculos de academias

---

## 📊 Hierarquia de Roles

```
admin (SUPER ADMIN)
  ├── multi_academy_admin
  │   ├── academy_admin (owner)
  │   │   ├── academy_admin (admin)
  │   │   ├── personal_trainer
  │   │   ├── nutritionist
  │   │   ├── content_creator
  │   │   └── student
  │   └── ...
  ├── personal_trainer (independente)
  │   ├── student
  │   └── content_creator (opcional)
  ├── nutritionist (independente)
  │   └── student
  ├── content_creator (independente)
  └── user
```

---

## 🎯 Resumo Executivo

- **9 Roles Totais:** admin, user, personal_trainer, nutritionist, academy_admin, multi_academy_admin, content_creator, student, aluno (deprecated)
- **1 Role Protegida:** admin (não pode ser excluído)
- **8 Roles Excluíveis:** todas exceto admin
- **1 Role com Reassociação:** content_creator (conteúdo reassociado ao excluir)
- **Feature Flags:** 6+ flags controlam funcionalidades por role
- **Assinaturas:** 7 roles requerem assinatura (exceto admin e casos especiais)

---

**Próximo:** Criar migrations para usuários de teste e seed de dados fake.
