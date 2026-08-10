import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useBranding, useGlobalBranding, applyBrandingToDOM, BrandingConfig } from "@/hooks/useBranding";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "./AuthContext";

interface BrandingContextValue {
  branding: BrandingConfig;
  isLoading: boolean;
  error: Error | null;
  isAcademyBranding: boolean;
  isGlobalBranding: boolean;
  refresh: () => void;
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

interface BrandingProviderProps {
  children: ReactNode;
}


export function BrandingProvider({ children }: BrandingProviderProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // Admin areas ALWAYS use global branding
  // Student areas use context-aware branding (academy or global)
  const contextAwareBranding = useBranding();
  const globalBranding = useGlobalBranding();

  // Choose which branding to use
  // 1. If not logged in -> Use contextAwareBranding (which handles global fetch internally now)
  // 2. If on landing page -> Definitely Global (Admin preference)
  // 3. If admin -> Global

  // We use globalBranding hook explicitly only when we want to FORCE global branding 
  // even if the user logic would say otherwise (e.g. Admin view)
  const forceGlobal = isLandingPage || isAdmin;

  const activeBranding = forceGlobal ? globalBranding : contextAwareBranding;

  // Detect dark mode - Priority: LocalStorage -> System Preference
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";

      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      localStorage.setItem("theme", newVal ? "dark" : "light");
      return newVal;
    });
  };

  // Sync 'dark' class for Tailwind
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Listen to system dark mode changes ONLY if no preference saved
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only auto-switch if user hasn't manually overridden
    if (localStorage.getItem("theme")) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);


  // Apply branding to DOM whenever it changes or theme changes
  useEffect(() => {
    if (!activeBranding.isLoading && activeBranding.branding) {
      // If we are on landing page, we prioritize the admin's theme choice for the landing page
      // Otherwise, we use the user's preference/dark mode state
      const finalIsDark = isLandingPage
        ? activeBranding.branding.landingPageTheme === "dark"
        : isDarkMode;

      applyBrandingToDOM(activeBranding.branding, finalIsDark);

      // Force update the classList to be sure
      if (finalIsDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [activeBranding.branding, activeBranding.isLoading, isDarkMode, isLandingPage]);

  const value: BrandingContextValue = {
    branding: activeBranding.branding,
    isLoading: activeBranding.isLoading,
    error: activeBranding.error,
    isAcademyBranding: contextAwareBranding.isAcademyBranding && !forceGlobal,
    isGlobalBranding: forceGlobal || contextAwareBranding.isGlobalBranding,
    refresh: () => {
      // Force refetch (queryClient invalidation handled by hooks)
      window.location.reload();
    },
    isDarkMode,
    toggleTheme,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding context
 */
export function useBrandingContext(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBrandingContext must be used within BrandingProvider");
  }
  return context;
}
