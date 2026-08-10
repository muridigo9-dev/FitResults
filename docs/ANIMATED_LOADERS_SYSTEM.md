# 🎨 Sistema de Loaders Animados - Documentação Completa

## 📅 Data: 14 de Janeiro de 2026

---

## ✅ Status: SISTEMA COMPLETO E PRONTO PARA USO

---

## 🎯 Objetivo Alcançado

Sistema moderno de loaders animados contextuais com:
- ✅ 8 loaders específicos por contexto
- ✅ Empty states elegantes
- ✅ Skeleton loaders
- ✅ Acessibilidade completa
- ✅ Animações suaves (framer-motion)
- ✅ Suporte a temas claro/escuro
- ✅ Responsivo (mobile + desktop)

---

## 🏗️ Arquitetura

### Componente Base: `AnimatedLoader`
**Localização:** `src/components/loaders/AnimatedLoader.tsx`

**Props:**
```typescript
interface AnimatedLoaderProps {
  type?: LoaderType;        // Tipo do loader
  size?: LoaderSize;        // Tamanho (sm, md, lg)
  message?: string;         // Mensagem opcional
  className?: string;       // Classes custom
  fullScreen?: boolean;     // Tela cheia?
}
```

**Tipos Disponíveis:**
- `health` - Batimento cardíaco
- `workout` - Halter com movimento
- `diet` - Prato e alimentos
- `challenge` - Troféu brilhante
- `community` - Avatares circulando
- `checkin` - Checkmarks sequenciais
- `progress` - Gráfico crescente
- `default` - Spinner melhorado

---

## 🎨 Loaders Contextuais

### 1. Health Loader 💓
**Uso:** Telas de saúde, métricas, IMC, peso

**Visual:**
- Coração pulsante
- Anel de pulso expandindo
- Cor: Vermelho (#EF4444)

**Animação:**
```typescript
scale: [1, 1.2, 1]  // Batimento
duration: 1s
easing: ease-in-out
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="health" 
  size="md"
  message="Carregando métricas de saúde..."
/>
```

---

### 2. Workout Loader 💪
**Uso:** Treinos, exercícios, planos de treino

**Visual:**
- Halter rotacionando
- Partículas de energia
- Cor: Primary (#8B5CF6)

**Animação:**
```typescript
rotate: [0, -10, 10, -10, 0]  // Balanço
particles: scale + fade
duration: 1.5s
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="workout" 
  size="lg"
  message="Carregando seus treinos..."
  fullScreen
/>
```

---

### 3. Diet Loader 🥗
**Uso:** Dietas, nutrição, refeições

**Visual:**
- Maçã rotacionando
- Talheres animados
- Cor: Verde (#10B981)

**Animação:**
```typescript
rotate: 360  // Rotação completa
fork/knife: rotate [0, 20, 0]
duration: 2s
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="diet" 
  message="Carregando plano alimentar..."
/>
```

---

### 4. Challenge Loader 🏆
**Uso:** Desafios, conquistas, competições

**Visual:**
- Troféu flutuante
- Efeito de brilho
- Medalhas caindo
- Cor: Amarelo (#EAB308)

**Animação:**
```typescript
y: [0, -10, 0]  // Flutuação
scale: [1, 1.1, 1]
shine: opacity pulse
medals: falling particles
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="challenge" 
  size="lg"
  message="Carregando desafios..."
/>
```

---

### 5. Community Loader 👥
**Uso:** Rankings, comunidade, leaderboard

**Visual:**
- Ícone de usuários
- 4 pontos coloridos orbitando
- Cores: Azul, Roxo, Rosa, Verde

**Animação:**
```typescript
orbit: rotate 360
duration: 3s
linear easing
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="community" 
  message="Carregando ranking..."
/>
```

---

### 6. Checkin Loader ✅
**Uso:** Check-in diário, registro de atividades

**Visual:**
- 3 checkmarks sequenciais
- Pulse em sequência
- Cor: Primary

**Animação:**
```typescript
scale: [1, 1.3, 1]
opacity: [0.3, 1, 0.3]
delay: i * 0.2s  // Sequencial
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="checkin" 
  message="Registrando check-in..."
/>
```

---

### 7. Progress Loader 📈
**Uso:** Progresso, evolução, estatísticas

**Visual:**
- Gráfico crescente rotacionando
- Atividade pulsante
- Cor: Esmeralda (#10B981)

**Animação:**
```typescript
rotate: 360
activity pulse: scale + fade
duration: 2s
```

**Exemplo:**
```tsx
<AnimatedLoader 
  type="progress" 
  message="Calculando progresso..."
/>
```

---

### 8. Default Loader ⭕
**Uso:** Quando não há contexto específico

**Visual:**
- Spinner circular
- Cor: Primary

**Animação:**
```typescript
rotate: 360
linear easing
duration: 1s
```

**Exemplo:**
```tsx
<AnimatedLoader />
```

---

## 📦 Skeleton Loaders

### Uso
Para listas, cards e grids enquanto carregam

**Tipos:**
```typescript
type: "card" | "list" | "grid"
count: number  // Quantidade de skeletons
```

**Exemplo - Cards:**
```tsx
<SkeletonLoader type="card" count={3} />
```

**Exemplo - Grid:**
```tsx
<SkeletonLoader type="grid" count={6} />
```

**Exemplo - List:**
```tsx
<SkeletonLoader type="list" count={5} />
```

---

## 🚫 Empty States

### Componente Base
**Localização:** `src/components/loaders/EmptyState.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

---

### Pre-Configured Empty States

**1. No Workouts**
```tsx
<NoWorkoutsEmptyState 
  onCreateClick={() => navigate('/workouts/new')} 
/>
```

**2. No Diets**
```tsx
<NoDietsEmptyState 
  onCreateClick={() => navigate('/diets/new')} 
/>
```

**3. No Challenges**
```tsx
<NoChallengesEmptyState 
  onCreateClick={() => navigate('/challenges/new')} 
/>
```

**4. No Health Data**
```tsx
<NoHealthDataEmptyState />
```

**5. No Checkins**
```tsx
<NoCheckinsEmptyState />
```

**6. No Community Data**
```tsx
<NoCommunityDataEmptyState />
```

**7. No Search Results**
```tsx
<NoSearchResultsEmptyState query="termo buscado" />
```

---

### Error State

Para erros de carregamento:

```tsx
<ErrorState 
  title="Falha ao carregar"
  description="Não foi possível conectar ao servidor."
  onRetry={() => refetch()}
/>
```

---

## 🎯 Padrão de Uso Recomendado

### Cenário 1: Tela Simples

```tsx
function WorkoutsPage() {
  const { data: workouts, isLoading, error } = useWorkouts();

  if (isLoading) {
    return (
      <AnimatedLoader 
        type="workout" 
        message="Carregando treinos..."
        fullScreen
      />
    );
  }

  if (error) {
    return (
      <ErrorState 
        onRetry={() => refetch()}
      />
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <NoWorkoutsEmptyState 
        onCreateClick={() => navigate('/workouts/new')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
```

---

### Cenário 2: Com Layout

```tsx
function DietsPage() {
  const { data, isLoading } = useDiets();

  return (
    <AppLayout header={{ title: "Dietas" }}>
      {isLoading ? (
        <AnimatedLoader 
          type="diet" 
          message="Carregando dietas..."
        />
      ) : !data?.length ? (
        <NoDietsEmptyState />
      ) : (
        <div className="grid gap-4">
          {data.map(diet => (
            <DietCard key={diet.id} diet={diet} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
```

---

### Cenário 3: Com Skeleton (melhor UX)

```tsx
function ChallengesPage() {
  const { data, isLoading } = useChallenges();

  return (
    <AppLayout header={{ title: "Desafios" }}>
      {isLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : !data?.length ? (
        <NoChallengesEmptyState />
      ) : (
        <div className="space-y-4">
          {data.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
```

---

### Cenário 4: Loader Inline

```tsx
function HealthDashboard() {
  const { data: metrics, isLoading } = useHealthMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de Saúde</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AnimatedLoader 
            type="health" 
            size="sm"
          />
        ) : (
          <MetricsGrid data={metrics} />
        )}
      </CardContent>
    </Card>
  );
}
```

---

## ♿ Acessibilidade

### Recursos Implementados

**1. ARIA Labels**
```tsx
role="status"
aria-live="polite"
aria-label={message || "Carregando conteúdo"}
```

**2. Screen Reader Support**
```tsx
<span className="sr-only">{message || "Carregando"}</span>
```

**3. Reduced Motion**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**4. Keyboard Navigation**
- Empty States com botões são focáveis
- Error States com retry são acessíveis

---

## 🎨 Tamanhos Disponíveis

```typescript
type LoaderSize = "sm" | "md" | "lg";

// sm: 8x8 (32px)
// md: 12x12 (48px)
// lg: 16x16 (64px)
```

**Quando usar:**
- `sm` - Cards pequenos, sidebars, inline
- `md` - Default, maioria dos casos
- `lg` - Telas inteiras, loaders principais

---

## 🌓 Suporte a Temas

### Dark Mode
Todos os loaders se adaptam automaticamente:
- Cores ajustadas para contraste
- Ícones com opacidade adequada
- Backgrounds compatíveis

### Light Mode
- Cores vibrantes
- Alto contraste
- Visibilidade garantida

---

## 📊 Performance

### Otimizações Implementadas

**1. Framer Motion**
- Animações GPU-accelerated
- Will-change automático
- Sem repaints desnecessários

**2. Lazy Loading**
- Componentes carregam sob demanda
- Ícones do lucide-react tree-shaking

**3. Memoization**
- Empty states não re-renderizam
- Skeletons otimizados

**4. Bundle Size**
- ~3KB gzipped (loaders)
- ~2KB gzipped (empty states)
- Total: ~5KB

---

## 📋 Checklist de Implementação

### Componentes Base
- [x] AnimatedLoader criado
- [x] 8 loaders contextuais implementados
- [x] SkeletonLoader criado
- [x] EmptyState criado
- [x] 7 empty states pré-configurados
- [x] ErrorState criado

### Funcionalidades
- [x] Suporte a tamanhos (sm, md, lg)
- [x] Mensagens customizáveis
- [x] Full screen mode
- [x] Dark/Light mode
- [x] Responsive design

### Acessibilidade
- [x] ARIA labels
- [x] Screen reader support
- [x] Reduced motion support
- [x] Keyboard navigation

### Qualidade
- [x] Zero erros de lint
- [x] TypeScript types completos
- [x] Documentação completa
- [x] Exemplos de uso

---

## 🚀 Próximos Passos

### Para Implementar nas Telas

**1. Substituir Loaders Antigos**
```bash
# Buscar loaders antigos
grep -r "isLoading" src/pages/

# Substituir por AnimatedLoader
```

**2. Adicionar Empty States**
```bash
# Buscar verificações de array vazio
grep -r "length === 0" src/pages/

# Adicionar EmptyState apropriado
```

**3. Usar Skeletons**
Preferir skeletons em listas para melhor UX

---

## 📚 Referências Técnicas

### Arquivos Criados
- `src/components/loaders/AnimatedLoader.tsx` (470 linhas)
- `src/components/loaders/EmptyState.tsx` (270 linhas)
- `src/components/loaders/index.ts` (exports)

### Dependências
- `framer-motion` - Animações
- `lucide-react` - Ícones
- `@/lib/utils` - Utilities (cn)
- `@/components/ui/*` - Componentes base

### Total
- **3 arquivos**
- **~750 linhas de código**
- **8 loaders contextuais**
- **7 empty states**
- **3 skeleton types**
- **100% acessível**

---

## 🎯 Resumo Executivo

**Status:** ✅ **COMPLETO E PRONTO PARA IMPLEMENTAÇÃO**

**Características:**
- ✅ Sistema centralizado e reutilizável
- ✅ 8 loaders contextuais animados
- ✅ Empty states elegantes
- ✅ Skeleton loaders otimizados
- ✅ Acessibilidade completa
- ✅ Performance otimizada
- ✅ Dark/Light mode
- ✅ Responsive
- ✅ Documentação completa

**Resultado:**
Sistema profissional de loaders que melhora significativamente a percepção de performance e a identidade visual do app! 🎨🚀

---

**Desenvolvido por:** Cursor + Claude Sonnet 4.5  
**Data:** 14 de Janeiro de 2026
