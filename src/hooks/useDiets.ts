import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Diet, Ingredient, PreparationStep, DietMacros } from "@/types/content";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import type { BlockReason } from "./useUserCapabilities";

/**
 * Return type for useDiets hook
 */
export interface DietsData {
  systemDiets: Diet[];
  userDiets: Diet[];
  allDiets: Diet[];
  isLoading: boolean;
  error: Error | null;
  /** Reason why content is blocked (null if accessible) */
  blockReason: BlockReason;
  /** Whether the diets feature is enabled */
  featureEnabled: boolean;
}

export function useDiets(): DietsData {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlag('diets_enabled');

  // =====================================================
  // FETCH SYSTEM DIETS (Global + Assigned)
  // Simplified query - RLS handles visibility
  // =====================================================
  const { data: systemDiets = [], isLoading: loadingSystem, error: errorSystem } = useQuery({
    queryKey: ["diets", "system", user?.id],
    enabled: !!user && isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: "always",
    queryFn: async () => {
      if (!user) return [];

      // RLS policy (can_view_content) handles visibility logic
      const { data: diets, error } = await supabase
        .from("dishes")
        .select(`
          *,
          diet_ingredients(*),
          dish_ingredients(
            *,
            ingredient:ingredients(
                id,
                name,
                unit,
                calories,
                protein,
                carbs,
                fat,
                reference_value
            )
          ),
          diet_preparation_steps(*)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useDiets] Error fetching system diets:", error);
        throw error;
      }

      if (!diets || diets.length === 0) {
        return [];
      }

      // Fetch related data for each diet
      const dietsWithDetails = diets.map((diet: any) => {
        // Image Logic: Prefer image_path, fallback to image_url
        let finalImageUrl = diet.image_url;
        if (diet.image_path) {
          const { data: publicUrlData } = supabase.storage.from('diet-images').getPublicUrl(diet.image_path);
          finalImageUrl = publicUrlData.publicUrl;
        }

        // Map Legacy Ingredients
        const legacyIngredients = (diet.diet_ingredients || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((ing: any) => ({
            id: ing.id,
            name: ing.name || "",
            quantity: ing.quantity || "",
            unit: ing.unit || "",
            isLegacy: true,
            // Legacy ingredients don't have per-unit macros easily available without calculation
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          }));

        // Map Smart Ingredients
        const smartIngredients = (diet.dish_ingredients || [])
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

        const preparation: PreparationStep[] = (diet.diet_preparation_steps || [])
          .sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0))
          .map((step: any) => ({
            id: step.id,
            order: step.step_order || 0,
            description: step.description || "",
          }));

        const macros: DietMacros = {
          calories: diet.calories || 0,
          protein: Number(diet.protein) || 0,
          carbs: Number(diet.carbs) || 0,
          fat: Number(diet.fat) || 0,
        };

        return {
          id: diet.id,
          title: diet.title || "Dieta sem título",
          description: diet.description || "",
          imageUrl: finalImageUrl || "",
          category: diet.category || "other",
          ingredients: [...legacyIngredients, ...smartIngredients],
          preparation,
          macros,
          isActive: diet.is_active ?? true,
          createdAt: diet.created_at || new Date().toISOString(),
          contentOrigin: diet.content_origin || "system",
        } as Diet;
      });

      return dietsWithDetails;
    },
  });

  // =====================================================
  // FETCH USER DIETS (User-created content)
  // =====================================================
  const { data: userDiets = [], isLoading: loadingUser, error: errorUser } = useQuery({
    queryKey: ["diets", "user", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return [];

      const { data: diets, error } = await supabase
        .from("user_diets")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useDiets] Error fetching user diets:", error);
        throw error;
      }

      if (!diets || diets.length === 0) {
        return [];
      }

      return diets.map((diet) => {
        const ingredients = Array.isArray(diet.ingredients)
          ? (diet.ingredients as unknown as Ingredient[])
          : [];
        const preparation = Array.isArray(diet.preparation)
          ? (diet.preparation as unknown as PreparationStep[])
          : [];

        const macros: DietMacros = {
          calories: diet.calories || 0,
          protein: diet.protein || 0,
          carbs: diet.carbs || 0,
          fat: diet.fat || 0,
        };

        return {
          id: diet.id,
          title: diet.title || "Dieta sem título",
          description: diet.description || "",
          imageUrl: diet.image_url || "", // ✅ Empty string if no image
          category: diet.category || "other",
          ingredients,
          preparation,
          macros,
          isActive: diet.is_active ?? true,
          createdAt: diet.created_at || new Date().toISOString(),
          contentOrigin: "user",
        } as Diet;
      });
    },
  });

  const allDiets = [...systemDiets, ...userDiets];
  const isLoading = loadingSystem || loadingUser;
  const error = errorSystem || errorUser;

  // Determine block reason
  const blockReason: BlockReason = !user
    ? "not_authenticated"
    : !isEnabled
      ? "feature_disabled"
      : null;

  return {
    systemDiets,
    userDiets,
    allDiets,
    isLoading,
    error: error as Error | null,
    blockReason,
    featureEnabled: isEnabled,
  };
}
