import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DayProgress {
  day: string;
  dayShort: string;
  date: string;
  status: "complete" | "partial" | "not_started";
  percentage: number;
}

export interface WaterData {
  day: string;
  consumed: number;
  goal: number;
}

export interface WorkoutData {
  day: string;
  sessions: number;
}

export interface WeightData {
  day: string;
  date: string;
  weight: number | null;
}

export interface UserStats {
  level: number;
  levelName: string;
  currentXP: number;
  nextLevelXP: number;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  completedDays: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  earnedAt?: string;
  unlockedAt?: string;
  xpReward?: number;
  currentProgress?: number;
  requiredProgress?: number;
}

interface ProgressData {
  userStats: UserStats;
  weeklyProgress: DayProgress[];
  weeklyWater: WaterData[];
  weeklyWorkouts: WorkoutData[];
  weeklyWeight: WeightData[];
  badges: Badge[];
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_WATER_GOAL = 2000;

export function useProgress(enabled: boolean = true): ProgressData {
  const { user } = useAuth();

  // Fetch user XP and level
  const { data: xpData, isLoading: loadingXP, error: errorXP } = useQuery({
    queryKey: ["user-xp", user?.id],
    enabled: !!user && enabled,
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_xp")
        .select("*, levels!user_xp_current_level_id_fkey(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch weekly check-ins
  const { data: weeklyCheckins = [], isLoading: loadingCheckins, error: errorCheckins } = useQuery({
    queryKey: ["weekly-checkins", user?.id],
    enabled: !!user && enabled,
    queryFn: async () => {
      if (!user) return [];

      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);

      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(monday, "yyyy-MM-dd"))
        .lte("date", format(sunday, "yyyy-MM-dd"))
        .order("date");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch weekly weight data
  const { data: weeklyWeightData = [], isLoading: loadingWeight, error: errorWeight } = useQuery({
    queryKey: ["weekly-weight", user?.id],
    enabled: !!user && enabled,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async () => {
      if (!user) return [];

      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);

      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(monday, "yyyy-MM-dd"))
        .lte("date", format(sunday, "yyyy-MM-dd"))
        .order("date");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch achievements
  const { data: achievements = [], isLoading: loadingAchievements, error: errorAchievements } = useQuery({
    queryKey: ["achievements", user?.id],
    enabled: !!user && enabled,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async () => {
      if (!user) return [];

      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true);

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id);

      if (userError) throw userError;

      const earnedIds = new Set((userAchievements || []).map((a) => a.achievement_id));
      const earnedMap = Object.fromEntries(
        (userAchievements || []).map((a) => [a.achievement_id, a.unlocked_at])
      );

      return (allAchievements || []).map((a) => ({
        id: a.id,
        name: a.name || "",
        description: a.description || "",
        icon: a.icon || "Star",
        color: a.color || "gold",
        unlocked: earnedIds.has(a.id),
        earnedAt: earnedMap[a.id],
      }));
    },
  });

  // Build weekly progress data
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklyProgress: DayProgress[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const checkin = weeklyCheckins.find((c) => c.date === dateStr);

    let status: DayProgress["status"] = "not_started";
    let percentage = 0;

    if (checkin) {
      status = checkin.status === "complete" ? "complete" : checkin.status === "partial" ? "partial" : "not_started";
      // Calculate percentage based on water and mood
      const waterPercent = checkin.water_current && checkin.water_goal
        ? Math.min(100, (checkin.water_current / checkin.water_goal) * 100)
        : 0;
      const hasMood = !!checkin.mood;
      percentage = Math.round((waterPercent + (hasMood ? 100 : 0)) / 2);
    }

    return {
      day: format(date, "EEEE", { locale: ptBR }),
      dayShort: format(date, "EEE", { locale: ptBR }),
      date: dateStr,
      status,
      percentage,
    };
  });

  // Build weekly water data
  const weeklyWater: WaterData[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const checkin = weeklyCheckins.find((c) => c.date === dateStr);

    return {
      day: format(date, "EEE", { locale: ptBR }),
      consumed: checkin?.water_current ? checkin.water_current / 1000 : 0,
      goal: checkin?.water_goal ? checkin.water_goal / 1000 : DEFAULT_WATER_GOAL / 1000,
    };
  });

  // Build weekly workouts data (from diary entries)
  const weeklyWorkouts: WorkoutData[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    // For now, return 0 - would need to query checkin_workouts
    return {
      day: format(date, "EEE", { locale: ptBR }),
      sessions: 0,
    };
  });

  // Build weekly weight data
  const weeklyWeight: WeightData[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const weightLog = weeklyWeightData.find((w) => w.date === dateStr);

    return {
      day: format(date, "EEE", { locale: ptBR }),
      date: dateStr,
      weight: weightLog?.weight ? Number(weightLog.weight) : null,
    };
  });

  // Build user stats
  const levelData = xpData?.levels as { level_number?: number; name?: string; min_xp?: number; max_xp?: number } | null;
  const userStats: UserStats = {
    level: levelData?.level_number || 1,
    levelName: levelData?.name || "Iniciante",
    currentXP: xpData?.total_xp || 0,
    nextLevelXP: levelData?.max_xp || 1000,
    totalPoints: xpData?.total_xp || 0,
    streak: xpData?.current_streak || 0,
    bestStreak: xpData?.longest_streak || 0,
    completedDays: weeklyCheckins.filter((c) => c.status === "complete").length,
  };

  const isLoading = loadingXP || loadingCheckins || loadingWeight || loadingAchievements;
  const error = errorXP || errorCheckins || errorWeight || errorAchievements;

  return {
    userStats,
    weeklyProgress,
    weeklyWater,
    weeklyWorkouts,
    weeklyWeight,
    badges: achievements,
    isLoading,
    error: error as Error | null,
  };
}
