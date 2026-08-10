# 🧪 Guia de Testes - Sistema PWA

## 📋 Objetivo

Este guia fornece instruções detalhadas para testar o sistema de instalação PWA em diferentes plataformas e cenários.

---

## 🔧 Preparação

### Pré-requisitos
- ✅ Aplicação rodando com HTTPS (ou localhost)
- ✅ Service Worker registrado
- ✅ Manifest.json configurado
- ✅ Database migrations aplicadas
- ✅ Usuário de teste criado

### Resetar Estado (se necessário)
```javascript
// No console do browser
localStorage.removeItem('pwa_install_dismissed');

// No banco de dados
UPDATE user_preferences 
SET pwa_install_dismissed = false 
WHERE user_id = 'seu-user-id';
```

---

## 📱 Testes por Plataforma

### 🤖 Android (Chrome)

#### Teste 1: Instalação Padrão
1. **Setup:**
   - Desinstalar app se já instalado
   - Limpar dados do browser
   - Não estar logado

2. **Passos:**
   - Acessar app via browser
   - Fazer login
   - Aguardar 1-2 segundos

3. **Verificações:**
   - [ ] Botão flutuante aparece no canto inferior direito
   - [ ] Texto: "Instalar aplicativo"
   - [ ] Ícone de download visível
   - [ ] Botão "X" presente

4. **Ação:**
   - Clicar em "Instalar agora"

5. **Resultado esperado:**
   - [ ] Dialog do Chrome aparece
   - [ ] Opções: "Instalar" e "Cancelar"
   - [ ] Ao clicar "Instalar", app abre em tela cheia
   - [ ] Ícone do app aparece na home screen

6. **Pós-instalação:**
   - Abrir app da home screen
   - [ ] App abre em fullscreen (sem barra de endereço)
   - [ ] Botão flutuante NÃO aparece
   - [ ] Opção no menu NÃO aparece

---

#### Teste 2: Fechar Botão (Dismissal)
1. **Setup:**
   - App não instalado
   - Botão flutuante visível

2. **Passos:**
   - Clicar no "X" do botão flutuante

3. **Resultado esperado:**
   - [ ] Botão desaparece imediatamente
   - [ ] Sem animação de saída

4. **Validar persistência:**
   - Fazer logout
   - Fazer login novamente
   - [ ] Botão NÃO reaparece

5. **Validar database:**
   ```sql
   SELECT pwa_install_dismissed 
   FROM user_preferences 
   WHERE user_id = 'user-id';
   ```
   - [ ] Resultado: `true`

---

#### Teste 3: Opção no Menu
1. **Setup:**
   - App não instalado
   - Botão flutuante fechado (ou nunca apareceu)

2. **Passos:**
   - Ir para /profile
   - Procurar opção "Instalar aplicativo" no menu

3. **Verificações:**
   - [ ] Opção aparece na lista
   - [ ] Ícone de download visível
   - [ ] Posição correta (antes de "Ajuda e Suporte")

4. **Ação:**
   - Clicar na opção

5. **Resultado esperado:**
   - [ ] Mesmo dialog de instalação do browser
   - [ ] Ao instalar, opção desaparece do menu

---

### 🍎 iOS (Safari)

#### Teste 1: Instruções de Instalação
1. **Setup:**
   - iPhone/iPad com Safari
   - App não instalado
   - Usuário logado

2. **Verificações iniciais:**
   - [ ] Botão flutuante aparece
   - [ ] Texto: "Adicione à tela inicial para acesso rápido"
   - [ ] Botão: "Ver instruções" (não "Instalar agora")

3. **Ação:**
   - Clicar em "Ver instruções"

4. **Resultado esperado:**
   - [ ] Alert aparece com 3 passos:
     1. Toque no botão "Compartilhar"
     2. Role para baixo e toque em "Adicionar à Tela de Início"
     3. Toque em "Adicionar"

5. **Instalação manual:**
   - Seguir instruções do alert
   - [ ] Ícone aparece na home screen
   - [ ] Nome do app correto
   - [ ] Ícone correto

6. **Abrir app instalado:**
   - Tocar no ícone
   - [ ] App abre em fullscreen (sem Safari UI)
   - [ ] Botão flutuante NÃO aparece

---

#### Teste 2: Detecção PWA no iOS
1. **Setup:**
   - App instalado na home screen

2. **Verificação:**
   ```javascript
   // No console (se possível)
   console.log(window.navigator.standalone); // true
   ```

3. **Comportamento:**
   - [ ] `isPWA === true`
   - [ ] Botão NÃO renderiza
   - [ ] Opção de menu NÃO aparece

---

### 💻 Desktop (Chrome/Edge)

#### Teste 1: Instalação Desktop
1. **Setup:**
   - Chrome ou Edge no Windows/Mac/Linux
   - App não instalado

2. **Passos:**
   - Acessar app
   - Fazer login
   - Aguardar botão flutuante

3. **Verificações:**
   - [ ] Botão aparece
   - [ ] Responsive (não muito grande)

4. **Ação:**
   - Clicar em "Instalar agora"

5. **Resultado esperado:**
   - [ ] Dialog do browser aparece
   - [ ] Opções: "Instalar" e "Cancelar"
   - [ ] Ao instalar, app abre em janela separada
   - [ ] Janela sem barra de endereço
   - [ ] Ícone do app na taskbar

6. **Desktop PWA:**
   - [ ] Janela independente
   - [ ] Pode ser minimizado/maximizado
   - [ ] Persiste após fechar browser
   - [ ] Botão flutuante NÃO aparece

---

#### Teste 2: Detecção via display-mode
1. **Setup:**
   - App instalado como PWA desktop

2. **Verificação:**
   ```javascript
   // No console
   window.matchMedia("(display-mode: standalone)").matches; // true
   ```

3. **Comportamento:**
   - [ ] `isPWA === true`
   - [ ] Botão NÃO renderiza

---

## 🔄 Testes de Fluxo

### Fluxo 1: Ciclo Completo de Instalação

```
1. Desinstalar app (se instalado)
2. Limpar preferências
3. Abrir browser
4. Acessar app
5. Fazer login
   └─> Botão aparece? ✓
6. Clicar em "Instalar"
   └─> Dialog aparece? ✓
7. Aceitar instalação
   └─> App abre como PWA? ✓
8. Verificar home screen
   └─> Ícone apareceu? ✓
9. Abrir da home screen
   └─> Fullscreen? ✓
   └─> Botão NÃO aparece? ✓
10. Ir para /profile
   └─> Opção de instalação NÃO aparece? ✓
```

**Resultado:** ✅ PASS | ❌ FAIL

---

### Fluxo 2: Rejeição de Instalação

```
1. App não instalado
2. Botão aparece
3. Clicar em "Instalar"
4. Dialog aparece
5. Clicar em "Cancelar"
   └─> Dialog fecha? ✓
   └─> Botão continua visível? ✓
6. Pode tentar instalar novamente? ✓
```

**Resultado:** ✅ PASS | ❌ FAIL

---

### Fluxo 3: Persistência do Dismissal

```
1. App não instalado
2. Botão aparece
3. Clicar no "X"
   └─> Botão desaparece? ✓
4. Fazer logout
5. Fazer login
   └─> Botão NÃO reaparece? ✓
6. Hard refresh (Ctrl+Shift+R)
   └─> Botão continua oculto? ✓
7. Fechar browser completamente
8. Abrir novamente e logar
   └─> Botão continua oculto? ✓
```

**Resultado:** ✅ PASS | ❌ FAIL

---

### Fluxo 4: Múltiplos Usuários

```
User A:
1. Login como userA@test.com
2. Fechar botão (X)
3. Logout

User B:
4. Login como userB@test.com
   └─> Botão DEVE aparecer? ✓
5. Instalar app
6. Logout

User A novamente:
7. Login como userA@test.com
   └─> Botão NÃO deve aparecer? ✓
```

**Resultado:** ✅ PASS | ❌ FAIL

---

## 🐛 Testes de Edge Cases

### Edge Case 1: beforeinstallprompt não dispara

**Cenário:**
- Browser não suporta PWA install
- Ou app não atende requisitos

**Teste:**
1. Tentar instalar
2. **Esperado:** Alert com mensagem de erro
   - "A instalação não está disponível no momento."
   - "Tente usar Chrome ou Edge..."

---

### Edge Case 2: Service Worker não registrado

**Cenário:**
- Service Worker falhou ao registrar

**Teste:**
1. Desregistrar SW no console:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(function(registrations) {
     for(let registration of registrations) {
       registration.unregister();
     }
   });
   ```
2. Recarregar página
3. **Esperado:** beforeinstallprompt não dispara
4. Botão aparece mas mostra erro ao clicar

---

### Edge Case 3: Network offline

**Cenário:**
- Usuário está offline

**Teste:**
1. Ativar modo avião
2. Abrir app (se já carregado)
3. **Esperado:** Botão não deve quebrar
4. Ao clicar, mostra erro gracioso

---

### Edge Case 4: Database indisponível

**Cenário:**
- Supabase fora do ar
- Query falha

**Teste:**
1. Simular erro no hook (comentar try/catch)
2. **Esperado:** Fallback para localStorage
3. Botão funciona normalmente

---

## 📊 Checklist de Validação Final

### Funcionalidade
- [ ] Botão aparece para usuários logados
- [ ] Botão NÃO aparece se app instalado
- [ ] Botão NÃO aparece se usuário fechou
- [ ] Opção de menu aparece corretamente
- [ ] Instalação funciona (Android/Desktop)
- [ ] Instruções aparecem (iOS)
- [ ] Dismissal persiste no DB
- [ ] Fallback localStorage funciona

### Cross-Browser
- [ ] Android Chrome
- [ ] Android Edge
- [ ] Android Samsung Internet
- [ ] iOS Safari
- [ ] Desktop Chrome
- [ ] Desktop Edge
- [ ] Desktop Firefox (PWA limitado)

### UX
- [ ] Animação suave
- [ ] Não intrusivo
- [ ] Responsive
- [ ] Sem flicker/FOUC
- [ ] Feedback claro

### Performance
- [ ] Hook não causa re-renders excessivos
- [ ] Query ao DB apenas no mount
- [ ] Event listeners limpos
- [ ] Sem memory leaks

### Segurança
- [ ] RLS funciona (cada usuário vê só suas preferências)
- [ ] Não há vazamento de estado entre usuários

---

## 🔍 Debug e Troubleshooting

### Ver logs do hook

```javascript
// Abrir console do browser
// Procurar por:
[usePWAInstall] PWA mode detected: false
[usePWAInstall] User dismissed button (from DB)
[usePWAInstall] beforeinstallprompt event captured
```

---

### Verificar estado do localStorage

```javascript
localStorage.getItem('pwa_install_dismissed')
// null ou "true"
```

---

### Verificar estado no DB

```sql
SELECT 
  user_id, 
  pwa_install_dismissed, 
  updated_at 
FROM user_preferences 
WHERE user_id = 'your-user-id';
```

---

### Forçar reset (para re-testar)

```javascript
// Console
localStorage.removeItem('pwa_install_dismissed');

// Ou via UI (se implementado)
// usePWAInstall().resetDismissal();
```

---

## ✅ Critérios de Aceite

Para considerar o sistema **PRONTO**, todos os itens abaixo devem passar:

1. [ ] Botão aparece no primeiro login
2. [ ] Instalação funciona em Android
3. [ ] Instruções corretas para iOS
4. [ ] Opção de menu funciona
5. [ ] Dismissal persiste após logout
6. [ ] Botão NÃO reaparece após fechar
7. [ ] Botão NÃO aparece se app instalado
8. [ ] Sem erros no console
9. [ ] Sem quebra de layout
10. [ ] Funciona em todos os browsers testados

---

## 📝 Template de Relatório de Teste

```markdown
## Teste: [Nome do Teste]
**Data:** [DD/MM/YYYY]
**Testador:** [Seu Nome]
**Plataforma:** [Android/iOS/Desktop]
**Browser:** [Chrome/Safari/Edge]
**Versão:** [Número]

### Resultado: ✅ PASS / ❌ FAIL

### Observações:
- [O que funcionou]
- [O que não funcionou]
- [Screenshots, se aplicável]

### Bugs encontrados:
- [ ] [Descrição do bug #1]
- [ ] [Descrição do bug #2]
```

---

**Última atualização:** 14 de Janeiro de 2026
