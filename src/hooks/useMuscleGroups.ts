import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MuscleGroup, ExerciseMuscleGroup } from "@/types/personalTrainer";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18nSafe } from "./useI18nSafe";
import { localizedField } from "@/lib/contentI18n";

const EMPTY_ARRAY: any[] = [];

/**
 * Hook for fetching all muscle groups
 */
export function useMuscleGroups() {
  const { isEnabled } = useFeatureFlag("training_mode_enabled");
  const { language } = useI18nSafe();

  const { data: muscleGroups = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ["muscle-groups", language],
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("muscle_groups")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((mg: any) => ({
        ...mg,
        name: localizedField(mg, "name", language),
      })) as MuscleGroup[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // Group by category
  const groupedMuscles = {
    upper: muscleGroups.filter((m) => m.category === "upper"),
    lower: muscleGroups.filter((m) => m.category === "lower"),
    core: muscleGroups.filter((m) => m.category === "core"),
    full: muscleGroups.filter((m) => m.category === "full"),
  };

  return {
    muscleGroups,
    groupedMuscles,
    isLoading,
  };
}

/**
 * Hook for managing exercise muscle groups
 */
export function useExerciseMuscleGroups(exerciseId?: string) {
  const queryClient = useQueryClient();

  // Fetch muscle groups for an exercise
  const { data: exerciseMuscles = [], isLoading } = useQuery({
    queryKey: ["exercise-muscles", exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];

      const { data, error } = await (supabase as any)
        .from("exercise_muscle_groups")
        .select(`
          *,
          muscle_group:muscle_groups(*)
        `)
        .eq("exercise_id", exerciseId);

      if (error) throw error;
      return data as ExerciseMuscleGroup[];
    },
    enabled: !!exerciseId,
  });

  // Set muscle groups for exercise (replace all)
  const setMuscleGroups = useMutation({
    mutationFn: async ({
      primaryMuscleIds,
      secondaryMuscleIds,
    }: {
      primaryMuscleIds: string[];
      secondaryMuscleIds: string[];
    }) => {
      if (!exerciseId) throw new Error("No exercise ID");

      // Delete existing
      await (supabase as any)
        .from("exercise_muscle_groups")
        .delete()
        .eq("exercise_id", exerciseId);

      // Insert new
      const newRecords = [
        ...primaryMuscleIds.map((id) => ({
          exercise_id: exerciseId,
          muscle_group_id: id,
          is_primary: true,
        })),
        ...secondaryMuscleIds.map((id) => ({
          exercise_id: exerciseId,
          muscle_group_id: id,
          is_primary: false,
        })),
      ];

      if (newRecords.length > 0) {
        const { error } = await (supabase as any)
          .from("exercise_muscle_groups")
          .insert(newRecords);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-muscles", exerciseId] });
      toast.success("Grupos musculares atualizados!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Separate primary and secondary muscles
  const primaryMuscles = exerciseMuscles.filter((em) => em.is_primary);
  const secondaryMuscles = exerciseMuscles.filter((em) => !em.is_primary);

  return {
    exerciseMuscles,
    primaryMuscles,
    secondaryMuscles,
    isLoading,
    setMuscleGroups: setMuscleGroups.mutate,
    isUpdating: setMuscleGroups.isPending,
  };
}

/**
 * Hook for searching exercises by muscle group
 */
export function useExercisesByMuscle(muscleGroupId?: string) {
  return useQuery({
    queryKey: ["exercises-by-muscle", muscleGroupId],
    queryFn: async () => {
      if (!muscleGroupId) return [];

      const { data, error } = await (supabase as any)
        .from("exercise_muscle_groups")
        .select(`
          exercise_id,
          is_primary,
          exercise:exercises(*)
        `)
        .eq("muscle_group_id", muscleGroupId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!muscleGroupId,
  });
}
