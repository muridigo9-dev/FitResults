import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { useQueryClient } from "@tanstack/react-query";

interface MacroDistribution {
    protein: number;
    carbs: number;
    fat: number;
}

interface DashboardPreferences {
    waterGoal: number; // ml
    mealsGoal: number;
    calorieGoal: number | null; // null means use auto/calculated
    macroDistribution: MacroDistribution;
    workoutsGoal: number;
}

interface DashboardPreferencesContextType {
    calorieGoal: number;
    waterGoal: number;
    mealsGoal: number;
    workoutsGoal: number;
    macroDistribution: MacroDistribution;
    setWaterGoal: (ml: number) => Promise<void>;
    setMealsGoal: (count: number) => Promise<void>;
    setCalorieGoal: (calories: number | null) => Promise<void>;
    setMacroDistribution: (distribution: MacroDistribution) => Promise<void>;
    setWorkoutsGoal: (count: number) => Promise<void>;
    isLoading: boolean;
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | undefined>(undefined);

export function DashboardPreferencesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { calorieTarget } = useUserMetrics();
    const queryClient = useQueryClient();

    const [preferences, setPreferences] = useState<DashboardPreferences>({
        waterGoal: 2500,
        mealsGoal: 4,
        calorieGoal: null,
        macroDistribution: {
            protein: 30,
            carbs: 40,
            fat: 30
        },
        workoutsGoal: 3
    });

    const [isLoading, setIsLoading] = useState(true);

    // Load from DB on mount or when user changes
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const loadPreferences = async () => {
            try {
                // Using select("*") to be more robust against missing columns if migrations haven't run yet
                const { data, error } = await supabase
                    .from("user_preferences")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (data) {
                    setPreferences({
                        waterGoal: data.water_goal_ml || 2500,
                        mealsGoal: data.meals_goal_count || 4,
                        calorieGoal: data.calorie_target || null,
                        macroDistribution: {
                            protein: data.macro_protein_pct ?? 30,
                            carbs: data.macro_carbs_pct ?? 40,
                            fat: data.macro_fat_pct ?? 30
                        },
                        workoutsGoal: data.workouts_goal_count || 3
                    });
                }
            } catch (err) {
                console.error("Error loading preferences:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPreferences();
    }, [user]);

    const setWaterGoal = async (ml: number) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, waterGoal: ml }));

        if (user) {
            await supabase.from("user_preferences").upsert({
                user_id: user.id,
                water_goal_ml: ml
            }, { onConflict: "user_id" });

            // Invalidate to refresh trackers
            queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
            queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
        }
    };

    const setMealsGoal = async (count: number) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, mealsGoal: count }));

        if (user) {
            await supabase.from("user_preferences").upsert({
                user_id: user.id,
                meals_goal_count: count
            }, { onConflict: "user_id" });

            // Invalidate to refresh trackers
            queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
            queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
        }
    };

    const setCalorieGoal = async (calories: number | null) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, calorieGoal: calories }));

        if (user) {
            await supabase.from("user_preferences").upsert({
                user_id: user.id,
                calorie_target: calories
            }, { onConflict: "user_id" });

            // Invalidate queries that might depend on this goal
            queryClient.invalidateQueries({ queryKey: ["user-metrics"] });
            queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
        }
    };

    const setMacroDistribution = async (distribution: MacroDistribution) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, macroDistribution: distribution }));

        if (user) {
            await supabase.from("user_preferences").upsert({
                user_id: user.id,
                macro_protein_pct: distribution.protein,
                macro_carbs_pct: distribution.carbs,
                macro_fat_pct: distribution.fat
            }, { onConflict: "user_id" });

            // Invalidate queries that might depend on macros
            queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
        }
    };

    const setWorkoutsGoal = async (count: number) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, workoutsGoal: count }));

        if (user) {
            await supabase.from("user_preferences").upsert({
                user_id: user.id,
                workouts_goal_count: count
            }, { onConflict: "user_id" });

            // Invalidate queries that might depend on this goal
            queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
            queryClient.invalidateQueries({ queryKey: ["weekly-summary-report"] });
        }
    };

    // Effective calorie goal: Manual > Calculated > Default
    const effectiveCalorieGoal = preferences.calorieGoal || calorieTarget?.tdee || 2000;

    return (
        <DashboardPreferencesContext.Provider
            value={{
                calorieGoal: effectiveCalorieGoal,
                waterGoal: preferences.waterGoal,
                mealsGoal: preferences.mealsGoal,
                workoutsGoal: preferences.workoutsGoal,
                macroDistribution: preferences.macroDistribution,
                setWaterGoal,
                setMealsGoal,
                setCalorieGoal,
                setMacroDistribution,
                setWorkoutsGoal,
                isLoading
            }}
        >
            {children}
        </DashboardPreferencesContext.Provider>
    );
}

export function useDashboardPreferences() {
    const context = useContext(DashboardPreferencesContext);
    if (context === undefined) {
        throw new Error("useDashboardPreferences must be used within a DashboardPreferencesProvider");
    }
    return context;
}
