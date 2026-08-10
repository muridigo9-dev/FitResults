import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlanPrice {
  id: string;
  plan_id: string;
  price_id: string;
  interval: "month" | "year" | "promo";
  label: string;
  display_price: number | null;
  display_currency: string;
  promo_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  prices?: PlanPrice[];
}

export function usePlans() {
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      // Using type assertion since table may not be in generated types yet
      const { data: plansData, error: plansError } = await (supabase as any)
        .from("plans")
        .select("*")
        .order("display_order", { ascending: true });

      if (plansError) {
        console.error("Error fetching plans:", plansError);
        return [];
      }

      // Fetch prices for all plans
      const { data: pricesData, error: pricesError } = await (supabase as any)
        .from("plan_prices")
        .select("*")
        .order("created_at", { ascending: true });

      if (pricesError) {
        console.error("Error fetching prices:", pricesError);
      }

      // Combine plans with their prices
      const plansWithPrices = (plansData || []).map((plan: any) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        prices: (pricesData || []).filter((price: any) => price.plan_id === plan.id),
      }));

      return plansWithPrices as Plan[];
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (plan: Partial<Plan> & { prices?: Partial<PlanPrice>[] }) => {
      const { prices, ...planData } = plan;

      let planId = plan.id;

      if (planId) {
        // Update existing plan
        const { error } = await (supabase as any)
          .from("plans")
          .update({
            name: planData.name,
            description: planData.description,
            features: planData.features,
            is_active: planData.is_active,
            display_order: planData.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", planId);

        if (error) throw error;
      } else {
        // Insert new plan
        const { data, error } = await (supabase as any)
          .from("plans")
          .insert({
            name: planData.name || "Novo Plano",
            description: planData.description,
            features: planData.features || [],
            is_active: planData.is_active ?? true,
            display_order: planData.display_order || 0,
          })
          .select()
          .single();

        if (error) throw error;
        planId = data.id;
      }

      // Handle prices if provided
      if (prices && prices.length > 0) {
        for (const price of prices) {
          if (price.id) {
            // Update existing price
            const { error } = await (supabase as any)
              .from("plan_prices")
              .update({
                price_id: price.price_id,
                interval: price.interval,
                label: price.label,
                display_price: price.display_price,
                display_currency: price.display_currency,
                promo_text: price.promo_text,
                is_active: price.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq("id", price.id);

            if (error) throw error;
          } else {
            // Insert new price
            const { error } = await (supabase as any)
              .from("plan_prices")
              .insert({
                plan_id: planId,
                price_id: price.price_id || "",
                interval: price.interval || "month",
                label: price.label || "",
                display_price: price.display_price,
                display_currency: price.display_currency || "BRL",
                promo_text: price.promo_text,
                is_active: price.is_active ?? true,
              });

            if (error) throw error;
          }
        }
      }

      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plano salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving plan:", error);
      toast.error("Erro ao salvar plano");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await (supabase as any).from("plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plano excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting plan:", error);
      toast.error("Erro ao excluir plano");
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const { error } = await (supabase as any).from("plan_prices").delete().eq("id", priceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Preço excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting price:", error);
      toast.error("Erro ao excluir preço");
    },
  });

  return {
    plans: plans || [],
    isLoading,
    error,
    savePlan: savePlanMutation.mutate,
    deletePlan: deletePlanMutation.mutate,
    deletePrice: deletePriceMutation.mutate,
    isSaving: savePlanMutation.isPending,
    isDeleting: deletePlanMutation.isPending || deletePriceMutation.isPending,
  };
}
