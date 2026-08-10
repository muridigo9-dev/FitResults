import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_mode: ThemeMode;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to manage user theme preferences
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await (supabase as any)
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserPreferences | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const themeMode: ThemeMode = preferences?.theme_mode || "system";

  // Apply theme based on preference
  useEffect(() => {
    const applyTheme = () => {
      let effectiveTheme: "light" | "dark" = "light";
      
      if (themeMode === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } else {
        effectiveTheme = themeMode;
      }
      
      setResolvedTheme(effectiveTheme);
      
      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: ThemeMode) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            theme_mode: newTheme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", user?.id] });
    },
  });

  return {
    themeMode,
    resolvedTheme,
    isLoading,
    setThemeMode: (mode: ThemeMode) => updateThemeMutation.mutate(mode),
    isUpdating: updateThemeMutation.isPending,
  };
}
