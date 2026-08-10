/**
 * Unit Tests: Metabolism Calculators
 * 
 * Tests for BMR, TDEE, and daily calorie calculations.
 */
import { describe, it, expect } from "vitest";
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyCalorieTarget,
  calculateMetabolism,
  calculateWeeksToGoal,
  calculateCaloriesForGoal,
} from "@/lib/calculators/metabolism";
import { DEFAULT_ACTIVITY_MULTIPLIERS, DEFAULT_GOAL_ADJUSTMENTS } from "@/types/metrics";

describe("calculateBMR", () => {
  it("should calculate BMR for male correctly (Mifflin-St Jeor)", () => {
    // Male, 30 years, 80kg, 180cm
    // Expected: (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 800 + 1125 - 150 + 5 = 1780
    const result = calculateBMR("male", 80, 180, 30);
    expect(result.value).toBe(1780);
    expect(result.formula).toBe("mifflin_st_jeor");
  });

  it("should calculate BMR for female correctly", () => {
    // Female, 25 years, 60kg, 165cm
    // Expected: (10 × 60) + (6.25 × 165) - (5 × 25) - 161 = 600 + 1031.25 - 125 - 161 ≈ 1345
    const result = calculateBMR("female", 60, 165, 25);
    expect(result.value).toBe(1345);
  });

  it("should handle young age", () => {
    const result = calculateBMR("male", 70, 175, 18);
    expect(result.value).toBeGreaterThan(1700);
  });

  it("should handle older age", () => {
    const result = calculateBMR("male", 70, 175, 60);
    expect(result.value).toBeLessThan(1600);
  });
});

describe("calculateTDEE", () => {
  it("should apply sedentary multiplier correctly", () => {
    const bmr = 1800;
    const result = calculateTDEE(bmr, "sedentary");
    expect(result.value).toBe(Math.round(1800 * DEFAULT_ACTIVITY_MULTIPLIERS.sedentary));
    expect(result.activityMultiplier).toBe(DEFAULT_ACTIVITY_MULTIPLIERS.sedentary);
    expect(result.bmr).toBe(bmr);
  });

  it("should apply light activity multiplier correctly", () => {
    const result = calculateTDEE(1800, "light");
    expect(result.value).toBe(Math.round(1800 * DEFAULT_ACTIVITY_MULTIPLIERS.light));
  });

  it("should apply moderate activity multiplier correctly", () => {
    const result = calculateTDEE(1800, "moderate");
    expect(result.value).toBe(Math.round(1800 * DEFAULT_ACTIVITY_MULTIPLIERS.moderate));
  });

  it("should apply active multiplier correctly", () => {
    const result = calculateTDEE(1800, "active");
    expect(result.value).toBe(Math.round(1800 * DEFAULT_ACTIVITY_MULTIPLIERS.active));
  });

  it("should apply very active multiplier correctly", () => {
    const result = calculateTDEE(1800, "very_active");
    expect(result.value).toBe(Math.round(1800 * DEFAULT_ACTIVITY_MULTIPLIERS.very_active));
  });

  it("should accept custom multipliers", () => {
    const customMultipliers = { ...DEFAULT_ACTIVITY_MULTIPLIERS, sedentary: 1.0 };
    const result = calculateTDEE(1800, "sedentary", customMultipliers);
    expect(result.value).toBe(1800);
  });
});

describe("calculateDailyCalorieTarget", () => {
  const tdee = 2500;

  it("should calculate maintenance calories", () => {
    const result = calculateDailyCalorieTarget(tdee, "maintain");
    expect(result.target).toBe(2500);
    expect(result.tdee).toBe(tdee);
    expect(result.deficit).toBeUndefined();
    expect(result.surplus).toBeUndefined();
  });

  it("should calculate weight loss deficit", () => {
    const result = calculateDailyCalorieTarget(tdee, "lose_weight");
    expect(result.target).toBeLessThan(tdee);
    expect(result.deficit).toBeDefined();
    expect(result.deficit).toBeGreaterThan(0);
  });

  it("should calculate muscle gain surplus", () => {
    const result = calculateDailyCalorieTarget(tdee, "gain_muscle");
    expect(result.target).toBeGreaterThan(tdee);
    expect(result.surplus).toBeDefined();
    expect(result.surplus).toBeGreaterThan(0);
  });

  it("should enforce minimum 1200 calories", () => {
    const lowTdee = 1400;
    const result = calculateDailyCalorieTarget(lowTdee, "lose_weight");
    expect(result.target).toBeGreaterThanOrEqual(1200);
  });

  it("should accept custom adjustments", () => {
    const customAdjustments = { ...DEFAULT_GOAL_ADJUSTMENTS, lose_weight: -30 };
    const result = calculateDailyCalorieTarget(tdee, "lose_weight", customAdjustments);
    expect(result.goalAdjustment).toBe(-30);
  });
});

describe("calculateMetabolism", () => {
  it("should calculate complete metabolism profile", () => {
    const result = calculateMetabolism("male", 80, 180, 30, "moderate", "lose_weight");

    expect(result.bmr).toBeDefined();
    expect(result.bmr.value).toBeGreaterThan(0);
    expect(result.tdee).toBeDefined();
    expect(result.tdee.value).toBeGreaterThan(result.bmr.value);
    expect(result.dailyTarget).toBeDefined();
    expect(result.dailyTarget.target).toBeLessThan(result.tdee.value);
  });

  it("should calculate muscle gain profile", () => {
    const result = calculateMetabolism("male", 70, 175, 25, "active", "gain_muscle");

    expect(result.dailyTarget.target).toBeGreaterThan(result.tdee.value);
    expect(result.dailyTarget.surplus).toBeDefined();
  });

  it("should calculate maintenance profile", () => {
    const result = calculateMetabolism("female", 55, 160, 28, "light", "maintain");

    expect(result.dailyTarget.target).toBe(result.tdee.value);
  });
});

describe("calculateWeeksToGoal", () => {
  it("should calculate weeks for weight loss", () => {
    const result = calculateWeeksToGoal(80, 75, 2000, 2500);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(52); // Less than a year for 5kg
  });

  it("should calculate weeks for weight gain", () => {
    const result = calculateWeeksToGoal(70, 75, 3000, 2500);
    expect(result).toBeGreaterThan(0);
  });

  it("should return 0 for no calorie difference", () => {
    const result = calculateWeeksToGoal(70, 75, 2500, 2500);
    expect(result).toBe(0);
  });

  it("should handle already at goal weight", () => {
    const result = calculateWeeksToGoal(70, 70, 2000, 2500);
    expect(result).toBe(0);
  });
});

describe("calculateCaloriesForGoal", () => {
  it("should calculate calories for weight loss in 12 weeks", () => {
    const result = calculateCaloriesForGoal(80, 75, 2500, 12);
    expect(result).toBeLessThan(2500);
  });

  it("should calculate calories for weight gain in 12 weeks", () => {
    const result = calculateCaloriesForGoal(70, 75, 2500, 12);
    expect(result).toBeGreaterThan(2500);
  });

  it("should return TDEE for maintaining weight", () => {
    const result = calculateCaloriesForGoal(70, 70, 2500, 12);
    expect(result).toBe(2500);
  });
});
