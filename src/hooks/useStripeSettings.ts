import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StripeSettings {
  id: string;
  stripe_mode: "test" | "live";
  is_connected: boolean;
  trial_days: number;
  trial_enabled: boolean;
  trial_message: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  publishable_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface StripeEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export function useStripeSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["stripe-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stripe_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching stripe settings:", error);
        return null;
      }
      return data as StripeSettings | null;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<StripeSettings>) => {
      if (!settings?.id) {
        const { data, error } = await (supabase as any)
          .from("stripe_settings")
          .insert({
            stripe_mode: updates.stripe_mode || "test",
            is_connected: updates.is_connected || false,
            trial_days: updates.trial_days || 7,
            trial_enabled: updates.trial_enabled ?? true,
            trial_message: updates.trial_message || "7 dias grátis",
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from("stripe_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating stripe settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}

export function useStripeEvents(limit = 20) {
  return useQuery({
    queryKey: ["stripe-events", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stripe_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching stripe events:", error);
        return [];
      }
      return data as StripeEvent[];
    },
  });
}
