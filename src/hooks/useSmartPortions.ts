import { useMemo } from "react";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { Diet, DietMacros } from "@/types/content";

// Heuristic for meal distribution based on dish category
const MEAL_DISTRIBUTION: Record<string, number> = {
    "Café da Manhã": 0.25,
    "Almoço": 0.35,
    "Jantar": 0.25,
    "Lanche": 0.15,
    "Pré-Treino": 0.10, // Assuming extra or part of snack
    "Pós-Treino": 0.15,
    "Ceia": 0.10,
};

const DEFAULT_SHARE = 0.25; // Fallback

export function useSmartPortions(dish: Diet) {
    const { calorieTarget, dailyMacros } = useUserMetrics();

    return useMemo(() => {
        if (!calorieTarget || !dailyMacros || !dish.macros.calories) {
            return {
                multiplier: 1,
                suggestedMacros: dish.macros,
                isSmart: false,
                targetCalories: 0
            };
        }

        // 1. Determine Target Calories for this Meal
        const share = MEAL_DISTRIBUTION[dish.category || ""] || DEFAULT_SHARE;
        const targetCalories = Math.round(calorieTarget.target * share);

        // 2. Calculate Multiplier
        // Avoid division by zero
        const baseCalories = dish.macros.calories > 0 ? dish.macros.calories : targetCalories;
        let multiplier = targetCalories / baseCalories;

        // Clamp multiplier to reasonable limits (e.g. 0.5x to 3.0x) to avoid extreme suggestions
        multiplier = Math.max(0.5, Math.min(3.0, multiplier));

        // Round to 2 decimal places
        multiplier = Math.round(multiplier * 100) / 100;

        const suggestedMacros: DietMacros = {
            calories: Math.round(dish.macros.calories * multiplier),
            protein: Math.round(dish.macros.protein * multiplier),
            carbs: Math.round(dish.macros.carbs * multiplier),
            fat: Math.round(dish.macros.fat * multiplier),
        };

        return {
            multiplier,
            suggestedMacros,
            isSmart: true,
            targetCalories
        };
    }, [dish, calorieTarget, dailyMacros]);
}
