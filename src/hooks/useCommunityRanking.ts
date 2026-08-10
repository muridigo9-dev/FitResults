import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export type RankingPeriod = "weekly" | "monthly" | "all_time";

export interface RankingEntry {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  checkins: number;
  workouts: number;
  habits: number;
}

export interface UserRankingPosition {
  position: number;
  total_participants: number;
  points: number;
  points_to_next: number;
}

/**
 * Hook for community ranking features
 */
export function useCommunityRanking(trainerId?: string, period: RankingPeriod = "weekly") {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  
  const isCommunityModeEnabled = isEnabled("personal_community_mode");

  // Get trainer's community ranking
  const { data: ranking = [], isLoading: isRankingLoading } = useQuery({
    queryKey: ["community-ranking", trainerId, period],
    queryFn: async (): Promise<RankingEntry[]> => {
      if (!trainerId) return [];
      
      try {
        const { data, error } = await supabase.rpc("get_trainer_ranking" as any, {
          _trainer_id: trainerId,
          _period_type: period,
        });
        
        if (error) {
          // Function doesn't exist yet
          if (error.code === "42883") return [];
          throw error;
        }
        return (data || []) as RankingEntry[];
      } catch {
        return [];
      }
    },
    enabled: !!trainerId && isCommunityModeEnabled,
  });

  // Get current user's position
  const { data: myPosition, isLoading: isPositionLoading } = useQuery({
    queryKey: ["my-ranking-position", trainerId, period, user?.id],
    queryFn: async (): Promise<UserRankingPosition | null> => {
      if (!user?.id) return null;
      
      try {
        const { data, error } = await supabase.rpc("get_user_ranking_position" as any, {
          _user_id: user.id,
          _trainer_id: trainerId || null,
          _period_type: period,
        });
        
        if (error) {
          if (error.code === "42883") return null;
          throw error;
        }
        
        const result = data as any[];
        return result?.[0] as UserRankingPosition | null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id && isCommunityModeEnabled,
  });

  // Calculate medals (top 3)
  const topThree = ranking.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  // Is current user in top 10?
  const userInTop10 = ranking.slice(0, 10).some(r => r.user_id === user?.id);

  return {
    ranking,
    myPosition,
    topThree,
    medals,
    userInTop10,
    isLoading: isRankingLoading || isPositionLoading,
    isCommunityModeEnabled,
  };
}

/**
 * Get ranking display info
 */
export function getRankingPeriodLabel(period: RankingPeriod): string {
  switch (period) {
    case "weekly":
      return "Esta Semana";
    case "monthly":
      return "Este Mês";
    case "all_time":
      return "Geral";
    default:
      return period;
  }
}
