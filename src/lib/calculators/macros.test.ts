/**
 * Unit Tests: Macro Calculators
 * 
 * Tests for macronutrient calculations.
 */
import { describe, it, expect, vi } from "vitest";
import {
  calculateMacroGrams,
  calculateCaloriesFromMacros,
  calculateDistributionFromGrams,
  calculateDailyMacros,
  validateMacros,
  distributeMacrosAcrossMeals,
} from "@/lib/calculators/macros";

describe("calculateMacroGrams", () => {
  it("should calculate macro grams from balanced distribution", () => {
    // 2000 calories, 30% protein, 40% carbs, 30% fat
    const result = calculateMacroGrams(2000, { protein: 30, carbs: 40, fat: 30 });

    // Protein: 2000 * 0.30 / 4 = 150g
    expect(result.protein).toBe(150);
    // Carbs: 2000 * 0.40 / 4 = 200g
    expect(result.carbs).toBe(200);
    // Fat: 2000 * 0.30 / 9 ≈ 67g
    expect(result.fat).toBe(67);
  });

  it("should calculate high protein distribution", () => {
    const result = calculateMacroGrams(2500, { protein: 40, carbs: 35, fat: 25 });

    expect(result.protein).toBe(250); // 2500 * 0.40 / 4
    expect(result.carbs).toBe(219); // 2500 * 0.35 / 4
    expect(result.fat).toBe(69); // 2500 * 0.25 / 9
  });

  it("should handle low calorie targets", () => {
    const result = calculateMacroGrams(1200, { protein: 30, carbs: 40, fat: 30 });

    expect(result.protein).toBe(90);
    expect(result.carbs).toBe(120);
    expect(result.fat).toBe(40);
  });

  it("should warn when distribution doesn't equal 100%", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    calculateMacroGrams(2000, { protein: 30, carbs: 40, fat: 20 }); // 90%
    
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("calculateCaloriesFromMacros", () => {
  it("should calculate calories from macro grams", () => {
    // 150g protein * 4 + 200g carbs * 4 + 67g fat * 9 = 600 + 800 + 603 = 2003
    const result = calculateCaloriesFromMacros({ protein: 150, carbs: 200, fat: 67 });
    expect(result).toBe(2003);
  });

  it("should handle zero macros", () => {
    const result = calculateCaloriesFromMacros({ protein: 0, carbs: 0, fat: 0 });
    expect(result).toBe(0);
  });

  it("should calculate correctly for high protein intake", () => {
    const result = calculateCaloriesFromMacros({ protein: 200, carbs: 150, fat: 50 });
    // 200*4 + 150*4 + 50*9 = 800 + 600 + 450 = 1850
    expect(result).toBe(1850);
  });
});

describe("calculateDistributionFromGrams", () => {
  it("should calculate percentage distribution from grams", () => {
    const result = calculateDistributionFromGrams({ protein: 150, carbs: 200, fat: 67 });

    // Total calories: 150*4 + 200*4 + 67*9 = 2003
    // Protein %: (150*4/2003)*100 ≈ 30%
    expect(result.protein).toBeCloseTo(30, 0);
    expect(result.carbs).toBeCloseTo(40, 0);
    expect(result.fat).toBeCloseTo(30, 0);
  });

  it("should return equal distribution for zero macros", () => {
    const result = calculateDistributionFromGrams({ protein: 0, carbs: 0, fat: 0 });

    expect(result.protein).toBeCloseTo(33.3, 1);
    expect(result.carbs).toBeCloseTo(33.3, 1);
    expect(result.fat).toBeCloseTo(33.4, 1);
  });
});

describe("calculateDailyMacros", () => {
  it("should calculate complete daily macros with per-kg values", () => {
    const result = calculateDailyMacros(
      2000,
      { protein: 30, carbs: 40, fat: 30 },
      80 // bodyweight kg
    );

    expect(result.calories).toBe(2000);
    expect(result.grams.protein).toBe(150);
    expect(result.perKgBodyweight.protein).toBeCloseTo(1.9, 1); // 150/80
  });
});

describe("validateMacros", () => {
  it("should validate macros within healthy ranges", () => {
    const result = validateMacros({ protein: 160, carbs: 200, fat: 70 }, 80);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("should warn for low protein intake", () => {
    const result = validateMacros({ protein: 40, carbs: 200, fat: 70 }, 80);

    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("Proteína muito baixa"))).toBe(true);
  });

  it("should warn for very low calories", () => {
    const result = validateMacros({ protein: 50, carbs: 100, fat: 30 }, 60);

    // Calories: 50*4 + 100*4 + 30*9 = 870
    expect(result.warnings.some((w) => w.includes("Calorias muito baixas"))).toBe(true);
  });

  it("should warn for very high calories", () => {
    const result = validateMacros({ protein: 300, carbs: 600, fat: 200 }, 80);

    expect(result.warnings.some((w) => w.includes("Calorias muito altas"))).toBe(true);
  });
});

describe("distributeMacrosAcrossMeals", () => {
  it("should distribute macros across 4 meals with default distribution", () => {
    const dailyMacros = {
      calories: 2000,
      distribution: { protein: 30, carbs: 40, fat: 30 },
      grams: { protein: 150, carbs: 200, fat: 67 },
      perKgBodyweight: { protein: 1.9, carbs: 2.5, fat: 0.8 },
    };

    const result = distributeMacrosAcrossMeals(dailyMacros, 4);

    expect(result).toHaveLength(4);
    expect(result[0].mealNumber).toBe(1);
    expect(result[0].calories).toBe(500); // 25% of 2000
    expect(result[1].calories).toBe(600); // 30% of 2000
    expect(result[2].calories).toBe(600); // 30% of 2000
    expect(result[3].calories).toBe(300); // 15% of 2000
  });

  it("should distribute evenly for non-4 meal counts", () => {
    const dailyMacros = {
      calories: 2100,
      distribution: { protein: 30, carbs: 40, fat: 30 },
      grams: { protein: 150, carbs: 210, fat: 70 },
      perKgBodyweight: { protein: 2, carbs: 2.6, fat: 0.9 },
    };

    const result = distributeMacrosAcrossMeals(dailyMacros, 3);

    expect(result).toHaveLength(3);
    expect(result[0].calories).toBe(700); // 1/3 of 2100
    expect(result[1].calories).toBe(700);
    expect(result[2].calories).toBe(700);
  });
});
