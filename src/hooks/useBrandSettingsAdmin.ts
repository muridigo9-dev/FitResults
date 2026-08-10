import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { processFileForUpload } from "@/lib/optimization-pipeline";

export interface BrandSettingsAdmin {
  id: string;
  app_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string | null;
  support_email: string | null;
  app_url: string | null;
  landing_page_theme: "light" | "dark" | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_author: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;

  // Light mode colors
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  quaternary_color: string | null;
  accent_color: string | null;
  text_primary: string | null;
  text_secondary: string | null;
  text_muted: string | null;
  light_background: string | null;
  light_surface: string | null;
  light_surface_elevated: string | null;

  // Dark mode colors
  dark_primary_color: string | null;
  dark_secondary_color: string | null;
  dark_tertiary_color: string | null;
  dark_quaternary_color: string | null;
  dark_accent_color: string | null;
  dark_text_primary: string | null;
  dark_text_secondary: string | null;
  dark_text_muted: string | null;
  dark_background: string | null;
  dark_surface: string | null;
  dark_surface_elevated: string | null;

  // Typography
  font_family: string | null;
  font_base_size: number | null;

  // Stripe
  stripe_connection_status: string | null;
  stripe_last_sync_at: string | null;
  stripe_mode: string | null;

  updated_at: string;
}

export function useBrandSettingsAdmin() {
  const queryClient = useQueryClient();

  const { data: brand, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-settings-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as BrandSettingsAdmin | null;
    },
    staleTime: 1000 * 60 * 2,
  });

  const updateBrandMutation = useMutation({
    mutationFn: async (updates: Partial<BrandSettingsAdmin>) => {
      if (!brand?.id) {
        // Create new record
        const { data, error } = await (supabase as any)
          .from("brand_settings")
          .insert({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from("brand_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brand.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast.success("Configurações de marca salvas!");
    },
    onError: (error) => {
      console.error("Error updating brand settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    brand,
    isLoading,
    error,
    refetch,
    updateBrand: updateBrandMutation.mutate,
    isUpdating: updateBrandMutation.isPending,
  };
}

/**
 * Hook to upload logo to Supabase Storage
 */
export function useLogoUpload() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (originalFile: File) => {
      // Optimize
      const { file } = await processFileForUpload(originalFile);

      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-settings-admin"] });
    },
    onError: (error) => {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload da logo");
    },
  });

  return {
    uploadLogo: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
