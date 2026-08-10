import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Academy, AcademyTrainer } from "@/types/personalTrainer";

/**
 * Hook for managing academies
 */
export function useAcademies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all academies (admin only)
  const { data: academies = [], isLoading } = useQuery({
    queryKey: ["academies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Academy[];
    },
  });

  // Create academy
  const createAcademy = useMutation({
    mutationFn: async (formData: Partial<Academy>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("academies")
        .insert({
          ...formData,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as academy trainer
      await (supabase as any)
        .from("academy_trainers")
        .insert({
          academy_id: data.id,
          trainer_id: user.id,
          role: "owner",
        });

      return data as Academy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academies"] });
      queryClient.invalidateQueries({ queryKey: ["my-academy"] });
      toast.success("Academia criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update academy
  const updateAcademy = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<Academy> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("academies")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Academy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academies"] });
      queryClient.invalidateQueries({ queryKey: ["my-academy"] });
      toast.success("Academia atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    academies,
    isLoading,
    createAcademy: createAcademy.mutate,
    isCreating: createAcademy.isPending,
    updateAcademy: updateAcademy.mutate,
    isUpdating: updateAcademy.isPending,
  };
}

/**
 * Hook for getting user's academy (as trainer/owner)
 */
export function useMyAcademy() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-academy", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from("academy_trainers")
        .select(`
          *,
          academy:academies(*)
        `)
        .eq("trainer_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data ? { ...data.academy, myRole: data.role } : null;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook for managing academy trainers
 */
export function useAcademyTrainers(academyId?: string) {
  const queryClient = useQueryClient();

  // Fetch trainers
  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ["academy-trainers", academyId],
    queryFn: async () => {
      if (!academyId) return [];

      const { data, error } = await (supabase as any)
        .from("academy_trainers")
        .select(`
          *,
          trainer:profiles!trainer_id(id, email, full_name, avatar_url)
        `)
        .eq("academy_id", academyId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as AcademyTrainer[];
    },
    enabled: !!academyId,
  });

  // Add trainer to academy
  const addTrainer = useMutation({
    mutationFn: async ({ trainerId, role = "trainer" }: { trainerId: string; role?: "trainer" | "manager" }) => {
      if (!academyId) throw new Error("No academy ID");

      const { data, error } = await (supabase as any)
        .from("academy_trainers")
        .insert({
          academy_id: academyId,
          trainer_id: trainerId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-trainers", academyId] });
      toast.success("Treinador adicionado à academia!");
    },
    onError: (error: Error) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Este treinador já faz parte da academia");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Remove trainer from academy
  const removeTrainer = useMutation({
    mutationFn: async (trainerId: string) => {
      const { error } = await (supabase as any)
        .from("academy_trainers")
        .delete()
        .eq("academy_id", academyId)
        .eq("trainer_id", trainerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-trainers", academyId] });
      toast.success("Treinador removido da academia");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update trainer role
  const updateTrainerRole = useMutation({
    mutationFn: async ({ trainerId, role }: { trainerId: string; role: "trainer" | "manager" }) => {
      const { error } = await (supabase as any)
        .from("academy_trainers")
        .update({ role })
        .eq("academy_id", academyId)
        .eq("trainer_id", trainerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-trainers", academyId] });
      toast.success("Papel do treinador atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    trainers,
    isLoading,
    addTrainer: addTrainer.mutate,
    isAdding: addTrainer.isPending,
    removeTrainer: removeTrainer.mutate,
    isRemoving: removeTrainer.isPending,
    updateTrainerRole: updateTrainerRole.mutate,
    isUpdatingRole: updateTrainerRole.isPending,
  };
}
