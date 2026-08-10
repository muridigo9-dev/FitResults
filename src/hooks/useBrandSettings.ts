import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandSettings {
  id: string;
  app_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  quaternary_color: string | null;
  accent_color: string | null;
  text_primary: string | null;
  text_secondary: string | null;
  text_muted: string | null;
  font_family: string | null;
  font_base_size: number | null;
  support_email: string | null;
  app_url: string | null;
  tagline: string | null;
  updated_at: string;
}

/**
 * Hook para buscar configurações de branding do banco
 * Usado para whitelabel de emails e UI
 */
export function useBrandSettings() {
  const { data: brand, isLoading, error } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as BrandSettings | null;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Default values for email templates
  const emailBranding = {
    brand_name: brand?.app_name || "App",
    brand_logo_url: brand?.logo_url || "",
    brand_primary_color: brand?.primary_color || "#10b981",
    brand_secondary_color: brand?.secondary_color || "#059669",
    support_email: brand?.support_email || "suporte@app.com",
    app_url: brand?.app_url || window.location.origin,
  };

  return {
    brand,
    emailBranding,
    isLoading,
    error,
  };
}

/**
 * Substitui placeholders de branding em um template HTML
 */
export function applyBrandingToTemplate(
  html: string,
  branding: Record<string, string>,
  additionalVariables?: Record<string, string>
): string {
  let result = html;

  // Apply branding variables
  Object.entries(branding).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value || "");
  });

  // Apply additional variables
  if (additionalVariables) {
    Object.entries(additionalVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, value || "");
    });
  }

  // Handle conditional logo (simple if/else for handlebars-like syntax)
  if (branding.brand_logo_url) {
    result = result.replace(/{{#if brand_logo_url}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g, "$1");
  } else {
    result = result.replace(/{{#if brand_logo_url}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g, "$1");
  }

  return result;
}
