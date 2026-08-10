import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Ingredient } from "@/types/content";
import { toast } from "sonner";

async function fetchIngredients(): Promise<Ingredient[]> {
    const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching ingredients:", error);
        toast.error("Erro ao carregar ingredientes: " + error.message);
        throw error;
    }

    return data.map(ing => ({
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        calories: Number(ing.calories),
        protein: Number(ing.protein),
        carbs: Number(ing.carbs),
        fat: Number(ing.fat),
        referenceValue: Number(ing.reference_value),
        isActive: ing.is_active ?? true,
        createdAt: ing.created_at || new Date().toISOString(),
    }));
}

export function useAdminIngredients() {
    const queryClient = useQueryClient();

    const ingredientsQuery = useQuery({
        queryKey: ["admin-ingredients"],
        queryFn: fetchIngredients,
    });

    const saveIngredientMutation = useMutation({
        mutationFn: async ({ id, data }: { id?: string; data: Omit<Ingredient, "id" | "createdAt"> }) => {
            const payload = {
                name: data.name,
                unit: data.unit,
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fat: data.fat,
                reference_value: data.referenceValue,
                is_active: data.isActive,
            };

            if (id) {
                const { error } = await supabase
                    .from("ingredients")
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("ingredients")
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
        },
    });

    const toggleIngredientActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from("ingredients")
                .update({ is_active: isActive })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
        },
    });

    const deleteIngredientMutation = useMutation({
        mutationFn: async (id: string) => {
            // Check for dependencies
            const { count, error: countError } = await supabase
                .from("dish_ingredients")
                .select("*", { count: "exact", head: true })
                .eq("ingredient_id", id);

            if (countError) throw countError;

            if (count && count > 0) {
                // Fetch some dish names for better context (optional but helpful)
                throw new Error(`Este ingrediente está sendo usado em ${count} prato(s). Remova-o dos pratos primeiro.`);
            }

            const { error } = await supabase.from("ingredients").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
        },
    });

    const exportIngredientsMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('export_ingredients');
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ingredientes_backup_${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Ingredientes exportados com sucesso!");
        },
        onError: (error) => {
            toast.error("Erro ao exportar: " + error.message);
        }
    });

    const importIngredientsMutation = useMutation({
        mutationFn: async (jsonContent: string) => {
            let parsed;
            try {
                parsed = JSON.parse(jsonContent);
            } catch (e) {
                throw new Error("JSON inválido.");
            }

            const { data, error } = await supabase.rpc('import_ingredients', {
                p_json: parsed
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
            if (data?.success) {
                toast.success(`Importados: ${data.imported} | Pulados: ${data.skipped}`);
                if (data.errors?.length) toast.warning(`${data.errors.length} erros. Veja console.`);
            } else {
                toast.error("Erro na importação: " + (data?.error || "Desconhecido"));
            }
        },
        onError: (error: any) => toast.error(error.message)
    });

    return {
        ingredients: ingredientsQuery.data || [],
        isLoading: ingredientsQuery.isLoading,
        saveIngredient: (id: string | undefined, data: Omit<Ingredient, "id" | "createdAt">) =>
            saveIngredientMutation.mutateAsync({ id, data }),
        toggleIngredientActive: (id: string, isActive: boolean) =>
            toggleIngredientActiveMutation.mutateAsync({ id, isActive }),
        deleteIngredient: (id: string) => deleteIngredientMutation.mutateAsync(id),
        exportIngredients: () => exportIngredientsMutation.mutateAsync(),
        importIngredients: (json: string) => importIngredientsMutation.mutateAsync(json)
    };
}
