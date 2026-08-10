import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "./useFeatureFlags";

export interface PlanComparison {
    plan_id: string;
    plan_name: string;
    description: string | null;
    display_order: number;
    features: Record<string, boolean>;
    feature_details?: Record<string, {
        enabled: boolean;
        display_name: string | null;
        display_name_en: string | null;
        display_name_es: string | null;
        show_in_plans: boolean;
    }>;
}

export function useProfileData() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { flags: userFlags, isLoading: isLoadingFlags } = useFeatureFlags(user?.id);

    // 1. Fetch Profile with Extended Subscription Data
    const { data: profile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ["profile-extended", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select(`
          full_name,
          avatar_url,
          subscription_status,
          account_status,
          current_plan_id,
          stripe_subscription_id,
          plans:current_plan_id (name)
        `)
                .eq("id", user!.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // 2. Fetch Plan Comparison Data
    const { data: planComparisons, isLoading: isLoadingComparisons } = useQuery({
        queryKey: ["plan-comparisons"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("vw_plan_comparisons")
                .select("*")
                .order("display_order", { ascending: true });

            if (error) throw error;
            return data as PlanComparison[];
        },
    });

    // 3. Fetch Notifications (persistent)
    const { data: notifications, isLoading: isLoadingNotifications } = useQuery({
        queryKey: ["profile-notifications", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("in_app_notifications")
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // Mutation to update profile (including avatar)
    const updateProfile = useMutation({
        mutationFn: async (updates: { full_name?: string; avatar_url?: string }) => {
            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user!.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile-extended", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
        },
    });

    return {
        profile: {
            ...profile,
            fullName: profile?.full_name,
            avatarUrl: profile?.avatar_url,
            planName: (profile as any)?.plans?.name || "Plano Free",
        },
        userFlags,
        planComparisons,
        notifications,
        isLoading: isLoadingProfile || isLoadingFlags || isLoadingComparisons || isLoadingNotifications,
        updateProfile: updateProfile.mutate,
        isUpdating: updateProfile.isPending,
    };
}
