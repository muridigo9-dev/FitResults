import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  badge_type: string;
  is_animated: boolean;
  animation_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  is_displayed: boolean;
  badge: Badge;
}

/**
 * Hook to fetch all badges
 */
export function useBadges() {
  return useQuery<Badge[], Error>({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("is_active", true)
        .order("rarity", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch user's earned badges
 */
export function useUserBadges() {
  const { user } = useAuth();

  return useQuery<UserBadge[], Error>({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch user's displayed badges (for profile)
 */
export function useDisplayedBadges() {
  const { user } = useAuth();

  return useQuery<UserBadge[], Error>({
    queryKey: ["displayed-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("user_id", user.id)
        .eq("is_displayed", true)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to toggle badge display
 */
export function useToggleBadgeDisplay() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userBadgeId,
      isDisplayed,
    }: {
      userBadgeId: string;
      isDisplayed: boolean;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_badges")
        .update({ is_displayed: isDisplayed })
        .eq("id", userBadgeId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      queryClient.invalidateQueries({ queryKey: ["displayed-badges"] });

      toast.success(
        variables.isDisplayed
          ? "Badge exibido no perfil"
          : "Badge removido do perfil"
      );
    },
    onError: () => {
      toast.error("Erro ao atualizar badge");
    },
  });
}

/**
 * Hook to grant badge to user (admin only)
 */
export function useGrantBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      badgeId,
    }: {
      userId: string;
      badgeId: string;
    }) => {
      const { data, error } = await supabase
        .from("user_badges")
        .insert({
          user_id: userId,
          badge_id: badgeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      toast.success("Badge concedido com sucesso!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Usuário já possui este badge");
      } else {
        toast.error("Erro ao conceder badge");
      }
    },
  });
}

/**
 * Hook to revoke badge from user (admin only)
 */
export function useRevokeBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userBadgeId: string) => {
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("id", userBadgeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      toast.success("Badge revogado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao revogar badge");
    },
  });
}

/**
 * Hook to get badge statistics
 */
export function useBadgeStats() {
  const { data: allBadges } = useBadges();
  const { data: userBadges } = useUserBadges();

  const stats = {
    total: allBadges?.length || 0,
    earned: userBadges?.length || 0,
    displayed: userBadges?.filter((ub) => ub.is_displayed).length || 0,
    percentage:
      allBadges && allBadges.length > 0
        ? Math.round(((userBadges?.length || 0) / allBadges.length) * 100)
        : 0,
    byType: {} as Record<string, { earned: number; total: number }>,
    byRarity: {} as Record<string, { earned: number; total: number }>,
  };

  // Group by type
  allBadges?.forEach((badge) => {
    if (!stats.byType[badge.badge_type]) {
      stats.byType[badge.badge_type] = { earned: 0, total: 0 };
    }
    stats.byType[badge.badge_type].total++;

    if (userBadges?.some((ub) => ub.badge_id === badge.id)) {
      stats.byType[badge.badge_type].earned++;
    }
  });

  // Group by rarity
  allBadges?.forEach((badge) => {
    if (!stats.byRarity[badge.rarity]) {
      stats.byRarity[badge.rarity] = { earned: 0, total: 0 };
    }
    stats.byRarity[badge.rarity].total++;

    if (userBadges?.some((ub) => ub.badge_id === badge.id)) {
      stats.byRarity[badge.rarity].earned++;
    }
  });

  return stats;
}
