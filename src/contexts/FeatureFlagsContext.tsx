import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useFeatureFlags, FeatureFlagMap, trackFeatureUsage } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";

interface FeatureFlagsContextType {
  flags: FeatureFlagMap | undefined;
  isLoading: boolean;

  /**
   * Check if a feature is enabled
   * Returns false if flag doesn't exist (fail-safe)
   */
  isEnabled: (key: string) => boolean;

  /**
   * Check if user content creation is allowed for a feature
   * Returns false if flag doesn't exist or is disabled
   */
  isUserContentAllowed: (key: string) => boolean;

  /**
   * Check if a module is affected by any disabled flag
   */
  isModuleAvailable: (module: string) => boolean;

  /**
   * Track usage of a feature (for metrics)
   */
  trackUsage: (flagKey: string, action: "view" | "create" | "interact", metadata?: Record<string, unknown>) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { flags, isLoading, isEnabled, isUserContentAllowed, getAffectedModules } = useFeatureFlags(user?.id);

  /**
   * Check if a module is available (not blocked by any disabled flag)
   */
  const isModuleAvailable = useMemo(() => {
    return (module: string): boolean => {
      if (!flags) return true; // Allow by default while loading

      // Check all flags that affect this module
      for (const [key, flag] of Object.entries(flags)) {
        if (flag.affects.includes(module) && !flag.enabled) {
          return false;
        }
      }
      return true;
    };
  }, [flags]);

  /**
   * Track feature usage
   */
  const trackUsage = (
    flagKey: string,
    action: "view" | "create" | "interact",
    metadata?: Record<string, unknown>
  ) => {
    trackFeatureUsage(flagKey, action, metadata);
  };

  const value = useMemo(
    () => ({
      flags,
      isLoading,
      isEnabled,
      isUserContentAllowed,
      isModuleAvailable,
      trackUsage,
    }),
    [flags, isLoading, isEnabled, isUserContentAllowed, isModuleAvailable]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlagsContext() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlagsContext must be used within a FeatureFlagsProvider");
  }
  return context;
}

// Convenience hook for checking specific flags
export function useFeatureFlag(key: string) {
  const { isEnabled, isUserContentAllowed, isLoading } = useFeatureFlagsContext();

  return {
    isEnabled: isEnabled(key),
    isUserContentAllowed: isUserContentAllowed(key),
    isLoading,
  };
}

// HOC for conditionally rendering based on feature flag
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flagKey: string,
  FallbackComponent?: React.ComponentType
) {
  return function WithFeatureFlagComponent(props: P) {
    const { isEnabled, isLoading } = useFeatureFlagsContext();

    if (isLoading) return null;

    if (!isEnabled(flagKey)) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}
