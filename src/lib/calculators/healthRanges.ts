/**
 * Health Ranges & Status Classification
 * 
 * Provides healthy ranges by metric, sex, and age.
 * Returns status (healthy/attention/risk) and actionable guidance.
 */

import type { Gender } from "@/types/metrics";

// ==========================================
// TYPES
// ==========================================

export type HealthStatus = "healthy" | "attention" | "risk";

export interface HealthRange {
  min: number;
  max: number;
}

export interface MetricAnalysis {
  status: HealthStatus;
  statusLabelKey: string;
  healthyRange: HealthRange;
  currentValue: number;
  gapToHealthy: number | null;
  gapDirection: "increase" | "decrease" | null;
  messageKey: string;
  messageParams?: Record<string, any>;
  recommendation: string; // Keep as is for now or translate later
}

// ==========================================
// BMI RANGES
// ==========================================

const BMI_RANGES: HealthRange = { min: 18.5, max: 24.9 };

export function analyzeBMI(bmi: number): MetricAnalysis {
  const { min, max } = BMI_RANGES;

  let status: HealthStatus;
  let statusLabelKey: string;
  let gapToHealthy: number | null = null;
  let gapDirection: MetricAnalysis["gapDirection"] = null;
  let messageKey: string;
  let messageParams: Record<string, any> = {};
  let recommendation: string;

  if (bmi < min) {
    status = "attention";
    statusLabelKey = "health.status.belowIdeal";
    gapToHealthy = Math.round((min - bmi) * 10) / 10;
    gapDirection = "increase";
    messageKey = "health.bmiStatus_underweight";
    messageParams = { points: gapToHealthy };
    recommendation = "Considere aumentar a ingestão calórica com alimentos nutritivos.";
  } else if (bmi <= max) {
    status = "healthy";
    statusLabelKey = "health.status.healthy";
    messageKey = "health.bmiStatus_healthy";
    recommendation = "Continue mantendo hábitos equilibrados de alimentação e exercícios.";
  } else if (bmi <= 29.9) {
    status = "attention";
    statusLabelKey = "health.status.overweight";
    gapToHealthy = Math.round((bmi - max) * 10) / 10;
    gapDirection = "decrease";
    messageKey = "health.bmiStatus_overweight";
    messageParams = { points: gapToHealthy };
    recommendation = "Pequenas mudanças na dieta e atividade física podem ajudar.";
  } else {
    status = "risk";
    statusLabelKey = "health.status.obesity";
    gapToHealthy = Math.round((bmi - max) * 10) / 10;
    gapDirection = "decrease";
    messageKey = "health.bmiStatus_overweight"; // Reuse or create new
    messageParams = { points: gapToHealthy };
    recommendation = "Recomendamos acompanhamento profissional para um plano personalizado.";
  }

  return {
    status,
    statusLabelKey,
    healthyRange: BMI_RANGES,
    currentValue: bmi,
    gapToHealthy,
    gapDirection,
    messageKey,
    messageParams,
    recommendation,
  };
}

// ==========================================
// BODY FAT RANGES (by gender)
// ==========================================

const BODY_FAT_RANGES: Record<Gender, HealthRange> = {
  male: { min: 10, max: 20 },
  female: { min: 18, max: 28 },
};

export function analyzeBodyFat(percentage: number, gender: Gender): MetricAnalysis {
  const range = BODY_FAT_RANGES[gender];
  const { min, max } = range;

  let status: HealthStatus;
  let statusLabelKey: string;
  let gapToHealthy: number | null = null;
  let gapDirection: MetricAnalysis["gapDirection"] = null;
  let messageKey: string;
  let messageParams: Record<string, any> = {};
  let recommendation: string;

  if (percentage < min) {
    status = percentage < (gender === "male" ? 6 : 14) ? "risk" : "attention";
    statusLabelKey = percentage < (gender === "male" ? 6 : 14) ? "health.status.veryLow" : "health.status.belowIdeal";
    gapToHealthy = Math.round((min - percentage) * 10) / 10;
    gapDirection = "increase";
    messageKey = "health.bodyFatStatus_under";
    messageParams = { points: gapToHealthy };
    recommendation = status === "risk"
      ? "Níveis muito baixos podem afetar hormônios e saúde. Consulte um profissional."
      : "Considere uma alimentação mais calórica se não for atleta competitivo.";
  } else if (percentage <= max) {
    status = "healthy";
    statusLabelKey = "health.status.healthy";
    messageKey = "health.bodyFatStatus_healthy";
    recommendation = "Mantenha seus hábitos de exercício e alimentação equilibrada.";
  } else {
    const excess = percentage - max;
    status = excess > 10 ? "risk" : "attention";
    statusLabelKey = status === "risk" ? "health.status.high" : "health.status.aboveIdeal";
    gapToHealthy = Math.round(excess * 10) / 10;
    gapDirection = "decrease";
    messageKey = "health.bodyFatStatus_over";
    messageParams = { points: gapToHealthy };
    recommendation = status === "risk"
      ? "Recomendamos acompanhamento nutricional para um plano seguro."
      : "Atividade física regular e ajustes na dieta podem ajudar.";
  }

  return {
    status,
    statusLabelKey,
    healthyRange: range,
    currentValue: percentage,
    gapToHealthy,
    gapDirection,
    messageKey,
    messageParams,
    recommendation,
  };
}

// ==========================================
// WAIST-HIP RATIO (WHR) RANGES
// ==========================================

const WHR_RANGES: Record<Gender, HealthRange> = {
  male: { min: 0, max: 0.90 },
  female: { min: 0, max: 0.80 },
};

export function analyzeWHR(ratio: number, gender: Gender): MetricAnalysis {
  const range = WHR_RANGES[gender];
  const { max } = range;
  const moderateThreshold = gender === "male" ? 1.0 : 0.85;

  let status: HealthStatus;
  let statusLabelKey: string;
  let gapToHealthy: number | null = null;
  let gapDirection: MetricAnalysis["gapDirection"] = null;
  let messageKey: string;
  let messageParams: Record<string, any> = {};
  let recommendation: string;

  if (ratio <= max) {
    status = "healthy";
    statusLabelKey = "health.status.lowRisk";
    messageKey = "health.whrStatus_healthy";
    recommendation = "Continue mantendo uma cintura saudável com exercícios e boa alimentação.";
  } else if (ratio <= moderateThreshold) {
    status = "attention";
    statusLabelKey = "health.status.moderateRisk";
    gapToHealthy = Math.round((ratio - max) * 100) / 100;
    gapDirection = "decrease";
    messageKey = "health.whrStatus_moderate";
    messageParams = { points: gapToHealthy };
    recommendation = "Exercícios abdominais e aeróbicos ajudam a reduzir gordura abdominal.";
  } else {
    status = "risk";
    statusLabelKey = "health.status.highRisk";
    gapToHealthy = Math.round((ratio - max) * 100) / 100;
    gapDirection = "decrease";
    messageKey = "health.whrStatus_high";
    recommendation = "Recomendamos avaliação médica e plano de redução de gordura abdominal.";
  }

  return {
    status,
    statusLabelKey,
    healthyRange: range,
    currentValue: ratio,
    gapToHealthy,
    gapDirection,
    messageKey,
    messageParams,
    recommendation,
  };
}

// ==========================================
// WEIGHT ANALYSIS (based on ideal range)
// ==========================================

export function analyzeWeight(
  currentWeight: number,
  idealRange: { min: number; max: number }
): MetricAnalysis {
  const { min, max } = idealRange;

  let status: HealthStatus;
  let statusLabelKey: string;
  let gapToHealthy: number | null = null;
  let gapDirection: MetricAnalysis["gapDirection"] = null;
  let messageKey: string;
  let messageParams: Record<string, any> = {};
  let recommendation: string;

  if (currentWeight < min) {
    const gap = Math.round((min - currentWeight) * 10) / 10;
    status = gap > 10 ? "risk" : "attention";
    statusLabelKey = "health.status.belowIdeal";
    gapToHealthy = gap;
    gapDirection = "increase";
    messageKey = "health.weightStatus_under";
    messageParams = { points: gap };
    recommendation = "Aumente gradualmente a ingestão calórica com alimentos nutritivos.";
  } else if (currentWeight <= max) {
    status = "healthy";
    statusLabelKey = "health.status.idealWeight";
    messageKey = "health.weightStatus_healthy";
    recommendation = "Mantenha seus hábitos saudáveis!";
  } else {
    const gap = Math.round((currentWeight - max) * 10) / 10;
    status = gap > 15 ? "risk" : "attention";
    statusLabelKey = "health.status.aboveIdeal";
    gapToHealthy = gap;
    gapDirection = "decrease";
    messageKey = "health.weightStatus_over";
    messageParams = { points: gap };
    recommendation = status === "risk"
      ? "Recomendamos acompanhamento profissional para perda de peso segura."
      : "Pequenos ajustes na dieta e mais movimento podem ajudar.";
  }

  return {
    status,
    statusLabelKey,
    healthyRange: idealRange,
    currentValue: currentWeight,
    gapToHealthy,
    gapDirection,
    messageKey,
    messageParams,
    recommendation,
  };
}

// ==========================================
// CALORIE TARGET ANALYSIS
// ==========================================

export function analyzeCalorieTarget(
  target: number,
  tdee: number,
  goal: "lose_weight" | "maintain" | "gain_muscle"
): { messageKey: string; messageParams: any; recommendation: string } {
  const diff = target - tdee;

  if (goal === "lose_weight") {
    return {
      messageKey: "health.lose_weight_message",
      messageParams: { points: Math.abs(diff) },
      recommendation: "Um déficit moderado preserva massa muscular enquanto queima gordura.",
    };
  } else if (goal === "gain_muscle") {
    return {
      messageKey: "health.gain_muscle_message",
      messageParams: { points: diff },
      recommendation: "Combine com treino de força para ganhar músculo, não gordura.",
    };
  } else {
    return {
      messageKey: "health.maintain_message",
      messageParams: {},
      recommendation: "Ideal para recomposição corporal com treino adequado.",
    };
  }
}

// ==========================================
// STATUS COLORS (for UI)
// ==========================================

export function getStatusColor(status: HealthStatus): "success" | "warning" | "destructive" {
  switch (status) {
    case "healthy":
      return "success";
    case "attention":
      return "warning";
    case "risk":
      return "destructive";
  }
}
