# 🔢 Correção de Inputs Numéricos - Zeros à Esquerda

## 📋 Problema

Inputs numéricos no sistema estavam mantendo zeros à esquerda ao digitar valores, resultando em:
- "0300" em vez de "300"
- "0500" em vez de "500"
- "0005" em vez de "5"

Esse comportamento causava confusão visual e potenciais problemas de validação.

---

## ✅ Solução Implementada

### 1. **Função Utilitária** (`src/lib/numberUtils.ts`)

Criamos um conjunto de funções reutilizáveis para sanitização segura de inputs numéricos:

#### `sanitizeNumericInput(value)`
Remove zeros à esquerda mantendo a integridade do valor:
```typescript
sanitizeNumericInput("0300") // "300"
sanitizeNumericInput("0005") // "5"
sanitizeNumericInput("0") // "0" (mantém zero único)
sanitizeNumericInput("") // "" (mantém vazio)
sanitizeNumericInput("0.5") // "0.5" (mantém decimais)
sanitizeNumericInput("00.50") // "0.5" (normaliza)
```

#### `sanitizeToNumber(value)`
Converte para number ou undefined:
```typescript
sanitizeToNumber("0300") // 300
sanitizeToNumber("0") // 0
sanitizeToNumber("") // undefined
sanitizeToNumber("abc") // undefined
```

#### `createSanitizeBlurHandler(value, onChange)`
Cria um handler para onBlur que sanitiza automaticamente.

#### `useSanitizedNumber(initialValue)`
Hook customizado para inputs numéricos com sanitização automática.

---

## 🎯 Estratégia de Aplicação

### Quando Sanitizar

✅ **onBlur** (recomendado)
- Não interfere na digitação
- Cursor não pula
- UX natural

✅ **Antes de salvar** (submit/save)
- Garante dados limpos no banco
- Não afeta a experiência de digitação

❌ **onChange** (evitar)
- Pode causar cursor pulando
- Comportamento estranho em inputs controlados
- Dificulta digitação

### Onde Foi Aplicado

#### 1. **StepWeight** (`src/components/checkin/StepWeight.tsx`)
- ✅ Input de peso no check-in
- ✅ Sanitização no onBlur
- ✅ Mantém validações (min/max)

#### 2. **BodyProfileForm** (`src/components/metrics/BodyProfileForm.tsx`)
- ✅ Idade
- ✅ Altura
- ✅ Peso
- ✅ Sanitização no onBlur

#### 3. **Outros Componentes**
Mesma abordagem pode ser aplicada em:
- AnamnesisForm (peso, pressão arterial, etc)
- QuickWeight
- CustomMacroEditor
- AdminGamification (XP mínimo/máximo)

---

## 🔧 Como Usar

### Opção 1: onBlur Manual

```typescript
import { sanitizeNumericInput } from "@/lib/numberUtils";

const [weight, setWeight] = useState("");

const handleBlur = () => {
  const sanitized = sanitizeNumericInput(weight);
  if (sanitized !== weight) {
    setWeight(sanitized);
  }
};

<Input
  type="number"
  value={weight}
  onChange={(e) => setWeight(e.target.value)}
  onBlur={handleBlur}
/>
```

### Opção 2: Helper Function

```typescript
import { createSanitizeBlurHandler } from "@/lib/numberUtils";

<Input
  type="number"
  value={weight}
  onChange={(e) => setWeight(e.target.value)}
  onBlur={createSanitizeBlurHandler(weight, setWeight)}
/>
```

### Opção 3: Hook Customizado

```typescript
import { useSanitizedNumber } from "@/lib/numberUtils";

const [weight, setWeight, handleWeightBlur] = useSanitizedNumber(initialWeight);

<Input
  type="number"
  value={weight}
  onChange={(e) => setWeight(e.target.value)}
  onBlur={handleWeightBlur}
/>
```

### Opção 4: Sanitizar Antes de Salvar

```typescript
import { sanitizeToNumber } from "@/lib/numberUtils";

const handleSubmit = (data: FormData) => {
  const sanitizedData = {
    ...data,
    weight: sanitizeToNumber(data.weight),
    height: sanitizeToNumber(data.height),
    age: sanitizeToNumber(data.age),
  };
  
  await saveProfile(sanitizedData);
};
```

---

## ✅ Garantias

### O Que NÃO Quebra

✅ Validações existentes (min/max)  
✅ Máscaras de input  
✅ Inputs controlados (state)  
✅ Formulários React  
✅ Lógica de negócio  
✅ Cursor durante digitação  

### O Que É Preservado

✅ Valor "0" (zero único)  
✅ Campos vazios ""  
✅ Decimais (0.5, 1.25, etc)  
✅ Números negativos (se permitidos)  

### O Que É Corrigido

✅ "0300" → "300"  
✅ "0005" → "5"  
✅ "00.50" → "0.5"  
✅ "0000" → "0"  

---

## 🧪 Testes

### Casos de Teste

```typescript
// Zeros à esquerda removidos
expect(sanitizeNumericInput("0300")).toBe("300");
expect(sanitizeNumericInput("0005")).toBe("5");

// Zero único preservado
expect(sanitizeNumericInput("0")).toBe("0");

// Vazio preservado
expect(sanitizeNumericInput("")).toBe("");

// Decimais normalizados
expect(sanitizeNumericInput("0.5")).toBe("0.5");
expect(sanitizeNumericInput("00.50")).toBe("0.5");

// Números válidos preservados
expect(sanitizeNumericInput("300")).toBe("300");
expect(sanitizeNumericInput("5")).toBe("5");

// Conversão para number
expect(sanitizeToNumber("0300")).toBe(300);
expect(sanitizeToNumber("0")).toBe(0);
expect(sanitizeToNumber("")).toBeUndefined();
expect(sanitizeToNumber("abc")).toBeUndefined();
```

---

## 📊 Impacto

### Componentes Atualizados
- ✅ StepWeight (1 input)
- ✅ BodyProfileForm (3 inputs: idade, altura, peso)
- ✅ AnamnesisForm (15 inputs: horas de sono, altura, peso, % gordura, massa muscular, medidas corporais, pressão arterial, objetivos)
- ✅ QuickWeight (1 input)
- ✅ AdminGamification (7 inputs: XP mínimo/máximo por nível, XP por check-in, hábito, bônus diário, bônus streak, recompensa)

### Total de Inputs Corrigidos
**27 inputs numéricos** em **5 componentes**

### Componentes Pendentes (Opcional)
- [ ] CustomMacroEditor (se existir)

### Benefícios

1. **UX Melhorada**: Valores sempre limpos e legíveis
2. **Dados Consistentes**: Banco sempre com valores normalizados
3. **Reutilizável**: Funções podem ser usadas em qualquer input
4. **Seguro**: Não quebra funcionalidades existentes
5. **Performático**: Sanitização apenas no onBlur

---

## 🔄 Migração

Para aplicar em novos inputs:

1. Importe a função necessária:
```typescript
import { sanitizeNumericInput } from "@/lib/numberUtils";
```

2. Adicione onBlur ao input:
```typescript
onBlur={() => {
  const sanitized = sanitizeNumericInput(value);
  if (sanitized !== value) {
    setValue(sanitized);
  }}
}
```

3. Ou use o hook customizado:
```typescript
const [value, setValue, handleBlur] = useSanitizedNumber(initialValue);
```

---

## 📝 Notas Importantes

### Por Que onBlur?

- ✅ Não interfere na digitação natural
- ✅ Cursor não pula
- ✅ Permite apagar e redigitar
- ✅ UX previsível

### Por Que NÃO onChange?

- ❌ Cursor pode pular para o final
- ❌ Dificulta apagar dígitos
- ❌ Comportamento estranho em inputs controlados
- ❌ UX ruim

### Casos Especiais

**Inputs com máscara**: Aplicar sanitização antes de salvar, não no onBlur.

**Inputs não controlados**: Usar `defaultValue` e sanitizar no submit.

**Formulários com validação**: Sanitizar antes da validação final.

---

## 🎯 Resultado Final

✅ Inputs numéricos agora se comportam corretamente  
✅ Zeros à esquerda são removidos automaticamente  
✅ Nenhuma funcionalidade foi quebrada  
✅ UX natural e previsível  
✅ Código reutilizável e documentado  

**Status:** ✅ Implementado e Testado  
**Versão:** 1.0.0  
**Data:** 14/01/2026
