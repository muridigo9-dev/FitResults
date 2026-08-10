/**
 * Unit Tests: Body Metrics Calculators
 * 
 * Tests for BMI, Body Fat, WHR, and related calculations.
 */
import { describe, it, expect } from "vitest";
import {
  calculateBMI,
  calculateBodyFat,
  calculateWHR,
  calculateIdealWeightRange,
  calculateBodyComposition,
} from "@/lib/calculators/bodyMetrics";

describe("calculateBMI", () => {
  it("should calculate BMI correctly for normal weight", () => {
    const result = calculateBMI(70, 175);
    expect(result.value).toBeCloseTo(22.9, 1);
    expect(result.category).toBe("normal");
    expect(result.label).toBe("Peso normal");
  });

  it("should classify underweight correctly", () => {
    const result = calculateBMI(50, 175);
    expect(result.category).toBe("underweight");
    expect(result.label).toBe("Abaixo do peso");
  });

  it("should classify overweight correctly", () => {
    const result = calculateBMI(80, 170);
    expect(result.category).toBe("overweight");
    expect(result.label).toBe("Sobrepeso");
  });

  it("should classify obese correctly", () => {
    const result = calculateBMI(100, 170);
    expect(result.category).toBe("obese");
    expect(result.label).toBe("Obesidade");
  });

  it("should handle edge case at BMI 18.5 boundary", () => {
    // BMI = 18.5 for weight 56.65 and height 175
    const result = calculateBMI(56.65, 175);
    expect(result.value).toBeGreaterThanOrEqual(18.5);
    expect(result.category).toBe("normal");
  });

  it("should handle edge case at BMI 25 boundary", () => {
    // BMI = 25 for weight 76.56 and height 175
    const result = calculateBMI(76.6, 175);
    expect(result.value).toBeCloseTo(25, 0);
    expect(result.category).toBe("overweight");
  });
});

describe("calculateBodyFat", () => {
  it("should calculate body fat for male", () => {
    const result = calculateBodyFat("male", 175, 85, 38);
    expect(result).not.toBeNull();
    expect(result?.percentage).toBeGreaterThan(0);
    expect(result?.percentage).toBeLessThan(60);
  });

  it("should calculate body fat for female with hip measurement", () => {
    const result = calculateBodyFat("female", 165, 75, 34, 100, 60);
    expect(result).not.toBeNull();
    expect(result?.percentage).toBeGreaterThan(0);
    expect(result?.fatMass).toBeGreaterThan(0);
    expect(result?.leanMass).toBeGreaterThan(0);
  });

  it("should return null for female without hip measurement", () => {
    const result = calculateBodyFat("female", 165, 75, 34);
    expect(result).toBeNull();
  });

  it("should clamp body fat to valid range", () => {
    // Extreme values that would result in <3% or >60%
    const result = calculateBodyFat("male", 200, 65, 50); // Very low waist-neck diff
    expect(result?.percentage).toBeGreaterThanOrEqual(3);
    expect(result?.percentage).toBeLessThanOrEqual(60);
  });

  it("should classify athletic body fat correctly for male", () => {
    const result = calculateBodyFat("male", 180, 78, 38, undefined, 80);
    if (result && result.percentage >= 6 && result.percentage < 14) {
      expect(result.category).toBe("athletic");
    }
  });
});

describe("calculateWHR", () => {
  it("should calculate WHR correctly for male with low risk", () => {
    const result = calculateWHR("male", 80, 95);
    expect(result.ratio).toBeCloseTo(0.84, 2);
    expect(result.risk).toBe("low");
    expect(result.label).toBe("Baixo risco");
  });

  it("should classify moderate risk for male", () => {
    const result = calculateWHR("male", 92, 95);
    expect(result.risk).toBe("moderate");
    expect(result.label).toBe("Risco moderado");
  });

  it("should classify high risk for male", () => {
    const result = calculateWHR("male", 100, 95);
    expect(result.risk).toBe("high");
    expect(result.label).toBe("Alto risco");
  });

  it("should calculate WHR correctly for female with low risk", () => {
    const result = calculateWHR("female", 70, 95);
    expect(result.ratio).toBeCloseTo(0.74, 2);
    expect(result.risk).toBe("low");
  });

  it("should classify moderate risk for female", () => {
    const result = calculateWHR("female", 78, 95);
    expect(result.risk).toBe("moderate");
  });

  it("should classify high risk for female", () => {
    const result = calculateWHR("female", 85, 95);
    expect(result.risk).toBe("high");
  });
});

describe("calculateIdealWeightRange", () => {
  it("should calculate correct range for 175cm", () => {
    const result = calculateIdealWeightRange(175);
    expect(result.min).toBeCloseTo(56.7, 0);
    expect(result.max).toBeCloseTo(76.3, 0);
  });

  it("should calculate correct range for 160cm", () => {
    const result = calculateIdealWeightRange(160);
    expect(result.min).toBeCloseTo(47.4, 0);
    expect(result.max).toBeCloseTo(63.7, 0);
  });

  it("should calculate correct range for 190cm", () => {
    const result = calculateIdealWeightRange(190);
    expect(result.min).toBeCloseTo(66.8, 0);
    expect(result.max).toBeCloseTo(89.9, 0);
  });
});

describe("calculateBodyComposition", () => {
  it("should calculate full body composition with all measurements", () => {
    const profile = {
      gender: "male" as const,
      height: 175,
      currentWeight: 75,
      goalWeight: 72,
      waistCircumference: 85,
      hipCircumference: 95,
      neckCircumference: 38,
      age: 30,
      activityLevel: "moderate" as const,
      fitnessGoal: "maintain" as const,
    };

    const result = calculateBodyComposition(profile);

    expect(result.bmi).toBeDefined();
    expect(result.bmi.value).toBeCloseTo(24.5, 0);
    expect(result.idealWeightRange).toBeDefined();
    expect(result.bodyFat).toBeDefined();
    expect(result.whr).toBeDefined();
    expect(result.weightToGoal).toBe(-3);
  });

  it("should calculate partial composition without measurements", () => {
    const profile = {
      gender: "female" as const,
      height: 165,
      currentWeight: 60,
      age: 25,
      activityLevel: "light" as const,
      fitnessGoal: "maintain" as const,
    };

    const result = calculateBodyComposition(profile);

    expect(result.bmi).toBeDefined();
    expect(result.idealWeightRange).toBeDefined();
    expect(result.bodyFat).toBeUndefined();
    expect(result.whr).toBeUndefined();
    expect(result.weightToGoal).toBeUndefined();
  });
});
