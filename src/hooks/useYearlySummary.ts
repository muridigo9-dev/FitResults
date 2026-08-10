import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface YearlySummaryData {
    targets: {
        calories: number;
        water_ml: number;
        workouts: number;
        weight_goal: number | null;
        macro_protein_pct: number;
        macro_carbs_pct: number;
        macro_fat_pct: number;
    };
    current_year: {
        totals: {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
            water_ml: number;
            workouts: number;
            avg_weight: number | null;
            initial_weight: number | null;
            current_weight: number | null;
        };
        monthly_breakdown: {
            date: string;
            calories: number;
            water: number;
            workouts: number;
            weight: number | null;
        }[];
    };
    previous_year: {
        totals: {
            calories: number;
            water_ml: number;
            workouts: number;
            avg_weight: number | null;
        };
    };
}

export function useYearlySummary(date: Date = new Date()) {
    const { user } = useAuth();
    const dateStr = format(date, "yyyy-MM-dd");

    return useQuery({
        queryKey: ["yearly-summary-report", user?.id, dateStr],
        queryFn: async (): Promise<YearlySummaryData> => {
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await supabase.rpc("get_yearly_summary", {
                p_user_id: user.id,
                p_date: dateStr,
            });

            if (error) {
                console.error("[useYearlySummary] Error:", error);
                throw error;
            }

            return data as YearlySummaryData;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
