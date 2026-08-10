import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Diet, Ingredient, PreparationStep } from "@/types/content";
import { useAuth } from "@/contexts/AuthContext";

// Reusing fetching logic structure but tailored for student view
// We rely on RLS to filter the dishes visible to this student
async function fetchStudentDishes(): Promise<Diet[]> {
    const { data, error } = await supabase
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
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching dishes:", error);
        throw error;
    }

    return (data || []).map(dietRaw => {
        const diet = dietRaw as any;

        // Image Logic: Prefer image_path, fallback to image_url
        let finalImageUrl = diet.image_url;
        if (diet.image_path) {
            const { data: publicUrlData } = supabase.storage.from('diet-images').getPublicUrl(diet.image_path);
            finalImageUrl = publicUrlData.publicUrl;
        } else if (diet.image_url) {
            finalImageUrl = diet.image_url;
        }

        // Map Legacy Ingredients
        const legacyIngredients = (diet.diet_ingredients || [])
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((ing: any) => ({
                id: ing.id,
                name: ing.name || "",
                quantity: ing.quantity || "",
                unit: ing.unit || "",
                isLegacy: true
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

        return {
            id: diet.id,
            title: diet.title,
            description: diet.description || "",
            imageUrl: finalImageUrl || "",
            imagePath: diet.image_path || undefined,
            category: diet.category || "",
            ingredients: [...legacyIngredients, ...smartIngredients],
            preparation: (diet.diet_preparation_steps || [])
                .sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0))
                .map((step: any): PreparationStep => ({
                    id: step.id,
                    order: step.step_order || 0,
                    description: step.description || "",
                })),
            macros: {
                calories: diet.calories || 0,
                protein: Number(diet.protein) || 0,
                carbs: Number(diet.carbs) || 0,
                fat: Number(diet.fat) || 0,
            },
            isActive: diet.is_active ?? true,
            createdAt: diet.created_at || "",
            visibilityType: diet.visibility || 'global',
            ownerType: diet.owner_type || 'admin',
            ownerId: diet.owner_id,
            contentOrigin: diet.content_origin || (diet.owner_type === 'student' ? 'user' : 'system'),
        };
    });
}

async function fetchActiveIngredients(): Promise<Ingredient[]> {
    // Students only see active ingredients
    const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) throw error;

    return data.map(ing => ({
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        calories: Number(ing.calories),
        protein: Number(ing.protein),
        carbs: Number(ing.carbs),
        fat: Number(ing.fat),
        referenceValue: Number(ing.reference_value),
        isActive: true,
        createdAt: ing.created_at || "",
    }));
}

export function useStudentNutrition() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const dishesQuery = useQuery({
        queryKey: ["student-dishes", user?.id],
        queryFn: fetchStudentDishes,
        enabled: !!user,
    });

    const ingredientsQuery = useQuery({
        queryKey: ["active-ingredients"],
        queryFn: fetchActiveIngredients,
    });

    const createDishMutation = useMutation({
        mutationFn: async (data: Omit<Diet, "id" | "createdAt" | "isActive">) => {
            // 1. Insert Dish
            const { data: newDish, error } = await supabase
                .from("dishes")
                .insert({
                    title: data.title,
                    description: data.description,
                    image_url: data.imageUrl,
                    image_path: data.imagePath || null,
                    category: data.category,
                    calories: data.macros.calories,
                    protein: data.macros.protein,
                    carbs: data.macros.carbs,
                    fat: data.macros.fat,
                    is_active: true,
                    owner_type: 'student',
                    owner_id: user?.id,
                    visibility: 'private', // Enforce private for students
                    content_origin: 'user',
                })
                .select()
                .single();

            if (error) throw error;

            // 2. Insert Ingredients (Only Smart Supported for new student dishes)
            const smartIngredients = data.ingredients.filter(ing => !ing.isLegacy && ing.ingredientId);

            if (smartIngredients.length > 0) {
                await supabase.from("dish_ingredients").insert(
                    smartIngredients.map((ing) => ({
                        dish_id: newDish.id,
                        ingredient_id: ing.ingredientId!,
                        quantity: Number(ing.quantity) || 0,
                        metric_unit: ing.unit
                    }))
                );
            }

            // 3. Insert Preparation Steps
            if (data.preparation.length > 0) {
                await supabase.from("diet_preparation_steps").insert(
                    data.preparation.map((step, idx) => ({
                        diet_id: newDish.id,
                        step_order: idx + 1,
                        description: step.description,
                    }))
                );
            }

            return newDish;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-dishes"] });
            toast.success("Prato criado com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error creating dish:", error);
            toast.error("Erro ao criar prato: " + error.message);
        }
    });

    const updateDishMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Omit<Diet, "id" | "createdAt" | "isActive"> }) => {
            // 1. Update Dish
            const { error } = await supabase
                .from("dishes")
                .update({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    image_url: data.imageUrl,
                    image_path: data.imagePath || null,
                    calories: data.macros.calories,
                    protein: data.macros.protein,
                    carbs: data.macros.carbs,
                    fat: data.macros.fat,
                })
                .eq("id", id)
                .eq("owner_id", user?.id); // Extra safety

            if (error) throw error;

            // 2. Update Ingredients (Full replace is easiest for now)
            // First delete existing
            await supabase.from("dish_ingredients").delete().eq("dish_id", id);

            // Insert new
            const smartIngredients = data.ingredients.filter(ing => !ing.isLegacy && ing.ingredientId);
            if (smartIngredients.length > 0) {
                await supabase.from("dish_ingredients").insert(
                    smartIngredients.map((ing) => ({
                        dish_id: id,
                        ingredient_id: ing.ingredientId!,
                        quantity: Number(ing.quantity) || 0,
                        metric_unit: ing.unit
                    }))
                );
            }

            // 3. Update Preparation Steps (Full replace)
            await supabase.from("diet_preparation_steps").delete().eq("diet_id", id);
            if (data.preparation.length > 0) {
                await supabase.from("diet_preparation_steps").insert(
                    data.preparation.map((step, idx) => ({
                        diet_id: id,
                        step_order: idx + 1,
                        description: step.description,
                    }))
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-dishes"] });
            toast.success("Prato atualizado com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error updating dish:", error);
            toast.error("Erro ao atualizar prato: " + error.message);
        }
    });

    const deleteDishMutation = useMutation({
        mutationFn: async (dishId: string) => {
            const { error } = await supabase
                .from("dishes")
                .delete()
                .eq("id", dishId)
                .eq("owner_id", user?.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-dishes"] });
            toast.success("Prato removido com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error deleting dish:", error);
            toast.error("Erro ao remover prato: " + error.message);
        }
    });

    return {
        dishes: dishesQuery.data || [],
        isLoadingDishes: dishesQuery.isLoading,
        ingredients: ingredientsQuery.data || [],
        isLoadingIngredients: ingredientsQuery.isLoading,
        createDish: createDishMutation.mutateAsync,
        isCreating: createDishMutation.isPending,
        updateDish: updateDishMutation.mutateAsync,
        isUpdating: updateDishMutation.isPending,
        deleteDish: deleteDishMutation.mutateAsync,
        isDeleting: deleteDishMutation.isPending,
    };
}
