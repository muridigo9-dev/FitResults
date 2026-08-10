import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  allow_user_content: boolean;
  affects: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FeatureFlagAudit {
  id: string;
  flag_id: string;
  flag_key: string;
  action: "created" | "enabled" | "disabled" | "updated" | "deleted";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
}

export interface FeatureFlagMetrics {
  key: string;
  description: string | null;
  enabled: boolean;
  allow_user_content: boolean;
  affects: string[];
  updated_at: string;
  total_users: number;
  total_actions: number;
  views: number;
  creates: number;
  interactions: number;
}

export interface FeatureFlagMap {
  [key: string]: {
    enabled: boolean;
    allowUserContent: boolean;
    affects: string[];
  };
}

/**
 * Hook for reading feature flags (all users)
 */
export function useFeatureFlags(userId?: string) {
  const queryClient = useQueryClient();

  const { data: flags, isLoading, error } = useQuery({
    queryKey: ["feature-flags", userId || "guest"],
    queryFn: async () => {
      // Parallel fetch: Metadata (definitions) and Status (entitlements)
      const [metaRes, activeRes] = await Promise.all([
        (supabase as any).from("feature_flags").select("key, allow_user_content, affects"),
        supabase.rpc("get_active_features" as any)
      ]);

      if (metaRes.error) {
        console.error("Error fetching feature flags meta:", metaRes.error);
        return {} as FeatureFlagMap;
      }

      if (activeRes.error) {
        console.error("Error fetching active features RPC:", activeRes.error);
        // We continue with empty active keys -> everything disabled.
      }

      const metaData = metaRes.data || [];
      const activeKeys = new Set<string>((activeRes.data as unknown as string[]) || []);

      const flagMap: FeatureFlagMap = {};
      for (const flag of metaData) {
        // Enablement is decided solely by the RPC (which checks Global -> Plan -> User)
        const isEnabled = activeKeys.has(flag.key);

        flagMap[flag.key] = {
          enabled: isEnabled,
          allowUserContent: flag.allow_user_content,
          affects: flag.affects || [],
        };
      }

      return flagMap;
    },
    staleTime: 1000 * 30, // 30 seconds (fallback if realtime fails)
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  /* Realtime Subscription */
  useEffect(() => {
    // Listen to all tables that affect feature activation
    const channel = supabase
      .channel("feature-flags-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => invalidate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_features" },
        () => invalidate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => invalidate()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: userId ? `id=eq.${userId}` : undefined },
        () => invalidate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academies" },
        () => invalidate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academy_members", filter: userId ? `user_id=eq.${userId}` : undefined },
        () => invalidate()
      )
      .subscribe();

    const invalidate = () => {
      // Invalidate all feature flag queries to ensure all users get updates
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


  /**
   * Check if a feature is enabled (fail-safe: returns false if not found)
   */
  const isEnabled = (key: string): boolean => {
    return flags?.[key]?.enabled ?? false;
  };

  /**
   * Check if user content is allowed for a feature
   */
  const isUserContentAllowed = (key: string): boolean => {
    const flag = flags?.[key];
    return (flag?.enabled && flag?.allowUserContent) ?? false;
  };

  /**
   * Get all affected modules for a flag
   */
  const getAffectedModules = (key: string): string[] => {
    return flags?.[key]?.affects ?? [];
  };

  return {
    flags,
    isLoading,
    error,
    isEnabled,
    isUserContentAllowed,
    getAffectedModules,
  };
}

/**
 * Hook for admin feature flag management
 */
export function useAdminFeatureFlags() {
  const queryClient = useQueryClient();

  // Fetch all feature flags with full details
  const { data: flags, isLoading } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feature_flags")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  // Fetch metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["feature-flag-metrics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feature_flag_metrics")
        .select("*");

      if (error) {
        console.error("Error fetching metrics:", error);
        return [];
      }
      return data as FeatureFlagMetrics[];
    },
  });

  // Fetch audit log
  const { data: auditLog, isLoading: isLoadingAudit } = useQuery({
    queryKey: ["feature-flag-audit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feature_flag_audit")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as FeatureFlagAudit[];
    },
  });

  // Create feature flag
  const createFlag = useMutation({
    mutationFn: async (flag: Omit<FeatureFlag, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("feature_flags")
        .insert({
          key: flag.key,
          description: flag.description,
          enabled: flag.enabled,
          allow_user_content: flag.allow_user_content,
          affects: flag.affects,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Feature flag criada!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  // Update feature flag
  const updateFlag = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeatureFlag> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("feature_flags")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Feature flag atualizada!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Toggle feature flag
  const toggleFlag = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await (supabase as any)
        .from("feature_flags")
        .update({
          enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateAll();
      toast.success(variables.enabled ? "Feature ativada!" : "Feature desativada!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao alternar: ${error.message}`);
    },
  });

  // Delete feature flag
  const deleteFlag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("feature_flags")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Feature flag removida!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    queryClient.invalidateQueries({ queryKey: ["feature-flag-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["feature-flag-audit"] });
  };

  return {
    flags,
    isLoading,
    metrics,
    isLoadingMetrics,
    auditLog,
    isLoadingAudit,
    createFlag: createFlag.mutate,
    isCreating: createFlag.isPending,
    updateFlag: updateFlag.mutate,
    isUpdating: updateFlag.isPending,
    toggleFlag: toggleFlag.mutate,
    isToggling: toggleFlag.isPending,
    deleteFlag: deleteFlag.mutate,
    isDeleting: deleteFlag.isPending,
    invalidateAll,
  };
}

/**
 * Track feature usage (for metrics)
 */
export async function trackFeatureUsage(
  flagKey: string,
  action: "view" | "create" | "interact",
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("feature_usage").insert({
      flag_key: flagKey,
      user_id: user.id,
      action,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("Error tracking feature usage:", error);
  }
}
