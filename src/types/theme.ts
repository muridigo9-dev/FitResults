/**
 * White Label Theme Configuration Types
 * 
 * These types define the structure for brand customization
 * that can be configured by admins via Supabase.
 */

export interface BrandColors {
  primary: string;       // Main brand color (HSL format: "168 76% 42%")
  secondary: string;     // Secondary color
  tertiary: string;      // Tertiary accent
  quaternary: string;    // Fourth accent color
  accent: string;        // Call-to-action color
}

export interface TextColors {
  primary: string;       // Main text color
  secondary: string;     // Secondary text
  muted: string;         // Muted/disabled text
}

export interface BackgroundColors {
  background: string;    // Page background
  surface: string;       // Card/component surface
  surfaceElevated: string; // Elevated surfaces
}

export interface FontConfig {
  family: string;        // Font family name
  baseSize: number;      // Base font size in pixels (default: 16)
  scale: number;         // Type scale ratio (default: 1.25)
}

export interface BrandConfig {
  // Identity
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  
  // Colors
  colors: BrandColors;
  textColors: TextColors;
  backgroundColors: BackgroundColors;
  
  // Typography
  font: FontConfig;
  
  // Meta
  updatedAt: string;
}

/**
 * Default theme values used as fallback
 * when no custom configuration is provided
 */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  appName: "FitResults",
  logoUrl: null,
  faviconUrl: null,
  
  colors: {
    primary: "168 76% 42%",
    secondary: "35 30% 96%",
    tertiary: "200 70% 50%",
    quaternary: "260 50% 55%",
    accent: "12 80% 62%",
  },
  
  textColors: {
    primary: "220 15% 15%",
    secondary: "220 10% 45%",
    muted: "220 10% 60%",
  },
  
  backgroundColors: {
    background: "40 20% 99%",
    surface: "0 0% 100%",
    surfaceElevated: "0 0% 100%",
  },
  
  font: {
    family: "Plus Jakarta Sans",
    baseSize: 16,
    scale: 1.25,
  },
  
  updatedAt: new Date().toISOString(),
};

/**
 * Theme context value type
 */
export interface ThemeContextValue {
  config: BrandConfig;
  isLoading: boolean;
  updateTheme: (newConfig: Partial<BrandConfig>) => void;
}
