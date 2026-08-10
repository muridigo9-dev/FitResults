import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserMetrics } from "@/contexts/UserMetricsContext";

export interface OnboardingFormData {
    name: string;
    birthDate: string;
    gender: "male" | "female";
    height: number;
    currentWeight: number;
    goalWeight?: number;
    activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
    fitnessGoal: "lose_weight" | "gain_muscle" | "maintain";
}

export function useOnboarding() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { updateProfile, saveProfile, refreshProfile } = useUserMetrics();

    // Check if onboarding is completed
    const { data: status, isLoading } = useQuery({
        queryKey: ["onboarding-status", user?.id],
        enabled: !!user,
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await supabase
                .from("profiles")
                .select("onboarding_completed, full_name")
                .eq("id", user.id)
                .maybeSingle();

            if (error) throw error;

            return {
                completed: data?.onboarding_completed ?? false,
                name: data?.full_name || user.user_metadata?.full_name || null,
            };
        },
    });

    // Complete onboarding mutation
    const completeMutation = useMutation({
        mutationFn: async (formData: OnboardingFormData) => {
            if (!user) throw new Error("User not authenticated");

            // Calculate age from birth date
            const birthDate = new Date(formData.birthDate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            const profileData = {
                age,
                gender: formData.gender,
                height: formData.height,
                currentWeight: formData.currentWeight,
                goalWeight: formData.goalWeight,
                activityLevel: formData.activityLevel,
                fitnessGoal: formData.fitnessGoal,
            };

            // 1. Update UserMetricsContext and save to user_body_profiles
            // We pass profileData directly to saveProfile to avoid stale closure issues with current context state
            updateProfile(profileData);
            await saveProfile(profileData as any);

            // 2. Also save to user_onboarding_data for consistency and fallback support in UserMetricsContext
            await supabase.from("user_onboarding_data").upsert({
                user_id: user.id,
                birth_date: formData.birthDate,
                gender: formData.gender,
                height_cm: formData.height,
                weight_kg: formData.currentWeight,
                target_weight_kg: formData.goalWeight,
                activity_level: formData.activityLevel,
                primary_goal: formData.fitnessGoal,
                updated_at: new Date().toISOString(),
            });

            // 3. Update profiles table
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.name,
                    onboarding_completed: true,
                    onboarding_completed_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (profileError) throw profileError;

            return { success: true };
        },
        onSuccess: async () => {
            // Force context refresh to sync with DB
            await refreshProfile();

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
            queryClient.invalidateQueries({ queryKey: ["user-metrics"] });
            queryClient.invalidateQueries({ queryKey: ["user_body_profiles"] });
        },
    });

    return {
        isCompleted: status?.completed ?? false,
        userName: status?.name,
        isLoading,
        completeOnboarding: completeMutation.mutateAsync,
        isSubmitting: completeMutation.isPending,
    };
}
