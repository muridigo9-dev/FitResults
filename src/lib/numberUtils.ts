/**
 * Number Utilities
 * Funções utilitárias para manipulação segura de números em inputs
 */

/**
 * Remove zeros à esquerda de um valor numérico
 * Mantém "0" quando o valor é exatamente zero
 * Mantém string vazia quando o input está vazio
 * 
 * @param value - Valor do input (string ou number)
 * @returns Valor sanitizado sem zeros à esquerda
 * 
 * @example
 * sanitizeNumericInput("0300") // "300"
 * sanitizeNumericInput("0005") // "5"
 * sanitizeNumericInput("0") // "0"
 * sanitizeNumericInput("") // ""
 * sanitizeNumericInput("0.5") // "0.5"
 * sanitizeNumericInput("00.50") // "0.5"
 */
export function sanitizeNumericInput(value: string | number | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  const stringValue = String(value).trim();

  // Empty string stays empty
  if (stringValue === "") {
    return "";
  }

  // Try to parse as number
  const numValue = parseFloat(stringValue);

  // If not a valid number, return original (let validation handle it)
  if (isNaN(numValue)) {
    return stringValue;
  }

  // Convert back to string to remove leading zeros
  // This handles: "0300" -> 300 -> "300"
  // This handles: "0" -> 0 -> "0"
  // This handles: "0.5" -> 0.5 -> "0.5"
  // This handles: "00.50" -> 0.5 -> "0.5"
  return String(numValue);
}

/**
 * Sanitiza um valor numérico e retorna como number ou undefined
 * Útil para persistência em banco de dados
 * 
 * @param value - Valor do input
 * @returns Number sanitizado ou undefined se inválido
 * 
 * @example
 * sanitizeToNumber("0300") // 300
 * sanitizeToNumber("0") // 0
 * sanitizeToNumber("") // undefined
 * sanitizeToNumber("abc") // undefined
 */
export function sanitizeToNumber(value: string | number | null | undefined): number | undefined {
  const sanitized = sanitizeNumericInput(value);

  if (sanitized === "") {
    return undefined;
  }

  const numValue = parseFloat(sanitized);

  return isNaN(numValue) ? undefined : numValue;
}

/**
 * Handler para onBlur que sanitiza o valor do input
 * Remove zeros à esquerda quando o input perde o foco
 * 
 * @param value - Valor atual do input
 * @param onChange - Função para atualizar o valor
 * @returns Handler function para onBlur
 * 
 * @example
 * <Input
 *   type="number"
 *   value={weight}
 *   onChange={(e) => setWeight(e.target.value)}
 *   onBlur={createSanitizeBlurHandler(weight, setWeight)}
 * />
 */
export function createSanitizeBlurHandler(
  value: string | number | null | undefined,
  onChange: (value: string) => void
): () => void {
  return () => {
    const sanitized = sanitizeNumericInput(value);
    if (sanitized !== String(value)) {
      onChange(sanitized);
    }
  };
}

/**
 * Hook customizado para inputs numéricos com sanitização automática
 * 
 * @param initialValue - Valor inicial
 * @returns [value, setValue, handleBlur]
 * 
 * @example
 * const [weight, setWeight, handleWeightBlur] = useSanitizedNumber(profile?.weight);
 * 
 * <Input
 *   type="number"
 *   value={weight}
 *   onChange={(e) => setWeight(e.target.value)}
 *   onBlur={handleWeightBlur}
 * />
 */
export function useSanitizedNumber(
  initialValue?: number | null
): [string, (value: string) => void, () => void] {
  const [value, setValue] = React.useState<string>(
    initialValue !== null && initialValue !== undefined ? String(initialValue) : ""
  );

  const handleBlur = React.useCallback(() => {
    const sanitized = sanitizeNumericInput(value);
    if (sanitized !== value) {
      setValue(sanitized);
    }
  }, [value]);

  return [value, setValue, handleBlur];
}

// Re-export React for the hook
import React from "react";
