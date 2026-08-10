import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types
export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_xp: number;
  daily_xp: number;
  weekly_xp: number;
  monthly_xp: number;
  level: number;
  rank: number;
  rank_change: number;
  is_current_user?: boolean;
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all_time";

/**
 * Hook to fetch leaderboard data
 */
export function useLeaderboard(
  period: LeaderboardPeriod = "all_time",
  limit: number = 50
) {
  const { user } = useAuth();

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["leaderboard", period, limit],
    queryFn: async () => {
      let query = supabase
        .from("leaderboard")
        .select("*")
        .order("rank", { ascending: true })
        .limit(limit);

      // Filter by period if not all_time
      if (period !== "all_time") {
        const xpColumn =
          period === "daily"
            ? "daily_xp"
            : period === "weekly"
            ? "weekly_xp"
            : "monthly_xp";
        query = query.gt(xpColumn, 0);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mark current user
      const entries = (data || []).map((entry) => ({
        ...entry,
        is_current_user: entry.user_id === user?.id,
      }));

      return entries;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (leaderboard changes frequently)
  });
}

/**
 * Hook to fetch user's leaderboard position
 */
export function useUserLeaderboardPosition() {
  const { user } = useAuth();

  return useQuery<LeaderboardEntry | null, Error>({
    queryKey: ["user-leaderboard-position", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // User might not be in leaderboard yet
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch top performers by period
 */
export function useTopPerformers(period: LeaderboardPeriod, limit: number = 10) {
  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["top-performers", period, limit],
    queryFn: async () => {
      const xpColumn =
        period === "daily"
          ? "daily_xp"
          : period === "weekly"
          ? "weekly_xp"
          : period === "monthly"
          ? "monthly_xp"
          : "total_xp";

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order(xpColumn, { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch leaderboard around user (contextual ranking)
 */
export function useLeaderboardAroundUser(range: number = 5) {
  const { user } = useAuth();
  const { data: userPosition } = useUserLeaderboardPosition();

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["leaderboard-around-user", user?.id, range],
    queryFn: async () => {
      if (!user?.id || !userPosition) return [];

      const startRank = Math.max(1, userPosition.rank - range);
      const endRank = userPosition.rank + range;

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .gte("rank", startRank)
        .lte("rank", endRank)
        .order("rank", { ascending: true });

      if (error) throw error;

      // Mark current user
      const entries = (data || []).map((entry) => ({
        ...entry,
        is_current_user: entry.user_id === user.id,
      }));

      return entries;
    },
    enabled: !!user?.id && !!userPosition,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get leaderboard statistics
 */
export function useLeaderboardStats() {
  const { data: leaderboard } = useLeaderboard("all_time", 1000);
  const { data: userPosition } = useUserLeaderboardPosition();

  if (!leaderboard || !userPosition) {
    return {
      totalUsers: 0,
      averageXP: 0,
      userPercentile: 0,
      usersAbove: 0,
      usersBelow: 0,
    };
  }

  const totalUsers = leaderboard.length;
  const averageXP =
    leaderboard.reduce((sum, entry) => sum + entry.total_xp, 0) / totalUsers;
  const userPercentile = ((totalUsers - userPosition.rank + 1) / totalUsers) * 100;
  const usersAbove = userPosition.rank - 1;
  const usersBelow = totalUsers - userPosition.rank;

  return {
    totalUsers,
    averageXP: Math.round(averageXP),
    userPercentile: Math.round(userPercentile),
    usersAbove,
    usersBelow,
  };
}
