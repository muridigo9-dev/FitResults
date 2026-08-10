/**
 * useMacros Hook
 * 
 * Provides macronutrient calculations based on calorie targets and templates.
 * Automatically recalculates when inputs change.
 */

import { useMemo } from "react";
import type { MacroTemplate, DailyMacros, NutritionLimits } from "@/types/nutrition";
import type { DailyCalorieTarget } from "@/types/metrics";
import { 
  applyMacroTemplate, 
  validateMacros, 
  distributeMacrosAcrossMeals 
} from "@/lib/calculators";

interface UseMacrosParams {
  calorieTarget: DailyCalorieTarget | null;
  template: MacroTemplate | null;
  bodyweightKg: number | null;
  customLimits?: NutritionLimits;
}

interface UseMacrosResult {
  dailyMacros: DailyMacros | null;
  mealDistribution: Array<{ mealNumber: number; calories: number; macros: { protein: number; carbs: number; fat: number } }> | null;
  validation: { valid: boolean; warnings: string[] };
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Calculate macros from calorie target and template
 */
export function useMacros({ 
  calorieTarget, 
  template, 
  bodyweightKg,
  customLimits,
}: UseMacrosParams): UseMacrosResult {
  const result = useMemo(() => {
    // Check required fields
    const missingFields: string[] = [];
    if (!calorieTarget) missingFields.push("meta calórica");
    if (!template) missingFields.push("template de macros");
    if (!bodyweightKg) missingFields.push("peso corporal");
    
    if (missingFields.length > 0 || !calorieTarget || !template || !bodyweightKg) {
      return {
        dailyMacros: null,
        mealDistribution: null,
        validation: { valid: false, warnings: ["Dados incompletos"] },
        isComplete: false,
        missingFields,
      };
    }
    
    // Apply template to get daily macros
    const dailyMacros = applyMacroTemplate(template, calorieTarget.tdee, bodyweightKg);
    
    // Validate against limits
    const validation = validateMacros(dailyMacros.grams, bodyweightKg, customLimits);
    
    // Distribute across meals
    const mealDistribution = distributeMacrosAcrossMeals(dailyMacros, 4);
    
    return {
      dailyMacros,
      mealDistribution,
      validation,
      isComplete: true,
      missingFields: [],
    };
  }, [calorieTarget, template, bodyweightKg, customLimits]);
  
  return result;
}

export default useMacros;
