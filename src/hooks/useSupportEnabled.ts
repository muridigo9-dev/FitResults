import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useBranding } from "./useBranding";

/**
 * Hook to check if support system is enabled
 * Returns flag status and support email configuration
 */
export function useSupportEnabled() {
    const { isEnabled, isLoading: isFlagLoading } = useFeatureFlag("support_enabled");
    const { branding, isLoading: isBrandingLoading } = useBranding();

    return {
        isSupportEnabled: isEnabled,
        supportEmail: branding.supportEmail || "support@example.com",
        isLoading: isFlagLoading || isBrandingLoading,
    };
}

/**
 * Hook to check if notifications are enabled
 */
export function useNotificationsEnabled() {
    const { isEnabled, isLoading } = useFeatureFlag("notifications_enabled");

    return {
        isNotificationsEnabled: isEnabled,
        isLoading,
    };
}
