import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DietPlan, DietPlanMeal } from "@/types/content";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

async function fetchStudentDietPlans(): Promise<DietPlan[]> {
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
        .eq("is_active", true) // Only active plans for students
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching student diet plans:", error);
        throw error;
    }

    const typedData = data as any[];

    return typedData.map(plan => {
        // Flatten days into meals logic
        const allMeals: DietPlanMeal[] = [];
        const sortedDays = ((plan.days as unknown as any[]) || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        sortedDays.forEach((day: any) => {
            const dayMeals = ((day.meals as any[]) || [])
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((meal: any) => ({
                    id: meal.id,
                    name: meal.name,
                    orderIndex: meal.order_index || 0,
                    timeSuggestion: meal.time_suggestion || undefined,
                    dayName: day.name, // Augment with day name
                    options: (meal.items || []).map((opt: any) => ({
                        id: opt.id,
                        dishId: opt.dish_id,
                        dishTitle: opt.dish?.title || "Prato Indisponível",
                        dishImage: opt.dish?.image_url || undefined,
                        portionModifier: Number(opt.portion_scale) || 1, // Read from correct DB column
                        macros: {
                            calories: (opt.dish?.calories || 0) * (Number(opt.portion_scale) || 1),
                            protein: (opt.dish?.protein || 0) * (Number(opt.portion_scale) || 1),
                            carbs: (opt.dish?.carbs || 0) * (Number(opt.portion_scale) || 1),
                            fat: (opt.dish?.fat || 0) * (Number(opt.portion_scale) || 1),
                        }
                    }))
                }));
            allMeals.push(...dayMeals);
        });

        return {
            id: plan.id,
            title: plan.title,
            description: plan.description || "",
            objective: plan.objective || "",
            // Use defaults if columns are missing/null in legacy data, though migration should fix it
            visibilityType: plan.visibility_type || 'global',
            planIds: plan.plan_ids || [],
            isActive: plan.is_active ?? true,
            createdAt: plan.created_at || "",
            meals: allMeals
        } as DietPlan;
    });
}

export function useStudentDietPlans() {
    const { user } = useAuth();

    const plansQuery = useQuery({
        queryKey: ["student-diet-plans", user?.id],
        queryFn: fetchStudentDietPlans,
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    const downloadPDF = (plan: DietPlan) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Permita pop-ups para baixar o PDF");
            return;
        }

        const totalCalories = plan.meals.reduce((acc, meal) =>
            acc + meal.options.reduce((mAcc, opt) => mAcc + opt.macros.calories, 0), 0
        );

        // Group meals by Day
        const mealsByDay: Record<string, DietPlanMeal[]> = {};
        plan.meals.forEach(meal => {
            const dayIdx = (meal as any).dayName || "Dia Padrão";
            if (!mealsByDay[dayIdx]) mealsByDay[dayIdx] = [];
            mealsByDay[dayIdx].push(meal);
        });

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
                    .day-section { margin-bottom: 30px; }
                    .day-title { font-size: 1.4em; border-left: 4px solid #2ecc71; padding-left: 10px; margin-bottom: 15px; color: #2c3e50; font-weight: bold; }
                    .meal { background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 15px; page-break-inside: avoid; }
                    .meal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
                    .meal-name { font-weight: bold; font-size: 1.1em; color: #333; }
                    .meal-time { background: #eee; padding: 3px 6px; border-radius: 4px; font-size: 0.8em; }
                    .option { display: flex; align-items: center; margin-bottom: 8px; }
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
                    <div class="description">${plan.description || ''}</div>
                    <div class="meta">${plan.objective ? `Objetivo: ${plan.objective}` : ''}</div>
                </div>

                ${Object.entries(mealsByDay).map(([dayName, meals]) => `
                    <div class="day-section">
                        <div class="day-title">${dayName}</div>
                        ${meals.map(meal => `
                            <div class="meal">
                                <div class="meal-header">
                                    <div class="meal-name">${meal.name}</div>
                                    ${meal.timeSuggestion ? `<div class="meal-time">${meal.timeSuggestion}</div>` : ''}
                                </div>
                                <div class="options">
                                    ${meal.options.map(opt => `
                                        <div class="option">
                                            <span class="bullet">•</span>
                                            <div class="option-details">
                                                <div>
                                                    ${opt.dishTitle} 
                                                    ${opt.portionModifier !== 1 && opt.portionModifier ? ` <small>(x${opt.portionModifier})</small>` : ''}
                                                </div>
                                                <div class="option-macros">
                                                    ${Math.round(opt.macros.calories)} kcal | 
                                                    P: ${Math.round(opt.macros.protein)}g | 
                                                    C: ${Math.round(opt.macros.carbs)}g | 
                                                    G: ${Math.round(opt.macros.fat)}g
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}

                <div class="total-macros">
                    Total Diário Estimado (Médio): ${Math.round(totalCalories / (Object.keys(mealsByDay).length || 1))} kcal
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
        error: plansQuery.error,
        downloadPDF
    };
}
