import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18nSafe } from "./useI18nSafe";
import { localizedField } from "@/lib/contentI18n";

// Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  badge_id: string | null;
  icon: string | null;
  rarity: string;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  earned_at: string;
  notified: boolean;
  achievement: Achievement;
}

export interface AchievementProgress {
  achievement_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  is_completed: boolean;
}

/**
 * Hook to fetch all achievements
 */
export function useAchievements() {
  const { language } = useI18nSafe();
  return useQuery<Achievement[], Error>({
    queryKey: ["achievements", language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true)
        .order("rarity", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map((achievement: any) => ({
        ...achievement,
        name: localizedField(achievement, "name", language),
        description: localizedField(achievement, "description", language),
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch user's earned achievements
 */
export function useUserAchievements() {
  const { user } = useAuth();

  return useQuery<UserAchievement[], Error>({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch achievement progress for user
 */
export function useAchievementProgress() {
  const { user } = useAuth();

  return useQuery<AchievementProgress[], Error>({
    queryKey: ["achievement-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("get_achievement_progress", {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1, // 1 minute (progress changes frequently)
  });
}

/**
 * Hook to check and unlock achievements
 */
export function useCheckAchievements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventType: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("check_achievement_progress", {
        p_user_id: user.id,
        p_event_type: eventType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (unlockedAchievements) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["achievement-progress"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });

      // Show toast for each unlocked achievement
      if (unlockedAchievements && unlockedAchievements.length > 0) {
        unlockedAchievements.forEach((achievement: Achievement) => {
          toast.success(`🏆 Conquista Desbloqueada!`, {
            description: `${achievement.name} - +${achievement.xp_reward} XP`,
          });
        });
      }
    },
  });
}

/**
 * Hook to get achievement statistics
 */
export function useAchievementStats() {
  const { user } = useAuth();
  const { data: allAchievements } = useAchievements();
  const { data: userAchievements } = useUserAchievements();

  const stats = {
    total: allAchievements?.length || 0,
    earned: userAchievements?.length || 0,
    percentage:
      allAchievements && allAchievements.length > 0
        ? Math.round((userAchievements?.length || 0) / allAchievements.length * 100)
        : 0,
    byCategory: {} as Record<string, { earned: number; total: number }>,
    byRarity: {} as Record<string, { earned: number; total: number }>,
  };

  // Group by category
  allAchievements?.forEach((achievement) => {
    if (!stats.byCategory[achievement.category]) {
      stats.byCategory[achievement.category] = { earned: 0, total: 0 };
    }
    stats.byCategory[achievement.category].total++;

    if (userAchievements?.some((ua) => ua.achievement_id === achievement.id)) {
      stats.byCategory[achievement.category].earned++;
    }
  });

  // Group by rarity
  allAchievements?.forEach((achievement) => {
    if (!stats.byRarity[achievement.rarity]) {
      stats.byRarity[achievement.rarity] = { earned: 0, total: 0 };
    }
    stats.byRarity[achievement.rarity].total++;

    if (userAchievements?.some((ua) => ua.achievement_id === achievement.id)) {
      stats.byRarity[achievement.rarity].earned++;
    }
  });

  return stats;
}
