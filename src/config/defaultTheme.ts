/**
 * Default Theme Configuration
 * 
 * This file provides fallback values for all theme tokens.
 * Used when Supabase config is not available or fails to load.
 */

import { BrandConfig } from "@/types/theme";

export const defaultTheme: BrandConfig = {
  // Brand Identity
  appName: "FitLife",
  logoUrl: null,
  faviconUrl: null,
  
  // Brand Colors (HSL format without hsl() wrapper)
  colors: {
    primary: "168 76% 42%",      // Wellness teal
    secondary: "35 30% 96%",     // Warm sand
    tertiary: "200 70% 50%",     // Calm blue
    quaternary: "260 50% 55%",   // Soft purple
    accent: "12 80% 62%",        // Coral energy
  },
  
  // Text Colors
  textColors: {
    primary: "220 15% 15%",      // Near black
    secondary: "220 10% 45%",    // Dark gray
    muted: "220 10% 60%",        // Light gray
  },
  
  // Background Colors
  backgroundColors: {
    background: "40 20% 99%",    // Off-white
    surface: "0 0% 100%",        // Pure white
    surfaceElevated: "0 0% 100%", // White (for cards)
  },
  
  // Typography
  font: {
    family: "Plus Jakarta Sans",
    baseSize: 16,
    scale: 1.25, // Major third scale
  },
  
  updatedAt: new Date().toISOString(),
};

/**
 * Gamification level colors
 * These are fixed and not customizable per brand
 */
export const gamificationColors = {
  bronze: "30 60% 50%",
  silver: "220 10% 65%",
  gold: "45 90% 55%",
  platinum: "200 20% 75%",
  diamond: "190 80% 60%",
};

/**
 * Habit tracking colors
 * These are fixed and not customizable per brand
 */
export const habitColors = {
  water: "200 85% 55%",
  sleep: "260 60% 60%",
  workout: "12 80% 55%",
  meals: "140 60% 45%",
};

/**
 * State colors (success, warning, error, info)
 * These follow accessibility guidelines and are not customizable
 */
export const stateColors = {
  success: "152 70% 45%",
  warning: "38 92% 50%",
  info: "200 85% 55%",
  error: "0 72% 51%",
};

/**
 * Spacing scale (in rem)
 * Based on 4px base unit
 */
export const spacingScale = {
  xs: "0.25rem",  // 4px
  sm: "0.5rem",   // 8px
  md: "1rem",     // 16px
  lg: "1.5rem",   // 24px
  xl: "2rem",     // 32px
  "2xl": "3rem",  // 48px
  "3xl": "4rem",  // 64px
};

/**
 * Border radius scale
 */
export const radiusScale = {
  sm: "0.5rem",   // 8px
  md: "0.75rem",  // 12px
  lg: "1rem",     // 16px (default)
  xl: "1.25rem",  // 20px
  "2xl": "1.5rem", // 24px
  full: "9999px",
};

/**
 * Typography scale
 * Using major third (1.25) ratio
 */
export const typographyScale = {
  xs: "0.75rem",    // 12px
  sm: "0.875rem",   // 14px
  base: "1rem",     // 16px
  lg: "1.125rem",   // 18px
  xl: "1.25rem",    // 20px
  "2xl": "1.5rem",  // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
};
