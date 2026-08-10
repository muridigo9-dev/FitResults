/**
 * Nutrition Types
 * 
 * Types for macronutrient calculations, meal planning, and nutrition templates.
 */

// ==========================================
// MACRONUTRIENT RESULTS
// ==========================================

export interface MacroDistribution {
  protein: number;      // percentage (0-100)
  carbs: number;        // percentage (0-100)
  fat: number;          // percentage (0-100)
}

export interface MacroGrams {
  protein: number;      // grams
  carbs: number;        // grams
  fat: number;          // grams
}

export interface DailyMacros {
  calories: number;
  distribution: MacroDistribution;
  grams: MacroGrams;
  perKgBodyweight: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ==========================================
// MACRO TEMPLATES
// ==========================================

export type MacroTemplateType = 
  | "weight_loss"
  | "maintenance"
  | "muscle_gain"
  | "custom";

export interface MacroTemplate {
  id: string;
  name: string;
  description: string;
  type: MacroTemplateType;
  distribution: MacroDistribution;
  calorieAdjustment: number;  // % adjustment from TDEE
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_MACRO_TEMPLATES: Omit<MacroTemplate, "id" | "createdAt">[] = [
  {
    name: "Emagrecimento",
    description: "Alto em proteína para preservar massa muscular durante déficit calórico",
    type: "weight_loss",
    distribution: { protein: 40, carbs: 30, fat: 30 },
    calorieAdjustment: -20,
    isDefault: true,
    isActive: true,
  },
  {
    name: "Manutenção",
    description: "Equilíbrio balanceado para manter peso e composição corporal",
    type: "maintenance",
    distribution: { protein: 30, carbs: 40, fat: 30 },
    calorieAdjustment: 0,
    isDefault: true,
    isActive: true,
  },
  {
    name: "Ganho de Massa",
    description: "Alto em carboidratos para suportar treinos intensos e crescimento muscular",
    type: "muscle_gain",
    distribution: { protein: 30, carbs: 45, fat: 25 },
    calorieAdjustment: 10,
    isDefault: true,
    isActive: true,
  },
];

// ==========================================
// NUTRITION LIMITS (Admin configurable)
// ==========================================

export interface NutritionLimits {
  minProteinPerKg: number;    // g/kg bodyweight
  maxProteinPerKg: number;
  minFatPerKg: number;
  maxFatPerKg: number;
  minCalories: number;
  maxCalories: number;
}

export const DEFAULT_NUTRITION_LIMITS: NutritionLimits = {
  minProteinPerKg: 1.2,
  maxProteinPerKg: 2.5,
  minFatPerKg: 0.5,
  maxFatPerKg: 1.5,
  minCalories: 1200,
  maxCalories: 5000,
};

// ==========================================
// NUTRITION CONFIGURATION (Admin)
// ==========================================

export interface NutritionConfiguration {
  templates: MacroTemplate[];
  limits: NutritionLimits;
  defaultTemplateId?: string;
  showMacrosInGrams: boolean;
  showMacrosInPercentage: boolean;
  showCaloriesPerMeal: boolean;
}

// ==========================================
// DAILY NUTRITION TRACKING
// ==========================================

export interface DailyNutritionLog {
  date: string;
  targetCalories: number;
  targetMacros: MacroGrams;
  consumedCalories: number;
  consumedMacros: MacroGrams;
  meals: MealLog[];
}

export interface MealLog {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  macros: MacroGrams;
  time: string;
}

// ==========================================
// NUTRITION SUMMARY
// ==========================================

export interface NutritionSummary {
  dailyTarget: DailyMacros;
  weeklyAverage?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    adherence: number; // 0-100%
  };
  templateInUse: MacroTemplate;
}
