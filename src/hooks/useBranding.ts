/**
 * Branding Hook - Context-Aware White-Label System
 * 
 * Automatically selects the correct branding based on:
 * - Feature flags (academy_mode_enabled)
 * - User's role
 * - User's academy membership
 * 
 * Fallback logic:
 * 1. Academy branding (if user is in academy and academy has branding)
 * 2. Global branding (default)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "./useFeatureFlags";

export interface BrandingColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  accent: string;
}

export interface BrandingTextColors {
  primary: string;
  secondary: string;
  muted: string;
}

export interface BrandingBackgroundColors {
  background: string;
  surface: string;
  surfaceElevated: string;
}

export interface BrandingFont {
  family: string;
  baseSize: number;
}

export interface BrandingConfig {
  // App Info
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  supportEmail: string;
  appUrl: string;
  tagline: string;
  landingPageTheme: "light" | "dark";
  seoTitle: string;
  seoDescription: string;
  seoAuthor: string;
  seoKeywords: string;
  ogImageUrl: string;

  // Light Mode Colors
  colors: BrandingColors;
  textColors: BrandingTextColors;
  backgroundColors: BrandingBackgroundColors;

  // Dark Mode Colors
  darkColors: BrandingColors;
  darkTextColors: BrandingTextColors;
  darkBackgroundColors: BrandingBackgroundColors;

  // Typography
  font: BrandingFont;

  // Metadata
  source: "global" | "academy";
  academyId?: string;
  updatedAt: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: "FitResults",
  logoUrl: "",
  faviconUrl: "",
  supportEmail: "suporte@fitresults.com",
  appUrl: "https://fitresults.com",
  tagline: "Sua jornada começa aqui",
  landingPageTheme: "light",
  seoTitle: "FitResults",
  seoDescription: "Seu app de saúde e bem-estar. Acompanhe dietas, treinos e progresso.",
  seoAuthor: "FitResults",
  seoKeywords: "saúde, fitness, dieta, treino, bem-estar",
  ogImageUrl: "",

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

  darkColors: {
    primary: "168 70% 50%",
    secondary: "220 15% 15%",
    tertiary: "200 65% 55%",
    quaternary: "260 45% 60%",
    accent: "12 75% 58%",
  },

  darkTextColors: {
    primary: "40 20% 95%",
    secondary: "220 10% 70%",
    muted: "220 10% 55%",
  },

  darkBackgroundColors: {
    background: "220 15% 8%",
    surface: "220 15% 12%",
    surfaceElevated: "220 15% 15%",
  },

  font: {
    family: "Plus Jakarta Sans, sans-serif", // Matched index.css
    baseSize: 16,
  },

  source: "global",
  updatedAt: new Date().toISOString(),
};

/**
 * Parse raw branding data from database into BrandingConfig
 */
function parseBrandingData(raw: any): BrandingConfig {
  if (!raw) return DEFAULT_BRANDING;

  return {
    appName: raw.app_name || DEFAULT_BRANDING.appName,
    logoUrl: raw.logo_url || "",
    faviconUrl: raw.favicon_url || "",
    supportEmail: raw.support_email || DEFAULT_BRANDING.supportEmail,
    appUrl: raw.app_url || DEFAULT_BRANDING.appUrl,
    tagline: raw.tagline || DEFAULT_BRANDING.tagline,
    landingPageTheme: raw.landing_page_theme || DEFAULT_BRANDING.landingPageTheme,
    seoTitle: raw.seo_title || raw.app_name || DEFAULT_BRANDING.seoTitle,
    seoDescription: raw.seo_description || raw.tagline || DEFAULT_BRANDING.seoDescription,
    seoAuthor: raw.seo_author || raw.app_name || DEFAULT_BRANDING.seoAuthor,
    seoKeywords: raw.seo_keywords || DEFAULT_BRANDING.seoKeywords,
    ogImageUrl: raw.og_image_url || raw.logo_url || DEFAULT_BRANDING.ogImageUrl,

    colors: {
      primary: raw.primary_color || DEFAULT_BRANDING.colors.primary,
      secondary: raw.secondary_color || DEFAULT_BRANDING.colors.secondary,
      tertiary: raw.tertiary_color || DEFAULT_BRANDING.colors.tertiary,
      quaternary: raw.quaternary_color || DEFAULT_BRANDING.colors.quaternary,
      accent: raw.accent_color || DEFAULT_BRANDING.colors.accent,
    },

    textColors: {
      primary: raw.text_primary || DEFAULT_BRANDING.textColors.primary,
      secondary: raw.text_secondary || DEFAULT_BRANDING.textColors.secondary,
      muted: raw.text_muted || DEFAULT_BRANDING.textColors.muted,
    },

    backgroundColors: {
      background: raw.light_background || DEFAULT_BRANDING.backgroundColors.background,
      surface: raw.light_surface || DEFAULT_BRANDING.backgroundColors.surface,
      surfaceElevated: raw.light_surface_elevated || DEFAULT_BRANDING.backgroundColors.surfaceElevated,
    },

    darkColors: {
      primary: raw.dark_primary_color || DEFAULT_BRANDING.darkColors.primary,
      secondary: raw.dark_secondary_color || DEFAULT_BRANDING.darkColors.secondary,
      tertiary: raw.dark_tertiary_color || DEFAULT_BRANDING.darkColors.tertiary,
      quaternary: raw.dark_quaternary_color || DEFAULT_BRANDING.darkColors.quaternary,
      accent: raw.dark_accent_color || DEFAULT_BRANDING.darkColors.accent,
    },

    darkTextColors: {
      primary: raw.dark_text_primary || DEFAULT_BRANDING.darkTextColors.primary,
      secondary: raw.dark_text_secondary || DEFAULT_BRANDING.darkTextColors.secondary,
      muted: raw.dark_text_muted || DEFAULT_BRANDING.darkTextColors.muted,
    },

    darkBackgroundColors: {
      background: raw.dark_background || DEFAULT_BRANDING.darkBackgroundColors.background,
      surface: raw.dark_surface || DEFAULT_BRANDING.darkBackgroundColors.surface,
      surfaceElevated: raw.dark_surface_elevated || DEFAULT_BRANDING.darkBackgroundColors.surfaceElevated,
    },

    font: {
      family: raw.font_family || DEFAULT_BRANDING.font.family,
      baseSize: raw.font_base_size || DEFAULT_BRANDING.font.baseSize,
    },

    source: raw.source || "global",
    academyId: raw.academy_id,
    updatedAt: raw.updated_at || new Date().toISOString(),
  };
}

/**
 * Hook to get branding configuration
 * Automatically handles context (global vs academy)
 */
export function useBranding() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ["branding", user?.id || "anonymous"],
    enabled: true,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: "always",
    queryFn: async () => {
      // 1. If no user, fetch GLOBAL branding
      if (!user) {
        console.log("[useBranding] No user, fetching global branding");
        const { data, error } = await supabase
          .from("brand_settings")
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("[useBranding] Error fetching global branding:", error);
          return DEFAULT_BRANDING;
        }

        if (!data) return DEFAULT_BRANDING;

        return parseBrandingData({ ...data, source: "global" });
      }

      // 2. If user exists, fetch USER branding (Context Aware: Academy vs Global)
      console.log("[useBranding] Fetching branding for user:", user.id);

      // Call the database function get_user_branding()
      const { data, error } = await supabase.rpc("get_user_branding", {
        _user_id: user.id,
      });

      if (error) {
        console.error("[useBranding] Error fetching user branding:", error);
        // Fallback to global if RPC fails
        const { data: globalData } = await supabase.from("brand_settings").select("*").maybeSingle();
        if (globalData) return parseBrandingData({ ...globalData, source: "global" });
        return DEFAULT_BRANDING;
      }

      if (!data) {
        console.log("[useBranding] No branding data, trying global fallback");
        const { data: globalData } = await supabase.from("brand_settings").select("*").maybeSingle();
        if (globalData) return parseBrandingData({ ...globalData, source: "global" });
        return DEFAULT_BRANDING;
      }

      const parsed = parseBrandingData(data);
      console.log("[useBranding] Branding loaded:", {
        source: parsed.source,
        academyId: parsed.academyId,
        appName: parsed.appName,
      });

      return parsed;
    },
  });

  return {
    branding: branding || DEFAULT_BRANDING,
    isLoading,
    error: error as Error | null,
    isAcademyBranding: branding?.source === "academy",
    isGlobalBranding: branding?.source === "global",
  };
}

/**
 * Hook to get global branding (for admin use)
 * Always returns global branding, ignoring academy context
 */
export function useGlobalBranding() {
  const { data: branding, isLoading, error } = useQuery({
    queryKey: ["branding", "global"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      console.log("[useGlobalBranding] Fetching global branding");

      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("[useGlobalBranding] Error:", error);
        return DEFAULT_BRANDING;
      }

      if (!data) {
        console.log("[useGlobalBranding] No data, using default");
        return DEFAULT_BRANDING;
      }

      const parsed = parseBrandingData({ ...data, source: "global" });
      console.log("[useGlobalBranding] Loaded:", parsed.appName);

      return parsed;
    },
  });

  return {
    branding: branding || DEFAULT_BRANDING,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Helper to convert Hex to HSL (CSS variable format: "H S% L%")
 */
export function hexToHsl(hex: string): string {
  // Default fallback (black)
  const FALLBACK = "0 0% 0%";

  if (!hex || typeof hex !== 'string') return FALLBACK;

  // If already in "H S% L%" format, return as is
  if (hex.includes("%") || (hex.split(" ").length === 3 && !hex.includes("#"))) {
    return hex;
  }

  // Remove hash if present
  hex = hex.replace(/^#/, "");

  // Expand 3-digit hex
  if (hex.length === 3) {
    hex = hex.split("").map(char => char + char).join("");
  }

  // Ensure 6 digits
  if (hex.length !== 6) return FALLBACK;

  // Parse r, g, b
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return FALLBACK;

  // Normalize
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Round values
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

/**
 * Apply branding to DOM as CSS variables
 * Call this in a useEffect when branding changes
 */
export function applyBrandingToDOM(branding: BrandingConfig, isDarkMode: boolean = false) {
  const root = document.documentElement;

  // Choose light or dark colors based on theme
  const colors = isDarkMode ? branding.darkColors : branding.colors;
  const textColors = isDarkMode ? branding.darkTextColors : branding.textColors;
  const bgColors = isDarkMode ? branding.darkBackgroundColors : branding.backgroundColors;

  // 1. Update Standard Tailwind Variables (overriding index.css defaults)
  // Use HSL format as expected by tailwind.config.ts

  // Core Colors
  root.style.setProperty("--primary", hexToHsl(colors.primary));
  // Assuming primary-foreground is white for dark primary, or black for light. 
  // For simplicity, we keep it white/black based on theme or use the text primary
  root.style.setProperty("--primary-foreground", isDarkMode ? "0 0% 10%" : "0 0% 100%");

  root.style.setProperty("--secondary", hexToHsl(colors.secondary));
  root.style.setProperty("--secondary-foreground", isDarkMode ? "0 0% 100%" : "220 15% 15%"); // Approximate default

  root.style.setProperty("--tertiary", hexToHsl(colors.tertiary));
  root.style.setProperty("--quaternary", hexToHsl(colors.quaternary));

  root.style.setProperty("--accent", hexToHsl(colors.accent));
  root.style.setProperty("--accent-foreground", "0 0% 100%");

  // Backgrounds & Surfaces
  root.style.setProperty("--background", hexToHsl(bgColors.background));
  root.style.setProperty("--foreground", hexToHsl(textColors.primary));

  root.style.setProperty("--card", hexToHsl(bgColors.surface));
  root.style.setProperty("--card-foreground", hexToHsl(textColors.primary));
  root.style.setProperty("--card-elevated", hexToHsl(bgColors.surfaceElevated));

  root.style.setProperty("--surface", hexToHsl(bgColors.surface));
  root.style.setProperty("--surface-elevated", hexToHsl(bgColors.surfaceElevated));

  root.style.setProperty("--popover", hexToHsl(bgColors.surface));
  root.style.setProperty("--popover-foreground", hexToHsl(textColors.primary));

  // UI Elements
  root.style.setProperty("--border", isDarkMode ? "220 15% 20%" : "40 15% 90%"); // Default borders
  root.style.setProperty("--input", isDarkMode ? "220 15% 20%" : "40 15% 90%");
  root.style.setProperty("--ring", hexToHsl(colors.primary));

  // Text Semantic
  root.style.setProperty("--text-primary", hexToHsl(textColors.primary));
  root.style.setProperty("--text-secondary", hexToHsl(textColors.secondary));
  root.style.setProperty("--text-muted", hexToHsl(textColors.muted));

  // 2. Keep Brand Custom Variables (for specific brand usage)
  root.style.setProperty("--brand-primary", colors.primary);
  root.style.setProperty("--brand-secondary", colors.secondary);
  root.style.setProperty("--brand-tertiary", colors.tertiary);
  root.style.setProperty("--brand-quaternary", colors.quaternary);
  root.style.setProperty("--brand-accent", colors.accent);

  root.style.setProperty("--brand-bg", bgColors.background);
  root.style.setProperty("--brand-surface", bgColors.surface);

  root.style.setProperty("--brand-font-family", branding.font.family);
  root.style.setProperty("--brand-font-size", `${branding.font.baseSize}px`);

  // Update favicon if provided
  if (branding.faviconUrl) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = branding.faviconUrl;
    }
  }

  // Update theme color meta tag
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor && colors.primary) {
    // If it's already HSL, we need to convert to HEX for meta tag, but here we assume it's valid color or skip
    // Simple approach: if it starts with #, use it.
    if (colors.primary.startsWith('#')) {
      themeColor.setAttribute("content", colors.primary);
    }
  }

  // Update document title and meta tags
  const pageTitle = branding.seoTitle || branding.appName;
  if (pageTitle) {
    document.title = pageTitle;

    // Update meta tags
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) metaTitle.setAttribute("content", pageTitle);

    const appName = document.querySelector('meta[name="application-name"]');
    if (appName) appName.setAttribute("content", pageTitle);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", pageTitle);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", pageTitle);
  }

  const pageDescription = branding.seoDescription || branding.tagline;
  if (pageDescription) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", pageDescription);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", pageDescription);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute("content", pageDescription);
  }

  if (branding.seoAuthor) {
    const metaAuthor = document.querySelector('meta[name="author"]');
    if (metaAuthor) metaAuthor.setAttribute("content", branding.seoAuthor);
  }

  if (branding.seoKeywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", branding.seoKeywords);
  }

  if (branding.ogImageUrl) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", branding.ogImageUrl);

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute("content", branding.ogImageUrl);
  } else if (branding.logoUrl) {
    // Fallback social image to logo if SEO image is not set
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", branding.logoUrl);

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute("content", branding.logoUrl);
  }

  // Update site name
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteName) ogSiteName.setAttribute("content", branding.appName);

  // Update OG URL
  const currentUrl = branding.appUrl || window.location.origin;
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", currentUrl);

  console.log("[applyBrandingToDOM] Applied branding:", {
    source: branding.source,
    theme: isDarkMode ? "dark" : "light",
    primary: colors.primary,
  });
}
