import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { BrandConfig, DEFAULT_BRAND_CONFIG, ThemeContextValue } from "@/types/theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Applies CSS custom properties to document root
 */
function applyThemeToDOM(config: BrandConfig): void {
  const root = document.documentElement;
  
  // Apply brand colors
  root.style.setProperty("--primary", config.colors.primary);
  root.style.setProperty("--secondary", config.colors.secondary);
  root.style.setProperty("--tertiary", config.colors.tertiary);
  root.style.setProperty("--quaternary", config.colors.quaternary);
  root.style.setProperty("--accent", config.colors.accent);
  
  // Apply text colors
  root.style.setProperty("--text-primary", config.textColors.primary);
  root.style.setProperty("--text-secondary", config.textColors.secondary);
  root.style.setProperty("--text-muted", config.textColors.muted);
  
  // Apply background colors
  root.style.setProperty("--background", config.backgroundColors.background);
  root.style.setProperty("--surface", config.backgroundColors.surface);
  root.style.setProperty("--surface-elevated", config.backgroundColors.surfaceElevated);
  
  // Apply font
  root.style.setProperty("--font-family", config.font.family);
  root.style.setProperty("--font-base-size", `${config.font.baseSize}px`);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<BrandConfig>;
}

export function ThemeProvider({ children, initialConfig }: ThemeProviderProps) {
  const [config, setConfig] = useState<BrandConfig>({
    ...DEFAULT_BRAND_CONFIG,
    ...initialConfig,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from Supabase (placeholder for future implementation)
  useEffect(() => {
    async function loadTheme() {
      try {
        // TODO: Fetch from Supabase when Cloud is enabled
        // const { data } = await supabase.from('brand_config').select('*').single();
        // if (data) setConfig(data);
        
        // For now, use default config
        applyThemeToDOM(config);
      } catch (error) {
        console.error("Failed to load theme:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTheme();
  }, []);

  // Apply theme changes to DOM
  useEffect(() => {
    if (!isLoading) {
      applyThemeToDOM(config);
    }
  }, [config, isLoading]);

  const updateTheme = useCallback((newConfig: Partial<BrandConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
      colors: { ...prev.colors, ...newConfig.colors },
      textColors: { ...prev.textColors, ...newConfig.textColors },
      backgroundColors: { ...prev.backgroundColors, ...newConfig.backgroundColors },
      font: { ...prev.font, ...newConfig.font },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  return (
    <ThemeContext.Provider value={{ config, isLoading, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme configuration
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook to get just the brand name (common use case)
 */
export function useBrandName(): string {
  const { config } = useTheme();
  return config.appName;
}

/**
 * Hook to get logo URL with fallback
 */
export function useBrandLogo(): string | null {
  const { config } = useTheme();
  return config.logoUrl;
}
