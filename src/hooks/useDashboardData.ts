import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface DashboardData {
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  gamification: {
    streak: number;
    level: number;
    levelName: string;
    points: number;
  };
  weightHistory: Array<{ date: string; weight: number }>;
  waterHistory: Array<{ date: string; amount: number; goal: number }>;
  todayCheckin: {
    waterCurrent: number;
    waterGoal: number;
    weight: number | null;
    mood: string | null;
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
  } | null;
  weeklySummary: {
    avgWeight: number;
    weightChange: number;
    avgWater: number;
    waterGoal: number;
    avgCalories: number;
    calorieTarget: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DashboardData["profile"]>(null);
  const [gamification, setGamification] = useState<DashboardData["gamification"]>({
    streak: 0,
    level: 1,
    levelName: "Iniciante",
    points: 0,
  });
  const [weightHistory, setWeightHistory] = useState<DashboardData["weightHistory"]>([]);
  const [waterHistory, setWaterHistory] = useState<DashboardData["waterHistory"]>([]);
  const [todayCheckin, setTodayCheckin] = useState<DashboardData["todayCheckin"]>(null);
  const [weeklySummary, setWeeklySummary] = useState<DashboardData["weeklySummary"]>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

        // Fetch all data in parallel
        const [
          profileResult,
          xpResult,
          weightLogsResult,
          checkinsResult,
          todayCheckinResult,
        ] = await Promise.all([
          // Profile
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle(),

          // XP and level
          supabase
            .from("user_xp")
            .select(`
              total_xp,
              current_streak,
              current_level_id,
              levels:current_level_id (
                level_number,
                name
              )
            `)
            .eq("user_id", user.id)
            .maybeSingle(),

          // Weight history (last 7 days)
          supabase
            .from("weight_logs")
            .select("date, weight")
            .eq("user_id", user.id)
            .gte("date", sevenDaysAgo)
            .lte("date", today)
            .order("date", { ascending: true }),

          // Checkins for water history (last 7 days)
          supabase
            .from("daily_checkins")
            .select("date, water_current, water_goal")
            .eq("user_id", user.id)
            .gte("date", sevenDaysAgo)
            .lte("date", today)
            .order("date", { ascending: true }),

          // Today's checkin
          supabase
            .from("daily_checkins")
            .select("water_current, water_goal, weight, mood")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle(),
        ]);

        // Process profile
        if (profileResult.data) {
          setProfile({
            fullName: profileResult.data.full_name,
            avatarUrl: profileResult.data.avatar_url,
          });
        }

        // Process gamification
        if (xpResult.data) {
          const levelData = xpResult.data.levels as { level_number: number; name: string } | null;
          setGamification({
            streak: xpResult.data.current_streak || 0,
            level: levelData?.level_number || 1,
            levelName: levelData?.name || "Iniciante",
            points: xpResult.data.total_xp || 0,
          });
        }

        // Process weight history
        if (weightLogsResult.data) {
          const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          setWeightHistory(
            weightLogsResult.data.map((log) => ({
              date: dayNames[new Date(log.date + "T00:00:00").getDay()],
              weight: Number(log.weight),
            }))
          );
        }

        // Process water history
        if (checkinsResult.data) {
          const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          setWaterHistory(
            checkinsResult.data.map((checkin) => ({
              date: dayNames[new Date(checkin.date + "T00:00:00").getDay()],
              amount: checkin.water_current || 0,
              goal: checkin.water_goal || 2500,
            }))
          );
        }

        // Process today's checkin
        if (todayCheckinResult.data) {
          setTodayCheckin({
            waterCurrent: todayCheckinResult.data.water_current || 0,
            waterGoal: todayCheckinResult.data.water_goal || 2500,
            weight: todayCheckinResult.data.weight ? Number(todayCheckinResult.data.weight) : null,
            mood: todayCheckinResult.data.mood,
            caloriesConsumed: 0, // TODO: Calculate from diary_entries
            proteinConsumed: 0,
            carbsConsumed: 0,
            fatConsumed: 0,
          });
        }

        // Calculate weekly summary from checkins
        if (checkinsResult.data && checkinsResult.data.length > 0) {
          const weekCheckins = checkinsResult.data;
          const avgWater = weekCheckins.reduce((sum, c) => sum + (c.water_current || 0), 0) / weekCheckins.length;
          const waterGoal = weekCheckins[0]?.water_goal || 2500;

          // Weight change calculation
          let avgWeight = 0;
          let weightChange = 0;
          if (weightLogsResult.data && weightLogsResult.data.length > 0) {
            const weights = weightLogsResult.data.map((w) => Number(w.weight));
            avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
            if (weights.length >= 2) {
              weightChange = weights[weights.length - 1] - weights[0];
            }
          }

          setWeeklySummary({
            avgWeight,
            weightChange,
            avgWater,
            waterGoal,
            avgCalories: 0, // TODO: Calculate from diary_entries
            calorieTarget: 2000,
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Erro ao carregar dados do dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return {
    profile,
    gamification,
    weightHistory,
    waterHistory,
    todayCheckin,
    weeklySummary,
    isLoading,
    error,
  };
}
