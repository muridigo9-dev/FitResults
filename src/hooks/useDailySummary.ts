import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface DailySummaryData {
    date: string;
    visibility: {
        showWorkouts: boolean;
        showExercises: boolean;
        showNutrition: boolean;
        showChallenges: boolean;
        showHabits: boolean;
        showGamification: boolean;
    };
    checkin: any;
    bodyProfile?: {
        gender: string;
        age: number;
        height: number;
        current_weight: number;
        goal_weight: number;
        activity_level: string;
        fitness_goal: string;
    };
    gamification: {
        streak: number;
        level: number;
        levelName: string;
        totalXP: number;
        minXP: number;
        maxXP: number;
        pointsToday: number;
    } | null;
    workouts: any[];
    exercises: any[];
    nutrition: {
        caloriesConsumed: number;
        proteinConsumed: number;
        carbsConsumed: number;
        fatConsumed: number;
        mealsLogged: number;
        entries: any[];
    } | null;
    habits: any[];
    challenges: any[];
}

export function useDailySummary(date: Date) {
    const { user } = useAuth();
    const dateStr = format(date, "yyyy-MM-dd");

    return useQuery({
        queryKey: ["daily-summary", user?.id, dateStr],
        queryFn: async (): Promise<DailySummaryData> => {
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await supabase.rpc("get_daily_summary", {
                p_user_id: user.id,
                p_date: dateStr,
            });

            if (error) {
                console.error("[useDailySummary] Error:", error);
                throw error;
            }

            return data as DailySummaryData;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 1, // 1 minute
    });
}
