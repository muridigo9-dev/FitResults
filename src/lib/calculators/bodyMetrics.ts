/**
 * Body Metrics Calculators
 * 
 * Pure functions for anthropometric calculations.
 * All functions are testable and have no side effects.
 */

import type { 
  Gender, 
  BMIResult, 
  BodyFatResult, 
  WHRResult,
  BodyCompositionResult,
  UserBodyProfile,
} from "@/types/metrics";

// ==========================================
// BMI CALCULATOR
// ==========================================

/**
 * Calculate BMI (Body Mass Index)
 * Formula: weight (kg) / height (m)²
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBmi = Math.round(bmi * 10) / 10;
  
  let category: BMIResult["category"];
  let label: string;
  
  if (roundedBmi < 18.5) {
    category = "underweight";
    label = "Abaixo do peso";
  } else if (roundedBmi < 25) {
    category = "normal";
    label = "Peso normal";
  } else if (roundedBmi < 30) {
    category = "overweight";
    label = "Sobrepeso";
  } else {
    category = "obese";
    label = "Obesidade";
  }
  
  return { value: roundedBmi, category, label };
}

// ==========================================
// BODY FAT CALCULATOR (Navy Formula)
// ==========================================

/**
 * Calculate body fat percentage using US Navy formula
 * Requires: waist, neck, and hip (for women) circumferences
 * 
 * Male formula: 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
 * Female formula: 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
 */
export function calculateBodyFat(
  gender: Gender,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm?: number,
  weightKg?: number
): BodyFatResult | null {
  // Women require hip measurement
  if (gender === "female" && !hipCm) {
    return null;
  }
  
  let bodyFatPercentage: number;
  
  if (gender === "male") {
    bodyFatPercentage = 
      86.010 * Math.log10(waistCm - neckCm) - 
      70.041 * Math.log10(heightCm) + 
      36.76;
  } else {
    bodyFatPercentage = 
      163.205 * Math.log10(waistCm + (hipCm || 0) - neckCm) - 
      97.684 * Math.log10(heightCm) - 
      78.387;
  }
  
  // Clamp to valid range
  bodyFatPercentage = Math.max(3, Math.min(60, bodyFatPercentage));
  const rounded = Math.round(bodyFatPercentage * 10) / 10;
  
  // Determine category
  const { category, label } = getBodyFatCategory(gender, rounded);
  
  // Calculate fat and lean mass
  const fatMass = weightKg ? (weightKg * rounded) / 100 : 0;
  const leanMass = weightKg ? weightKg - fatMass : 0;
  
  return {
    percentage: rounded,
    category,
    label,
    fatMass: Math.round(fatMass * 10) / 10,
    leanMass: Math.round(leanMass * 10) / 10,
  };
}

function getBodyFatCategory(
  gender: Gender, 
  percentage: number
): { category: BodyFatResult["category"]; label: string } {
  if (gender === "male") {
    if (percentage < 6) return { category: "essential", label: "Essencial" };
    if (percentage < 14) return { category: "athletic", label: "Atlético" };
    if (percentage < 18) return { category: "fitness", label: "Fitness" };
    if (percentage < 25) return { category: "average", label: "Médio" };
    return { category: "obese", label: "Acima do ideal" };
  } else {
    if (percentage < 14) return { category: "essential", label: "Essencial" };
    if (percentage < 21) return { category: "athletic", label: "Atlético" };
    if (percentage < 25) return { category: "fitness", label: "Fitness" };
    if (percentage < 32) return { category: "average", label: "Médio" };
    return { category: "obese", label: "Acima do ideal" };
  }
}

// ==========================================
// WAIST-HIP RATIO (WHR)
// ==========================================

/**
 * Calculate Waist-Hip Ratio
 * Simple division: waist / hip
 */
export function calculateWHR(
  gender: Gender,
  waistCm: number, 
  hipCm: number
): WHRResult {
  const ratio = Math.round((waistCm / hipCm) * 100) / 100;
  
  let risk: WHRResult["risk"];
  let label: string;
  
  if (gender === "male") {
    if (ratio < 0.90) {
      risk = "low";
      label = "Baixo risco";
    } else if (ratio < 1.0) {
      risk = "moderate";
      label = "Risco moderado";
    } else {
      risk = "high";
      label = "Alto risco";
    }
  } else {
    if (ratio < 0.80) {
      risk = "low";
      label = "Baixo risco";
    } else if (ratio < 0.85) {
      risk = "moderate";
      label = "Risco moderado";
    } else {
      risk = "high";
      label = "Alto risco";
    }
  }
  
  return { ratio, risk, label };
}

// ==========================================
// IDEAL WEIGHT RANGE
// ==========================================

/**
 * Calculate ideal weight range based on height
 * Using BMI range of 18.5 - 24.9
 */
export function calculateIdealWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  const heightSquared = heightM * heightM;
  
  return {
    min: Math.round(18.5 * heightSquared * 10) / 10,
    max: Math.round(24.9 * heightSquared * 10) / 10,
  };
}

// ==========================================
// COMPLETE BODY COMPOSITION
// ==========================================

/**
 * Calculate complete body composition from user profile
 */
export function calculateBodyComposition(profile: UserBodyProfile): BodyCompositionResult {
  const { gender, height, currentWeight, goalWeight, waistCircumference, hipCircumference, neckCircumference } = profile;
  
  // BMI (always calculated)
  const bmi = calculateBMI(currentWeight, height);
  
  // Ideal weight range
  const idealWeightRange = calculateIdealWeightRange(height);
  
  // Body fat (if measurements available)
  let bodyFat: BodyFatResult | undefined;
  if (waistCircumference && neckCircumference) {
    const result = calculateBodyFat(
      gender, 
      height, 
      waistCircumference, 
      neckCircumference, 
      hipCircumference,
      currentWeight
    );
    if (result) {
      bodyFat = result;
    }
  }
  
  // WHR (if measurements available)
  let whr: WHRResult | undefined;
  if (waistCircumference && hipCircumference) {
    whr = calculateWHR(gender, waistCircumference, hipCircumference);
  }
  
  // Weight to goal
  let weightToGoal: number | undefined;
  if (goalWeight) {
    weightToGoal = Math.round((goalWeight - currentWeight) * 10) / 10;
  }
  
  return {
    bmi,
    bodyFat,
    whr,
    idealWeightRange,
    weightToGoal,
  };
}
