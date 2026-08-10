/**
 * Metabolism Calculators
 * 
 * Pure functions for BMR, TDEE, and daily calorie targets.
 */

import {
  type Gender,
  type ActivityLevel,
  type FitnessGoal,
  type BMRResult,
  type TDEEResult,
  type DailyCalorieTarget,
  type ActivityMultipliers,
  type GoalCalorieAdjustments,
  DEFAULT_ACTIVITY_MULTIPLIERS,
  DEFAULT_GOAL_ADJUSTMENTS,
} from "@/types/metrics";

// ==========================================
// BMR CALCULATOR (Mifflin-St Jeor)
// ==========================================

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * 
 * Male: (10 × weight) + (6.25 × height) - (5 × age) + 5
 * Female: (10 × weight) + (6.25 × height) - (5 × age) - 161
 * 
 * This is considered the most accurate formula for most people.
 */
export function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): BMRResult {
  let bmr: number;
  
  if (gender === "male") {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }
  
  return {
    value: Math.round(bmr),
    formula: "mifflin_st_jeor",
  };
}

// ==========================================
// TDEE CALCULATOR
// ==========================================

/**
 * Calculate Total Daily Energy Expenditure
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
  multipliers: ActivityMultipliers = DEFAULT_ACTIVITY_MULTIPLIERS
): TDEEResult {
  const activityMultiplier = multipliers[activityLevel];
  const tdee = bmr * activityMultiplier;
  
  return {
    value: Math.round(tdee),
    bmr,
    activityMultiplier,
  };
}

// ==========================================
// DAILY CALORIE TARGET
// ==========================================

/**
 * Calculate daily calorie target adjusted for fitness goal
 */
export function calculateDailyCalorieTarget(
  tdee: number,
  goal: FitnessGoal,
  adjustments: GoalCalorieAdjustments = DEFAULT_GOAL_ADJUSTMENTS
): DailyCalorieTarget {
  const goalAdjustment = adjustments[goal];
  const adjustment = (tdee * goalAdjustment) / 100;
  const target = Math.round(tdee + adjustment);
  
  // Ensure minimum safe calorie intake
  const safeTarget = Math.max(1200, target);
  
  return {
    tdee,
    target: safeTarget,
    deficit: goal === "lose_weight" ? Math.abs(adjustment) : undefined,
    surplus: goal === "gain_muscle" ? adjustment : undefined,
    goalAdjustment,
  };
}

// ==========================================
// COMPLETE METABOLISM CALCULATION
// ==========================================

/**
 * Calculate complete metabolism profile from user data
 */
export function calculateMetabolism(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: FitnessGoal,
  customMultipliers?: ActivityMultipliers,
  customAdjustments?: GoalCalorieAdjustments
): {
  bmr: BMRResult;
  tdee: TDEEResult;
  dailyTarget: DailyCalorieTarget;
} {
  const multipliers = customMultipliers || DEFAULT_ACTIVITY_MULTIPLIERS;
  const adjustments = customAdjustments || DEFAULT_GOAL_ADJUSTMENTS;
  
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr.value, activityLevel, multipliers);
  const dailyTarget = calculateDailyCalorieTarget(tdee.value, goal, adjustments);
  
  return { bmr, tdee, dailyTarget };
}

// ==========================================
// WEIGHT CHANGE PROJECTIONS
// ==========================================

/**
 * Calculate estimated weeks to reach goal weight
 * Based on 0.5-1kg per week for sustainable weight loss/gain
 */
export function calculateWeeksToGoal(
  currentWeight: number,
  goalWeight: number,
  dailyCalorieTarget: number,
  tdee: number
): number {
  const weightDiff = Math.abs(goalWeight - currentWeight);
  
  // 1kg of fat ≈ 7700 kcal
  const dailyCalorieDiff = Math.abs(dailyCalorieTarget - tdee);
  
  if (dailyCalorieDiff === 0) return 0;
  
  const weeksToLoseOneKg = 7700 / (dailyCalorieDiff * 7);
  const totalWeeks = weightDiff * weeksToLoseOneKg;
  
  return Math.round(totalWeeks);
}

/**
 * Calculate estimated daily calories needed to reach goal in X weeks
 */
export function calculateCaloriesForGoal(
  currentWeight: number,
  goalWeight: number,
  tdee: number,
  weeks: number
): number {
  const weightDiff = goalWeight - currentWeight; // Can be negative
  const totalCalorieChange = weightDiff * 7700;
  const dailyCalorieChange = totalCalorieChange / (weeks * 7);
  
  return Math.round(tdee + dailyCalorieChange);
}
