import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// import { useUnifiedVisibility } from "./useUnifiedVisibility";

// Extend Dish type for frontend usage if needed (mapping from DB 'dishes')
export interface AdminDish {
    id: string;
    title: string;
    description: string;
    image_url?: string;
    // Correct Frontend Type (CamelCase)
    visibilityType: 'global' | 'academy' | 'private' | 'plan_restricted';
    planIds?: string[];
    isActive: boolean;
    createdAt: string;
    category?: string;
    academy_id?: string;
    ingredients?: AdminDishIngredient[];
    owner?: {
        full_name: string | null;
        email: string | null;
    };
}

export interface AdminDishIngredient {
    id: string; // link table id
    ingredient_id: string;
    name: string;
    quantity: number;
    metric_unit: string;
}

async function fetchDishes(): Promise<AdminDish[]> {
    const { data: dishes, error } = await supabase
        .from("dishes")
        .select(`
            *,
            dish_ingredients (
                id,
                quantity,
                metric_unit,
                ingredients ( id, name, unit )
            ),
            owner:profiles!dishes_owner_id_fkey (
                full_name,
                email
            )
        `)
        .order("title", { ascending: true });

    if (error) {
        console.error("Error fetching dishes:", error);
        toast.error("Erro ao carregar pratos: " + error.message);
        throw error;
    }

    // Cast to any[] to handle new columns (visibility, plan_ids) not yet in Supabase types
    const typedDishes = dishes as any[];

    return typedDishes.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        image_url: d.image_url,
        // Map DB 'visibility' to frontend 'visibilityType'
        visibilityType: d.visibility || 'global',
        planIds: d.plan_ids || [],
        category: d.category,
        academy_id: d.academy_id,

        isActive: d.is_active ?? true,
        createdAt: d.created_at,
        ingredients: d.dish_ingredients?.map((di: any) => ({
            id: di.id,
            ingredient_id: di.ingredients.id,
            name: di.ingredients.name,
            quantity: di.quantity,
            metric_unit: di.metric_unit || di.ingredients.unit
        })) || [],
        owner: d.owner ? {
            full_name: d.owner.full_name,
            email: d.owner.email
        } : undefined
    }));
}

export function useAdminDishes() {
    const queryClient = useQueryClient();
    // const { saveVisibilityConfig } = useUnifiedVisibility();

    const dishesQuery = useQuery({
        queryKey: ["admin-dishes"],
        queryFn: fetchDishes,
        staleTime: 0, // DISABLED CACHE
    });

    // Save Dish
    const saveDishMutation = useMutation({
        mutationFn: async ({ id, data }: { id?: string; data: any }) => {
            // 1. Save main dish data
            const dishPayload = {
                title: data.title,
                description: data.description,
                image_url: data.imageUrl, // Map 'imageUrl' form field to 'image_url' db column
                category: data.category || "Main",
                is_active: data.isActive,
                // We save visibility via simplified hook or directly here if needed
                visibility: data.visibilityType || 'global',
                plan_ids: data.planIds || [],
                owner_id: (await supabase.auth.getUser()).data.user?.id
            };

            let dishId = id;

            if (id) {
                const { error } = await supabase
                    .from("dishes")
                    .update(dishPayload)
                    .eq("id", id);
                if (error) throw error;
            } else {
                const { data: newDish, error } = await supabase
                    .from("dishes")
                    .insert(dishPayload)
                    .select()
                    .single();
                if (error) throw error;
                dishId = newDish.id;
            }

            if (!dishId) throw new Error("Failed to get dish ID");

            // 2. Handle Ingredients (simple delete and re-insert strategy)
            if (data.ingredients && data.ingredients.length > 0) {
                if (id) {
                    await supabase.from("dish_ingredients").delete().eq("dish_id", id);
                }

                const ingredientsPayload = data.ingredients.map((ing: any) => ({
                    dish_id: dishId,
                    ingredient_id: ing.ingredientId || ing.id, // Handle both structures
                    quantity: Number(ing.quantity),
                    metric_unit: ing.unit
                })).filter((i: any) => i.ingredient_id); // Ensure valid ingredients

                if (ingredientsPayload.length > 0) {
                    const { error: ingError } = await supabase
                        .from("dish_ingredients")
                        .insert(ingredientsPayload);
                    if (ingError) throw ingError;
                }
            }

            // REMOVED REDUNDANT saveVisibilityConfig call

            return dishId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
            toast.success("Prato salvo com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao salvar prato: " + error.message);
        }
    });

    // Delete Dish
    const deleteDishMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("dishes")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
            toast.success("Prato removido!");
        },
        onError: (error: any) => {
            toast.error("Erro ao remover: " + error.message);
        }
    });

    // Export Dishes
    const exportDishesMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('export_dishes');
            if (error) throw error;
            return data;
        },
        onError: (error: any) => {
            toast.error("Erro ao exportar pratos: " + error.message);
        }
    });

    // Import Dishes
    const importDishesMutation = useMutation({
        mutationFn: async (json: any) => {
            const { error } = await supabase.rpc('import_dishes', { import_data: json });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
            toast.success("Pratos importados com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao importar pratos: " + error.message);
        }
    });

    return {
        dishes: dishesQuery.data || [],
        isLoading: dishesQuery.isLoading,
        saveDish: (id: string | undefined, data: any) => saveDishMutation.mutateAsync({ id, data }),
        deleteDish: (id: string) => deleteDishMutation.mutateAsync(id),
        exportDishes: () => exportDishesMutation.mutateAsync(),
        importDishes: (json: any) => importDishesMutation.mutateAsync(json),
    };
}
