import { useDashboardPreferences as useDashboardPreferencesContext } from "@/contexts/DashboardPreferencesContext";

/**
 * Hook to access and manage user dashboard preferences.
 * Now acts as a wrapper for DashboardPreferencesContext to ensure data consistency
 * across the entire application without needing page refreshes.
 */
export function useDashboardPreferences() {
    return useDashboardPreferencesContext();
}
