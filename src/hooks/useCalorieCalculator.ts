/**
 * useCalorieCalculator Hook
 * 
 * Provides metabolism and calorie calculations.
 * Automatically recalculates when inputs change.
 */

import { useMemo } from "react";
import type { 
  UserBodyProfile, 
  BMRResult, 
  TDEEResult, 
  DailyCalorieTarget,
  ActivityMultipliers,
  GoalCalorieAdjustments,
} from "@/types/metrics";
import { calculateMetabolism, calculateWeeksToGoal } from "@/lib/calculators";

interface UseCalorieCalculatorParams {
  profile: UserBodyProfile | null;
  customMultipliers?: ActivityMultipliers;
  customAdjustments?: GoalCalorieAdjustments;
}

interface UseCalorieCalculatorResult {
  bmr: BMRResult | null;
  tdee: TDEEResult | null;
  dailyTarget: DailyCalorieTarget | null;
  weeksToGoal: number | null;
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Calculate metabolism and calorie targets from user profile
 */
export function useCalorieCalculator({ 
  profile, 
  customMultipliers, 
  customAdjustments 
}: UseCalorieCalculatorParams): UseCalorieCalculatorResult {
  const result = useMemo(() => {
    if (!profile) {
      return {
        bmr: null,
        tdee: null,
        dailyTarget: null,
        weeksToGoal: null,
        isComplete: false,
        missingFields: ["profile"],
      };
    }
    
    // Check required fields
    const missingFields: string[] = [];
    if (!profile.gender) missingFields.push("sexo");
    if (!profile.age) missingFields.push("idade");
    if (!profile.height) missingFields.push("altura");
    if (!profile.currentWeight) missingFields.push("peso atual");
    if (!profile.activityLevel) missingFields.push("nível de atividade");
    if (!profile.fitnessGoal) missingFields.push("objetivo");
    
    if (missingFields.length > 0) {
      return {
        bmr: null,
        tdee: null,
        dailyTarget: null,
        weeksToGoal: null,
        isComplete: false,
        missingFields,
      };
    }
    
    // Calculate metabolism
    const { bmr, tdee, dailyTarget } = calculateMetabolism(
      profile.gender,
      profile.currentWeight,
      profile.height,
      profile.age,
      profile.activityLevel,
      profile.fitnessGoal,
      customMultipliers,
      customAdjustments
    );
    
    // Calculate weeks to goal (if goal weight is set)
    let weeksToGoal: number | null = null;
    if (profile.goalWeight && profile.goalWeight !== profile.currentWeight) {
      weeksToGoal = calculateWeeksToGoal(
        profile.currentWeight,
        profile.goalWeight,
        dailyTarget.target,
        tdee.value
      );
    }
    
    return {
      bmr,
      tdee,
      dailyTarget,
      weeksToGoal,
      isComplete: true,
      missingFields: [],
    };
  }, [profile, customMultipliers, customAdjustments]);
  
  return result;
}

export default useCalorieCalculator;
