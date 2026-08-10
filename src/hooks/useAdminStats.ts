import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export interface AdminStats {
  system: {
    totalDiets: number;
    activeDiets: number;
    totalWorkouts: number;
    activeWorkouts: number;
    totalChallenges: number;
    activeChallenges: number;

    totalAchievements: number;
    activeAchievements: number;
  };
  behavior: {
    totalUsers: number;
    activeUsers: number;
    totalCheckins: number;
    newUsersThisWeek: number;
  };
}

export interface RecentActivity {
  id: string;
  action: string;
  user: string;
  time: string;
  type: "checkin" | "user" | "challenge";
}

async function fetchAdminStats(): Promise<AdminStats> {
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [
    dietsResult,
    workoutsResult,
    challengesResult,

    achievementsResult,
    profilesResult,
    newUsersResult,
    checkinsResult,
    activeUsersResult,
  ] = await Promise.all([
    supabase.from("dishes").select("id, is_active", { count: "exact" }),
    supabase.from("workouts").select("id, is_active", { count: "exact" }),
    supabase.from("challenges").select("id, is_active", { count: "exact" }),

    supabase.from("achievements").select("id, is_active", { count: "exact" }),
    supabase.from("profiles").select("id", { count: "exact" }),
    supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", weekAgo),
    supabase.from("daily_checkins").select("id", { count: "exact" }),
    supabase.from("daily_checkins")
      .select("user_id")
      .gte("date", weekAgo),
  ]);

  const diets = dietsResult.data || [];
  const workouts = workoutsResult.data || [];
  const challenges = challengesResult.data || [];
  const achievements = achievementsResult.data || [];
  const activeUsersSet = new Set(activeUsersResult.data?.map(c => c.user_id) || []);

  return {
    system: {
      totalDiets: diets.length,
      activeDiets: diets.filter(d => d.is_active).length,
      totalWorkouts: workouts.length,
      activeWorkouts: workouts.filter(w => w.is_active).length,
      totalChallenges: challenges.length,
      activeChallenges: challenges.filter(c => c.is_active).length,
      totalAchievements: achievements.length,
      activeAchievements: achievements.filter(a => a.is_active).length,
    },
    behavior: {
      totalUsers: profilesResult.count || 0,
      activeUsers: activeUsersSet.size,
      totalCheckins: checkinsResult.count || 0,
      newUsersThisWeek: newUsersResult.count || 0,
    },
  };
}

async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const { data: checkins } = await supabase
    .from("daily_checkins")
    .select(`
      id,
      created_at,
      user_id,
      profiles!daily_checkins_user_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!checkins) return [];

  const now = new Date();

  return checkins.map(checkin => {
    const profile = checkin.profiles as { full_name: string | null; email: string } | null;
    const userName = profile?.full_name || profile?.email || "Usuário";
    const createdAt = new Date(checkin.created_at);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let time: string;
    if (diffMins < 1) time = "agora";
    else if (diffMins < 60) time = `${diffMins} min`;
    else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h`;
    else time = `${Math.floor(diffMins / 1440)}d`;

    return {
      id: checkin.id,
      action: "Check-in realizado",
      user: userName,
      time,
      type: "checkin" as const,
    };
  });
}

export function useAdminStats() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 30000, // 30 seconds
  });

  const activityQuery = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: fetchRecentActivity,
    staleTime: 30000,
  });

  return {
    stats: statsQuery.data,
    recentActivity: activityQuery.data || [],
    isLoading: statsQuery.isLoading || activityQuery.isLoading,
    error: statsQuery.error || activityQuery.error,
  };
}
