import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface MonthlySummaryData {
    targets: {
        calories: number;
        water_ml: number;
        workouts: number;
        weight_goal: number | null;
        macro_protein_pct: number;
        macro_carbs_pct: number;
        macro_fat_pct: number;
    };
    current_month: {
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
        daily: {
            date: string;
            calories: number;
            water: number;
            workouts: number;
            weight: number | null;
        }[];
    };
    previous_month: {
        totals: {
            calories: number;
            water_ml: number;
            workouts: number;
            avg_weight: number | null;
        };
    };
}

export function useMonthlySummary(date: Date = new Date()) {
    const { user } = useAuth();
    const dateStr = format(date, "yyyy-MM-dd");

    return useQuery({
        queryKey: ["monthly-summary-report", user?.id, dateStr],
        queryFn: async (): Promise<MonthlySummaryData> => {
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await supabase.rpc("get_monthly_summary", {
                p_user_id: user.id,
                p_date: dateStr,
            });

            if (error) {
                console.error("[useMonthlySummary] Error:", error);
                throw error;
            }

            return data as MonthlySummaryData;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
