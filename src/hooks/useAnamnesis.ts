import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Anamnesis, AnamnesisFormData } from "@/types/personalTrainer";

/**
 * Hook for managing anamnesis/health assessments
 */
export function useAnamnesis(studentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = studentId || user?.id;

  // Fetch all anamnesis for a user
  const { data: anamnesisList = [], isLoading } = useQuery({
    queryKey: ["anamnesis", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await (supabase as any)
        .from("anamnesis")
        .select("*")
        .eq("user_id", targetUserId)
        .order("assessment_date", { ascending: false });

      if (error) throw error;
      return data as Anamnesis[];
    },
    enabled: !!targetUserId,
  });

  // Get the latest anamnesis
  const latestAnamnesis = anamnesisList[0] || null;

  // Create anamnesis
  const createAnamnesis = useMutation({
    mutationFn: async (formData: AnamnesisFormData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("anamnesis")
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Anamnesis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis"] });
      toast.success("Avaliação criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update anamnesis
  const updateAnamnesis = useMutation({
    mutationFn: async ({ id, ...formData }: AnamnesisFormData & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("anamnesis")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Anamnesis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis"] });
      toast.success("Avaliação atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete anamnesis
  const deleteAnamnesis = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("anamnesis")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis"] });
      toast.success("Avaliação removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    anamnesisList,
    latestAnamnesis,
    isLoading,
    createAnamnesis: createAnamnesis.mutate,
    isCreating: createAnamnesis.isPending,
    updateAnamnesis: updateAnamnesis.mutate,
    isUpdating: updateAnamnesis.isPending,
    deleteAnamnesis: deleteAnamnesis.mutate,
    isDeleting: deleteAnamnesis.isPending,
  };
}

/**
 * Hook for fetching anamnesis history summary (for trainers)
 */
export function useAnamnesisHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["anamnesis-history", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await (supabase as any).rpc("get_student_anamnesis_history", {
        p_student_id: studentId,
        p_limit: 10,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
}
