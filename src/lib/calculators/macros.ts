/**
 * Macronutrient Calculators
 * 
 * Pure functions for calculating macronutrients based on calorie targets.
 */

import {
  type MacroDistribution,
  type MacroGrams,
  type DailyMacros,
  type MacroTemplate,
  type NutritionLimits,
  DEFAULT_NUTRITION_LIMITS,
} from "@/types/nutrition";

// ==========================================
// CALORIE VALUES
// ==========================================

const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

// ==========================================
// MACRO CALCULATIONS
// ==========================================

/**
 * Calculate macro grams from calorie target and percentage distribution
 */
export function calculateMacroGrams(
  calories: number,
  distribution: MacroDistribution
): MacroGrams {
  // Validate distribution adds up to 100%
  const total = distribution.protein + distribution.carbs + distribution.fat;
  if (Math.abs(total - 100) > 0.1) {
    console.warn(`Macro distribution does not equal 100%: ${total}`);
  }
  
  const proteinCalories = (calories * distribution.protein) / 100;
  const carbsCalories = (calories * distribution.carbs) / 100;
  const fatCalories = (calories * distribution.fat) / 100;
  
  return {
    protein: Math.round(proteinCalories / CALORIES_PER_GRAM.protein),
    carbs: Math.round(carbsCalories / CALORIES_PER_GRAM.carbs),
    fat: Math.round(fatCalories / CALORIES_PER_GRAM.fat),
  };
}

/**
 * Calculate calories from macro grams
 */
export function calculateCaloriesFromMacros(macros: MacroGrams): number {
  return (
    macros.protein * CALORIES_PER_GRAM.protein +
    macros.carbs * CALORIES_PER_GRAM.carbs +
    macros.fat * CALORIES_PER_GRAM.fat
  );
}

/**
 * Calculate macro distribution percentage from grams
 */
export function calculateDistributionFromGrams(macros: MacroGrams): MacroDistribution {
  const totalCalories = calculateCaloriesFromMacros(macros);
  
  if (totalCalories === 0) {
    return { protein: 33.3, carbs: 33.3, fat: 33.4 };
  }
  
  return {
    protein: Math.round((macros.protein * CALORIES_PER_GRAM.protein / totalCalories) * 1000) / 10,
    carbs: Math.round((macros.carbs * CALORIES_PER_GRAM.carbs / totalCalories) * 1000) / 10,
    fat: Math.round((macros.fat * CALORIES_PER_GRAM.fat / totalCalories) * 1000) / 10,
  };
}

// ==========================================
// COMPLETE DAILY MACROS
// ==========================================

/**
 * Calculate complete daily macros including per-kg values
 */
export function calculateDailyMacros(
  calories: number,
  distribution: MacroDistribution,
  bodyweightKg: number
): DailyMacros {
  const grams = calculateMacroGrams(calories, distribution);
  
  return {
    calories,
    distribution,
    grams,
    perKgBodyweight: {
      protein: Math.round((grams.protein / bodyweightKg) * 10) / 10,
      carbs: Math.round((grams.carbs / bodyweightKg) * 10) / 10,
      fat: Math.round((grams.fat / bodyweightKg) * 10) / 10,
    },
  };
}

// ==========================================
// MACRO VALIDATION
// ==========================================

/**
 * Validate macros against nutrition limits
 */
export function validateMacros(
  macros: MacroGrams,
  bodyweightKg: number,
  limits: NutritionLimits = DEFAULT_NUTRITION_LIMITS
): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const proteinPerKg = macros.protein / bodyweightKg;
  const fatPerKg = macros.fat / bodyweightKg;
  const totalCalories = calculateCaloriesFromMacros(macros);
  
  // Check protein
  if (proteinPerKg < limits.minProteinPerKg) {
    warnings.push(`Proteína muito baixa: ${proteinPerKg.toFixed(1)}g/kg (mínimo: ${limits.minProteinPerKg}g/kg)`);
  }
  if (proteinPerKg > limits.maxProteinPerKg) {
    warnings.push(`Proteína muito alta: ${proteinPerKg.toFixed(1)}g/kg (máximo: ${limits.maxProteinPerKg}g/kg)`);
  }
  
  // Check fat
  if (fatPerKg < limits.minFatPerKg) {
    warnings.push(`Gordura muito baixa: ${fatPerKg.toFixed(1)}g/kg (mínimo: ${limits.minFatPerKg}g/kg)`);
  }
  if (fatPerKg > limits.maxFatPerKg) {
    warnings.push(`Gordura muito alta: ${fatPerKg.toFixed(1)}g/kg (máximo: ${limits.maxFatPerKg}g/kg)`);
  }
  
  // Check total calories
  if (totalCalories < limits.minCalories) {
    warnings.push(`Calorias muito baixas: ${totalCalories}kcal (mínimo: ${limits.minCalories}kcal)`);
  }
  if (totalCalories > limits.maxCalories) {
    warnings.push(`Calorias muito altas: ${totalCalories}kcal (máximo: ${limits.maxCalories}kcal)`);
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ==========================================
// TEMPLATE HELPERS
// ==========================================

/**
 * Apply a macro template to calculate daily targets
 */
export function applyMacroTemplate(
  template: MacroTemplate,
  tdee: number,
  bodyweightKg: number
): DailyMacros {
  // Apply template's calorie adjustment
  const adjustedCalories = Math.round(tdee * (1 + template.calorieAdjustment / 100));
  const safeCalories = Math.max(1200, adjustedCalories);
  
  return calculateDailyMacros(safeCalories, template.distribution, bodyweightKg);
}

/**
 * Get recommended template based on fitness goal
 */
export function getRecommendedTemplate(
  templates: MacroTemplate[],
  goal: "lose_weight" | "maintain" | "gain_muscle"
): MacroTemplate | undefined {
  const typeMap = {
    lose_weight: "weight_loss",
    maintain: "maintenance",
    gain_muscle: "muscle_gain",
  } as const;
  
  return templates.find(t => t.type === typeMap[goal] && t.isActive);
}

// ==========================================
// MEAL DISTRIBUTION
// ==========================================

/**
 * Distribute daily macros across meals
 */
export function distributeMacrosAcrossMeals(
  dailyMacros: DailyMacros,
  mealCount: number = 4
): Array<{ mealNumber: number; calories: number; macros: MacroGrams }> {
  // Default distribution: breakfast 25%, lunch 30%, dinner 30%, snack 15%
  const distributions = mealCount === 4 
    ? [0.25, 0.30, 0.30, 0.15]
    : Array(mealCount).fill(1 / mealCount);
  
  return distributions.map((fraction, index) => ({
    mealNumber: index + 1,
    calories: Math.round(dailyMacros.calories * fraction),
    macros: {
      protein: Math.round(dailyMacros.grams.protein * fraction),
      carbs: Math.round(dailyMacros.grams.carbs * fraction),
      fat: Math.round(dailyMacros.grams.fat * fraction),
    },
  }));
}
