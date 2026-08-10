import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DietPlan, DietPlanMeal, DietPlanMealOption, Dish } from "@/types/content";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import type { BlockReason } from "./useUserCapabilities";
import { resolveImageUrl } from "./useStorageUpload";
import { MEAL_TYPE_LABELS } from "@/lib/constants";

export interface DietPlansData {
    dietPlans: DietPlan[];
    isLoading: boolean;
    error: Error | null;
    blockReason: BlockReason;
    featureEnabled: boolean;
}

const mapPlanData = (plan: any): DietPlan => {
    // Strategy: Try to get meals from direct relationship first (Legacy/Simplified)
    // If empty, try to get from days -> meals mapping
    let rawSessions = plan.sessions || [];

    if (rawSessions.length === 0 && plan.days && plan.days.length > 0) {
        // Flatten meals from all days into a single daily view for now 
        // (Simplified model: we show the first day's meals as the "default" plan)
        rawSessions = plan.days[0].meals || [];
    }

    const sessions: DietPlanMeal[] = rawSessions
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((session: any) => {
            const items: DietPlanMealOption[] = (session.items || [])
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((item: any) => {
                    const dish = Array.isArray(item.dish) ? item.dish[0] : item.dish;
                    const modifier = Number(item.portion_scale) || 1.0;
                    const macros = {
                        calories: Math.round((dish?.calories || 0) * modifier),
                        protein: Number(((dish?.protein || 0) * modifier).toFixed(1)),
                        carbs: Number(((dish?.carbs || 0) * modifier).toFixed(1)),
                        fat: Number(((dish?.fat || 0) * modifier).toFixed(1)),
                    };

                    // Map ingredients (parity with useDiets.ts)
                    const legacyIngredients = (dish?.diet_ingredients || [])
                        .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                        .map((ing: any) => ({
                            id: ing.id,
                            name: ing.name || "",
                            quantity: ing.quantity || "",
                            unit: ing.unit || "",
                            isLegacy: true,
                            calories: 0,
                            protein: 0,
                            carbs: 0,
                            fat: 0
                        }));

                    const smartIngredients = (dish?.dish_ingredients || [])
                        .map((di: any) => ({
                            id: di.id,
                            ingredientId: di.ingredient_id,
                            name: di.ingredient?.name || "Unknown Ingredient",
                            quantity: Number(di.quantity) || 0,
                            unit: di.metric_unit || di.ingredient?.unit || "g",
                            isLegacy: false,
                            calories: (di.ingredient?.calories || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
                            protein: (di.ingredient?.protein || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
                            carbs: (di.ingredient?.carbs || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
                            fat: (di.ingredient?.fat || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
                        }));

                    return {
                        id: item.id,
                        dietPlanMealId: item.diet_plan_meal_id,
                        dishId: item.dish_id,
                        dishTitle: dish?.title || "Prato desconhecido",
                        dishImage: dish?.image_url || "",
                        portionModifier: modifier,
                        macros,
                        isMain: item.is_main || false,
                        parentItemId: item.parent_item_id,
                        dish: dish ? {
                            id: dish.id,
                            title: dish.title,
                            description: dish.description,
                            imageUrl: dish.image_url,
                            category: dish.category,
                            ingredients: [...legacyIngredients, ...smartIngredients],
                            macros: {
                                calories: dish.calories,
                                protein: dish.protein,
                                carbs: dish.carbs,
                                fat: dish.fat
                            }
                        } as any : undefined
                    };
                });

            return {
                id: session.id,
                name: session.name,
                orderIndex: session.order_index || 0,
                timeSuggestion: session.time_suggestion,
                items
            };
        });

    return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        objective: plan.objective,
        objectiveBadge: plan.objective_badge,
        durationDays: plan.duration_days || 7,
        visibilityType: plan.visibility || 'global',
        isActive: plan.is_active,
        sessions,
        imageUrl: resolveImageUrl('diet-images', plan.image_path, plan.image_url, sessions[0]?.items[0]?.dishImage),
        imagePath: plan.image_path,
        createdAt: plan.created_at
    } as DietPlan;
};

// DISH subquery for reuse
const DISH_SELECT_FRAGMENT = `
    *,
    diet_ingredients(*),
    dish_ingredients(
        *,
        ingredient:ingredients(*)
    )
`;

// Selection query string to be reused
const PLAN_SELECT_QUERY = `
    *,
    sessions:diet_plan_meals(
        *,
        items:diet_plan_items(
            *,
            dish:dishes(${DISH_SELECT_FRAGMENT})
        )
    ),
    days:diet_plan_days(
        *,
        meals:diet_plan_meals(
            *,
            items:diet_plan_items(
                *,
                dish:dishes(${DISH_SELECT_FRAGMENT})
            )
        )
    )
`;

export function useDietPlans(): DietPlansData {
    const { user } = useAuth();
    const { isEnabled } = useFeatureFlag('diets_enabled');

    const { data: dietPlans = [], isLoading, error } = useQuery({
        queryKey: ["diet-plans", user?.id],
        enabled: !!user && isEnabled,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            if (!user) return [];

            const { data: plans, error: plansError } = await supabase
                .from("diet_plans")
                .select(PLAN_SELECT_QUERY)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (plansError) {
                console.error("[useDietPlans] Error fetching plans:", plansError);
                throw plansError;
            }

            return (plans || []).map(mapPlanData);
        }
    });

    const blockReason: BlockReason = !user
        ? "not_authenticated"
        : !isEnabled
            ? "feature_disabled"
            : null;

    return {
        dietPlans,
        isLoading,
        error: error as Error | null,
        blockReason,
        featureEnabled: isEnabled
    };
}

export function useDietPlan(planId?: string) {
    const { user } = useAuth();
    const { isEnabled } = useFeatureFlag('diets_enabled');

    return useQuery({
        queryKey: ["diet-plan", planId, user?.id],
        enabled: !!user && !!planId && isEnabled,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            if (!user || !planId) return null;

            const { data: plan, error } = await supabase
                .from("diet_plans")
                .select(PLAN_SELECT_QUERY)
                .eq("id", planId)
                .single();

            if (error) {
                console.error("[useDietPlan] Error fetching plan:", error);
                throw error;
            }
            if (!plan) return null;

            return mapPlanData(plan);
        }
    });
}
