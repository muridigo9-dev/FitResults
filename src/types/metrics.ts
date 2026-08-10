/**
 * Metrics Types
 * 
 * Core types for body measurements, calculations, and user profile data.
 */

// ==========================================
// USER PROFILE DATA
// ==========================================

export type Gender = "male" | "female";

export type ActivityLevel = 
  | "sedentary"      // Little or no exercise
  | "light"          // Light exercise 1-3 days/week
  | "moderate"       // Moderate exercise 3-5 days/week
  | "active"         // Hard exercise 6-7 days/week
  | "very_active";   // Very hard exercise, physical job

export type FitnessGoal = 
  | "lose_weight"    // Caloric deficit
  | "maintain"       // Maintenance
  | "gain_muscle";   // Caloric surplus

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  light: "Levemente ativo",
  moderate: "Moderadamente ativo",
  active: "Ativo",
  very_active: "Muito ativo",
};

export const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_weight: "Emagrecer",
  maintain: "Manter peso",
  gain_muscle: "Ganhar massa",
};

// ==========================================
// USER BODY PROFILE
// ==========================================

export interface UserBodyProfile {
  gender: Gender;
  age: number;
  height: number;        // cm
  currentWeight: number; // kg
  goalWeight?: number;   // kg
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  
  // Optional measurements for advanced calculations
  waistCircumference?: number;  // cm
  hipCircumference?: number;    // cm
  neckCircumference?: number;   // cm
}

// ==========================================
// BODY METRICS RESULTS
// ==========================================

export interface BMIResult {
  value: number;
  category: "underweight" | "normal" | "overweight" | "obese";
  label: string;
}

export interface BodyFatResult {
  percentage: number;
  category: "essential" | "athletic" | "fitness" | "average" | "obese";
  label: string;
  fatMass: number;    // kg
  leanMass: number;   // kg
}

export interface WHRResult {
  ratio: number;
  risk: "low" | "moderate" | "high";
  label: string;
}

export interface BodyCompositionResult {
  bmi: BMIResult;
  bodyFat?: BodyFatResult;
  whr?: WHRResult;
  idealWeightRange: {
    min: number;
    max: number;
  };
  weightToGoal?: number; // kg to lose or gain
}

// ==========================================
// METABOLISM RESULTS
// ==========================================

export interface BMRResult {
  value: number;          // kcal/day
  formula: "mifflin_st_jeor";
}

export interface TDEEResult {
  value: number;          // kcal/day
  bmr: number;
  activityMultiplier: number;
}

export interface DailyCalorieTarget {
  tdee: number;
  target: number;         // Adjusted for goal
  deficit?: number;       // If losing weight
  surplus?: number;       // If gaining weight
  goalAdjustment: number; // % adjustment
}

// ==========================================
// ACTIVITY MULTIPLIERS (Configurable)
// ==========================================

export interface ActivityMultipliers {
  sedentary: number;
  light: number;
  moderate: number;
  active: number;
  very_active: number;
}

export const DEFAULT_ACTIVITY_MULTIPLIERS: ActivityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ==========================================
// GOAL CALORIE ADJUSTMENTS (Configurable)
// ==========================================

export interface GoalCalorieAdjustments {
  lose_weight: number;   // e.g., -20 for 20% deficit
  maintain: number;      // 0
  gain_muscle: number;   // e.g., 10 for 10% surplus
}

export const DEFAULT_GOAL_ADJUSTMENTS: GoalCalorieAdjustments = {
  lose_weight: -20,
  maintain: 0,
  gain_muscle: 10,
};

// ==========================================
// METRICS CONFIGURATION (Admin)
// ==========================================

export interface MetricsConfiguration {
  activityMultipliers: ActivityMultipliers;
  goalAdjustments: GoalCalorieAdjustments;
  enableBodyFatCalculator: boolean;
  enableWHRCalculator: boolean;
  defaultActivityLevel: ActivityLevel;
  defaultFitnessGoal: FitnessGoal;
}

export const DEFAULT_METRICS_CONFIG: MetricsConfiguration = {
  activityMultipliers: DEFAULT_ACTIVITY_MULTIPLIERS,
  goalAdjustments: DEFAULT_GOAL_ADJUSTMENTS,
  enableBodyFatCalculator: true,
  enableWHRCalculator: true,
  defaultActivityLevel: "moderate",
  defaultFitnessGoal: "maintain",
};
