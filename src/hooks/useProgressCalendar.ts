import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types
export interface DayData {
  date: string;
  completion_status: 'complete' | 'partial' | 'empty';
  water_ml: number;
  water_completed: boolean;
  weight_kg: number | null;
  mood: string | null;
  meals_count: number;
  workouts_count: number;
  habits_count: number;
  challenge_tasks_count: number;
  xp_earned: number;
  achievements_count: number;
  has_streak: boolean;
}

export interface PeriodStats {
  total_days: number;
  complete_days: number;
  partial_days: number;
  empty_days: number;
  consistency_percentage: number;
  total_meals: number;
  total_workouts: number;
  total_habits: number;
  total_challenge_tasks: number;
  total_xp: number;
  total_achievements: number;
  avg_water_ml: number;
  water_completion_rate: number;
  weight_change: number | null;
  start_weight: number | null;
  end_weight: number | null;
}

export interface PeriodComparison {
  period1: {
    start_date: string;
    end_date: string;
    stats: PeriodStats;
  };
  period2: {
    start_date: string;
    end_date: string;
    stats: PeriodStats;
  };
  differences: {
    consistency_change: number;
    workouts_change: number;
    meals_change: number;
    xp_change: number;
    weight_change: number | null;
  };
}

export interface StreakDay {
  date: string;
  day_number: number;
}

/**
 * Hook to fetch calendar month data
 */
export function useCalendarMonth(year: number, month: number) {
  const { user } = useAuth();

  return useQuery<DayData[], Error>({
    queryKey: ["calendar-month", user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("get_calendar_month_data", {
        p_user_id: user.id,
        p_year: year,
        p_month: month,
      }) as { data: DayData[] | null; error: any };

      if (error) throw error;
      return (data || []) as DayData[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch period statistics
 */
export function usePeriodStatistics(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery<PeriodStats, Error>({
    queryKey: ["period-stats", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("get_period_statistics", {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to compare two periods
 */
export function useComparePeriods(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
) {
  const { user } = useAuth();

  return useQuery<PeriodComparison, Error>({
    queryKey: [
      "compare-periods",
      user?.id,
      period1Start,
      period1End,
      period2Start,
      period2End,
    ],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("compare_periods", {
        p_user_id: user.id,
        p_period1_start: period1Start,
        p_period1_end: period1End,
        p_period2_start: period2Start,
        p_period2_end: period2End,
      }) as { data: PeriodComparison | null; error: any };

      if (error) throw error;
      return data as PeriodComparison;
    },
    enabled:
      !!user?.id &&
      !!period1Start &&
      !!period1End &&
      !!period2Start &&
      !!period2End,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch streak days
 */
export function useStreakDays() {
  const { user } = useAuth();

  return useQuery<StreakDay[], Error>({
    queryKey: ["streak-days", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("get_streak_days", {
        p_user_id: user.id,
      }) as { data: StreakDay[] | null; error: any };

      if (error) throw error;
      return (data || []) as StreakDay[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1, // 1 minute (streak changes frequently)
  });
}

/**
 * Helper function to get date range for period type
 */
export function getDateRangeForPeriod(
  periodType: "day" | "week" | "month" | "year",
  date: Date = new Date()
): { start: string; end: string } {
  const start = new Date(date);
  const end = new Date(date);

  switch (periodType) {
    case "day":
      // Same day
      break;

    case "week":
      // Start of week (Sunday)
      start.setDate(date.getDate() - date.getDay());
      // End of week (Saturday)
      end.setDate(start.getDate() + 6);
      break;

    case "month":
      // Start of month
      start.setDate(1);
      // End of month
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      break;

    case "year":
      // Start of year
      start.setMonth(0);
      start.setDate(1);
      // End of year
      end.setMonth(11);
      end.setDate(31);
      break;
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/**
 * Helper function to get previous period
 */
export function getPreviousPeriod(
  periodType: "day" | "week" | "month" | "year",
  currentStart: string,
  currentEnd: string
): { start: string; end: string } {
  const start = new Date(currentStart);
  const end = new Date(currentEnd);

  const daysDiff = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - daysDiff);

  return {
    start: prevStart.toISOString().split("T")[0],
    end: prevEnd.toISOString().split("T")[0],
  };
}
