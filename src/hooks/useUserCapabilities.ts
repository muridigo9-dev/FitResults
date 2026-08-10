import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "./useUserRole";
import { useFeatureFlags } from "./useFeatureFlags";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Block reasons for content access
 */
export type BlockReason =
    | "not_authenticated"
    | "feature_disabled"
    | "plan_required"
    | "role_insufficient"
    | "visibility_restricted"
    | null;

/**
 * Feature keys used in the application
 */
export type FeatureKey =
    | "exercises_enabled"
    | "diets_enabled"
    | "challenges_enabled"
    | "habits_enabled"
    | "meal_plans_enabled"
    | "training_mode_enabled"
    | "lgpd_enabled"
    | "lgpd_data_export_enabled"
    | "lgpd_anonymization_enabled"
    | "lgpd_hard_delete_enabled";

/**
 * Content access check result
 */
export interface ContentAccessResult {
    allowed: boolean;
    reason: BlockReason;
    message?: string;
}

/**
 * User capabilities - single source of truth for access control
 */
export interface UserCapabilities {
    // Auth
    userId: string | null;
    isAuthenticated: boolean;

    // Role
    role: AppRole | null;
    isAdmin: boolean;
    isStudent: boolean;
    isContentCreator: boolean;
    isPersonalTrainer: boolean;
    isAcademyAdmin: boolean;

    // Feature Flags
    features: {
        exercises: boolean;
        workouts: boolean;
        diets: boolean;
        challenges: boolean;
        habits: boolean;
        mealPlans: boolean;
        trainingMode: boolean;
        lgpd: {
            enabled: boolean;
            dataExport: boolean;
            anonymization: boolean;
            hardDelete: boolean;
        };
    };

    // Plan subscriptions
    activePlanIds: string[];
    hasPlan: (planId: string) => boolean;
    hasAnyPlan: (planIds: string[]) => boolean;

    // Content access check (combines all)
    canAccessContent: (params: {
        featureKey?: FeatureKey;
        requiredPlanIds?: string[];
        requiredRole?: AppRole | AppRole[];
    }) => ContentAccessResult;

    // Get user-friendly message for block reason
    getBlockMessage: (reason: BlockReason) => string;

    // Loading states
    isLoading: boolean;
    isReady: boolean;
}

/**
 * Hook that provides unified user capabilities for access control
 * Combines: Auth + Role + Feature Flags + Plan Subscriptions
 */
export function useUserCapabilities(): UserCapabilities {
    const { user, loading: isAuthLoading } = useAuth();
    const {
        role,
        isAdmin,
        isStudent,
        isContentCreator,
        isPersonalTrainer,
        isAcademyAdmin,
        isLoading: isRoleLoading,
    } = useUserRole();
    const { isEnabled, isLoading: isFlagsLoading } = useFeatureFlags();

    // Fetch user's active plan subscriptions
    const { data: activePlanIds = [], isLoading: isPlansLoading } = useQuery({
        queryKey: ["user-subscriptions", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await (supabase as any)
                .from("user_subscriptions")
                .select("plan_id")
                .eq("user_id", user.id)
                .eq("status", "active");

            if (error) {
                console.error("Error fetching user subscriptions:", error);
                return [];
            }

            return (data || []).map((sub: any) => sub.plan_id as string);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    // Compute feature states
    const features = useMemo(
        () => ({
            exercises: isEnabled("exercises_enabled"),
            workouts: isEnabled("training_mode_enabled"),
            diets: isEnabled("diets_enabled"),
            challenges: isEnabled("challenges_enabled"),
            habits: isEnabled("habits_enabled"),
            mealPlans: isEnabled("meal_plans_enabled") || isEnabled("diets_enabled"),
            trainingMode: isEnabled("training_mode_enabled"),
            lgpd: {
                enabled: isEnabled("lgpd_enabled"),
                dataExport: isEnabled("lgpd_data_export_enabled"),
                anonymization: isEnabled("lgpd_anonymization_enabled"),
                hardDelete: isEnabled("lgpd_hard_delete_enabled"),
            },
        }),
        [isEnabled]
    );

    // Check if user has a specific plan
    const hasPlan = (planId: string): boolean => {
        return activePlanIds.includes(planId);
    };

    // Check if user has any of the specified plans
    const hasAnyPlan = (planIds: string[]): boolean => {
        if (!planIds || planIds.length === 0) return true;
        return planIds.some((id) => activePlanIds.includes(id));
    };

    // Get user-friendly message for block reason
    const getBlockMessage = (reason: BlockReason): string => {
        switch (reason) {
            case "not_authenticated":
                return "Faça login para acessar este conteúdo.";
            case "feature_disabled":
                return "Esta funcionalidade está temporariamente desativada.";
            case "plan_required":
                return "Este conteúdo está disponível em planos específicos.";
            case "role_insufficient":
                return "Você não tem permissão para acessar este conteúdo.";
            case "visibility_restricted":
                return "Este conteúdo não está disponível para você.";
            default:
                return "";
        }
    };

    // Main access check function
    const canAccessContent = ({
        featureKey,
        requiredPlanIds,
        requiredRole,
    }: {
        featureKey?: FeatureKey;
        requiredPlanIds?: string[];
        requiredRole?: AppRole | AppRole[];
    }): ContentAccessResult => {
        // 1. Check authentication
        if (!user) {
            return {
                allowed: false,
                reason: "not_authenticated",
                message: getBlockMessage("not_authenticated"),
            };
        }

        // 2. Admins bypass all checks
        if (isAdmin) {
            return { allowed: true, reason: null };
        }

        // 3. Check feature flag
        if (featureKey && !isEnabled(featureKey)) {
            return {
                allowed: false,
                reason: "feature_disabled",
                message: getBlockMessage("feature_disabled"),
            };
        }

        // 4. Check plan requirements
        if (requiredPlanIds && requiredPlanIds.length > 0 && !hasAnyPlan(requiredPlanIds)) {
            return {
                allowed: false,
                reason: "plan_required",
                message: getBlockMessage("plan_required"),
            };
        }

        // 5. Check role requirements
        if (requiredRole) {
            const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
            if (role && !requiredRoles.includes(role)) {
                return {
                    allowed: false,
                    reason: "role_insufficient",
                    message: getBlockMessage("role_insufficient"),
                };
            }
        }

        return { allowed: true, reason: null };
    };

    const isLoading = isAuthLoading || isRoleLoading || isFlagsLoading || isPlansLoading;

    return {
        // Auth
        userId: user?.id || null,
        isAuthenticated: !!user,

        // Role
        role,
        isAdmin,
        isStudent,
        isContentCreator,
        isPersonalTrainer,
        isAcademyAdmin,

        // Features
        features,

        // Plans
        activePlanIds,
        hasPlan,
        hasAnyPlan,

        // Access check
        canAccessContent,
        getBlockMessage,

        // Loading
        isLoading,
        isReady: !isLoading,
    };
}

/**
 * Convenience hook for checking a single feature
 */
export function useFeatureAccess(featureKey: FeatureKey) {
    const { canAccessContent, isLoading } = useUserCapabilities();
    const result = canAccessContent({ featureKey });

    return {
        isAllowed: result.allowed,
        reason: result.reason,
        message: result.message,
        isLoading,
    };
}
