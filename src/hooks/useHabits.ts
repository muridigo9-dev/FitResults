import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  unit: string;
  default_goal: number;
  is_active: boolean;
  display_order: number;
  external_id: string | null;
  content_origin: "system" | "user";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  unit: string;
  default_goal: number;
  is_active?: boolean;
  display_order?: number;
  external_id?: string;
  content_origin?: "system" | "user";
}

/**
 * Hook for admin to manage system habits
 */
export function useAdminHabits() {
  const queryClient = useQueryClient();

  const { data: habits, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-habits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("habits")
        .select("*")
        .eq("content_origin", "system")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
  });

  const createHabitMutation = useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const { data, error } = await (supabase as any)
        .from("habits")
        .insert({
          ...input,
          content_origin: "system",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-habits"] });
      toast.success("Hábito criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating habit:", error);
      toast.error("Erro ao criar hábito");
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("habits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-habits"] });
      toast.success("Hábito atualizado!");
    },
    onError: (error) => {
      console.error("Error updating habit:", error);
      toast.error("Erro ao atualizar hábito");
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("habits")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-habits"] });
      toast.success("Hábito removido!");
    },
    onError: (error) => {
      console.error("Error deleting habit:", error);
      toast.error("Erro ao remover hábito");
    },
  });

  return {
    habits: habits || [],
    isLoading,
    error,
    refetch,
    createHabit: createHabitMutation.mutate,
    updateHabit: updateHabitMutation.mutate,
    deleteHabit: deleteHabitMutation.mutate,
    isCreating: createHabitMutation.isPending,
    isUpdating: updateHabitMutation.isPending,
    isDeleting: deleteHabitMutation.isPending,
  };
}

/**
 * Hook for users to manage their personal habits
 * Requires enable_custom_habits feature flag
 */
export function useUserHabits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: habits, isLoading, error, refetch } = useQuery({
    queryKey: ["user-habits", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("habits")
        .select("*")
        .select("*")
        .or(`content_origin.eq.system,created_by.eq.${user.id}`)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });

  const createUserHabitMutation = useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("habits")
        .insert({
          ...input,
          content_origin: "user",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-habits", user?.id] });
      toast.success("Hábito pessoal criado!");
    },
    onError: (error) => {
      console.error("Error creating user habit:", error);
      toast.error("Erro ao criar hábito");
    },
  });

  const updateUserHabitMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("habits")
        .update(updates)
        .eq("id", id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-habits", user?.id] });
      toast.success("Hábito atualizado!");
    },
  });

  const archiveUserHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await (supabase as any)
        .from("habits")
        .update({ is_active: false })
        .eq("id", id)
        .eq("created_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-habits", user?.id] });
      toast.success("Hábito arquivado!");
    },
  });

  const systemHabits = habits?.filter(h => h.content_origin === "system") || [];
  const userCreatedHabits = habits?.filter(h => h.content_origin === "user") || [];

  return {
    habits: habits || [],
    systemHabits,
    userCreatedHabits,
    isLoading,
    error,
    refetch,
    createHabit: createUserHabitMutation.mutate,
    updateHabit: updateUserHabitMutation.mutate,
    archiveHabit: archiveUserHabitMutation.mutate,
    isCreating: createUserHabitMutation.isPending,
    isUpdating: updateUserHabitMutation.isPending,
  };
}
