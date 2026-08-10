import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DietPlan, DietPlanMeal, DietPlanMealOption } from "@/types/content";
import { toast } from "sonner";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademy } from "@/contexts/AcademyContext";

async function fetchDietPlans(): Promise<DietPlan[]> {
    const { data, error } = await supabase
        .from("diet_plans")
        .select(`
            *,
            days:diet_plan_days(
                *,
                meals:diet_plan_meals(
                    *,
                    items:diet_plan_items(
                        *,
                        dish:dishes(
                            id,
                            title,
                            image_url,
                            calories,
                            protein,
                            carbs,
                            fat
                        )
                    )
                )
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching diet plans:", error);
        toast.error("Erro ao carregar planos alimentares: " + error.message);
        throw error;
    }

    const typedData = data as any[];

    return typedData.map(plan => {
        // Flatten days into sessions logic
        const allSessions: DietPlanMeal[] = [];
        const sortedDays = ((plan.days as unknown as any[]) || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        sortedDays.forEach((day: any) => {
            const dayMeals = ((day.meals as any[]) || [])
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((meal: any) => ({
                    id: meal.id,
                    name: meal.name,
                    dietPlanId: plan.id,
                    orderIndex: meal.order_index || 0,
                    timeSuggestion: meal.time_suggestion || undefined,
                    items: (meal.items || []).map((opt: any) => ({
                        id: opt.id,
                        dietPlanMealId: meal.id,
                        dishId: opt.dish_id,
                        dishTitle: opt.dish?.title || "Unknown Dish",
                        dishImage: opt.dish?.image_url || undefined,
                        portionModifier: Number(opt.portion_scale) || 1,
                        isMain: opt.is_main || false,
                        macros: {
                            calories: Math.round((opt.dish?.calories || 0) * (Number(opt.portion_scale) || 1)),
                            protein: Number(((opt.dish?.protein || 0) * (Number(opt.portion_scale) || 1)).toFixed(1)),
                            carbs: Number(((opt.dish?.carbs || 0) * (Number(opt.portion_scale) || 1)).toFixed(1)),
                            fat: Number(((opt.dish?.fat || 0) * (Number(opt.portion_scale) || 1)).toFixed(1)),
                        }
                    }))
                }));
            allSessions.push(...dayMeals);
        });

        return {
            id: plan.id,
            title: plan.title,
            description: plan.description || "",
            objective: plan.objective || "",
            objectiveBadge: plan.objective_badge || "",
            durationDays: plan.duration_days || 7,
            imageUrl: plan.image_url || "",
            imagePath: plan.image_path || "",
            visibilityType: plan.visibility || 'global',
            planIds: plan.plan_ids || [],
            isActive: plan.is_active ?? true,
            createdAt: plan.created_at || "",
            sessions: allSessions
        } as DietPlan;
    });
}

export function useAdminDietPlans() {
    const queryClient = useQueryClient();
    const { isEnabled } = useFeatureFlag("diets_enabled");
    const { user } = useAuth();
    const { currentAcademy } = useAcademy();

    const plansQuery = useQuery({
        queryKey: ["admin-diet-plans"],
        queryFn: fetchDietPlans,
        enabled: isEnabled,
        staleTime: 0,
    });

    const saveDietPlanMutation = useMutation({
        mutationFn: async ({ id, data }: { id?: string; data: Omit<DietPlan, "id" | "createdAt"> }) => {
            // 1. Upsert Plan
            let planId = id;
            const planPayload = {
                title: data.title,
                description: data.description,
                objective: data.objective,
                objective_badge: data.objectiveBadge,
                duration_days: data.durationDays,
                image_url: data.imageUrl,
                image_path: data.imagePath,
                visibility: data.visibilityType || 'global',
                plan_ids: data.planIds || [],
                is_active: data.isActive,
                created_by: user?.id,
                academy_id: currentAcademy?.id
            };

            if (id) {
                const { error } = await supabase.from("diet_plans").update(planPayload).eq("id", id);
                if (error) throw error;
            } else {
                const { data: newPlan, error } = await supabase.from("diet_plans").insert(planPayload).select().single();
                if (error) throw error;
                planId = newPlan.id;
            }

            if (!planId) throw new Error("Failed to get plan ID");

            // 2. Handle Days and Sessions
            // Default to a single "Dia Padrão" if only sessions are provided
            if (id) {
                // Delete existing days (cascades to meals and items)
                await supabase.from("diet_plan_days").delete().eq("diet_plan_id", id);
            }

            const { data: newDay, error: dayError } = await supabase
                .from("diet_plan_days")
                .insert({
                    diet_plan_id: planId,
                    name: "Dia Padrão",
                    order_index: 0
                })
                .select()
                .single();

            if (dayError) throw dayError;

            // Create Sessions within Day
            if (data.sessions && data.sessions.length > 0) {
                const sessionsWithOrder = data.sessions.map((m, i) => ({ ...m, orderIndex: i }));

                for (const session of sessionsWithOrder) {
                    const { data: newMeal, error: mealError } = await supabase
                        .from("diet_plan_meals")
                        .insert({
                            diet_plan_day_id: newDay.id,
                            name: session.name,
                            time_suggestion: session.timeSuggestion,
                            order_index: session.orderIndex
                        })
                        .select()
                        .single();

                    if (mealError) throw mealError;

                    // Create Items for Session
                    if (session.items && session.items.length > 0) {
                        const itemsPayload = session.items.map(opt => ({
                            diet_plan_meal_id: newMeal.id,
                            dish_id: opt.dishId,
                            portion_scale: opt.portionModifier,
                            is_main: opt.isMain || false
                        }));

                        const { error: itemsError } = await supabase
                            .from("diet_plan_items")
                            .insert(itemsPayload);

                        if (itemsError) throw itemsError;
                    }
                }
            }

            return planId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
            queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
        }
    });

    const toggleDietPlanMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase.from("diet_plans").update({ is_active: isActive }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
        }
    });

    const deleteDietPlanMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("diet_plans").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
        }
    });

    const exportDietPlansMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('export_diet_plans');
            if (error) throw error;
            return data;
        },
        onError: (error: any) => {
            toast.error("Erro ao exportar planos: " + error.message);
        }
    });

    const importDietPlansMutation = useMutation({
        mutationFn: async (json: any) => {
            const { error } = await supabase.rpc('import_diet_plans', { import_data: json });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-diet-plans"] });
            toast.success("Planos importados com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao importar planos: " + error.message);
        }
    });

    const downloadDietPlanPDF = async (planOrId: DietPlan | string) => {
        let plan: DietPlan | undefined;

        if (typeof planOrId === 'string') {
            plan = plansQuery.data?.find(p => p.id === planOrId);
        } else {
            plan = planOrId;
        }

        if (!plan) {
            toast.error("Plano não encontrado");
            return;
        }

        const printWindow = window.open('', '_blank');

        const totalCalories = plan.sessions.reduce((acc, session) =>
            acc + session.items.reduce((mAcc, opt) => mAcc + opt.macros.calories, 0), 0
        );

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${plan.title}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    h1 { margin: 0; color: #2ecc71; }
                    .description { color: #666; font-style: italic; margin-top: 10px; }
                    .meta { margin-top: 10px; font-size: 0.9em; color: #888; }
                    .meal { background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
                    .meal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
                    .meal-name { font-weight: bold; font-size: 1.2em; color: #333; }
                    .meal-time { background: #eee; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
                    .option { display: flex; align-items: center; margin-bottom: 10px; }
                    .bullet { color: #2ecc71; margin-right: 10px; font-weight: bold; }
                    .option-details { flex: 1; }
                    .option-macros { font-size: 0.85em; color: #7f8c8d; }
                    .total-macros { text-align: center; margin-top: 40px; font-weight: bold; padding: 20px; background: #2ecc71; color: white; border-radius: 8px; }
                    @media print {
                        body { padding: 0; }
                        .meal { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${plan.title}</h1>
                    <div class="description">${plan.description || 'Plano Alimentar Personalizado'}</div>
                    <div class="meta">${plan.objective ? `Objetivo: ${plan.objective}` : ''}</div>
                </div>

                ${plan.sessions.map(session => `
                    <div class="meal">
                        <div class="meal-header">
                            <div class="meal-name">${session.name}</div>
                            ${session.timeSuggestion ? `<div class="meal-time">${session.timeSuggestion}</div>` : ''}
                        </div>
                        <div class="options">
                            ${session.items.map(opt => `
                                <div class="option">
                                    <span class="bullet">•</span>
                                    <div class="option-details">
                                        <div>
                                            ${opt.dishTitle} 
                                            ${opt.portionModifier !== 1 ? ` <small>(x${opt.portionModifier})</small>` : ''}
                                            ${opt.isMain ? ' <strong>(Principal)</strong>' : ''}
                                        </div>
                                        <div class="option-macros">
                                            ${Math.round(opt.macros.calories)} kcal | 
                                            P: ${opt.macros.protein}g | 
                                            C: ${opt.macros.carbs}g | 
                                            G: ${opt.macros.fat}g
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}

                <div class="total-macros">
                    Total Diário Estimado: ${Math.round(totalCalories)} kcal
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    return {
        dietPlans: plansQuery.data || [],
        isLoading: plansQuery.isLoading,
        saveDietPlan: (id: string | undefined, data: any) => saveDietPlanMutation.mutateAsync({ id, data }),
        toggleActive: (id: string, isActive: boolean) => toggleDietPlanMutation.mutateAsync({ id, isActive }),
        deleteDietPlan: (id: string) => deleteDietPlanMutation.mutateAsync(id),
        exportDietPlans: () => exportDietPlansMutation.mutateAsync(),
        importDietPlans: (json: any) => importDietPlansMutation.mutateAsync(json),
        downloadDietPlanPDF
    };
}
