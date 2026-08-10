import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Workout } from "@/types/content";
import { toast } from "sonner";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

async function fetchWorkouts(): Promise<Workout[]> {
    const { data, error } = await supabase
        .from("workouts")
        .select(`
            *,
            exercises:workout_exercises(*)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching workouts:", error);
        toast.error("Erro ao carregar treinos: " + error.message);
        throw error;
    }

    // Cast to any to access new columns
    const typedWorkouts = data as any[];

    return typedWorkouts.map(workout => ({
        id: workout.id,
        title: workout.title || "Treino sem título",
        description: workout.description || "",
        imageUrl: workout.image_url || "",
        category: workout.category || "other",
        // Map visibility
        visibilityType: workout.visibility || 'global',
        planIds: workout.plan_ids || [],

        difficulty: "intermediate",
        duration: 0,
        exercises: ((workout as any).exercises || []).map((ex: any) => ({
            id: ex.id,
            name: ex.name || "",
            description: ex.description || "",
            sets: ex.sets || 0,
            reps: ex.reps || "",
            duration: 0,
            rest: ex.rest_seconds?.toString() || "",
            videoUrl: ex.video_url || "",
            imageUrl: ex.image_url || "",
            order: ex.display_order || 0,
            restSeconds: ex.rest_seconds || 60,
            // Map exercise visibility if needed, or default
            visibilityType: ex.visibility || 'global'
        })),
        muscleGroups: [],
        isActive: workout.is_active ?? true,
        createdAt: workout.created_at || new Date().toISOString(),
        contentOrigin: workout.content_origin || "system",
    }));
}

export function useAdminWorkouts() {
    const queryClient = useQueryClient();
    const { isEnabled } = useFeatureFlag("training_mode_enabled");

    const workoutsQuery = useQuery({
        queryKey: ["admin-workouts"],
        queryFn: fetchWorkouts,
        enabled: isEnabled,
        staleTime: 0, // DISABLED CACHE
    });

    // Save Workout
    const saveWorkoutMutation = useMutation({
        mutationFn: async ({ id, data }: { id?: string; data: any }) => {
            // 1. Save main workout data
            const workoutPayload = {
                title: data.title,
                description: data.description,
                image_url: data.imageUrl,
                category: data.category || "other",
                is_active: data.isActive ?? true,
                visibility: data.visibilityType || 'global',
                plan_ids: data.planIds || [],
            };

            let workoutId = id;
            if (id) {
                const { error } = await supabase
                    .from("workouts")
                    .update(workoutPayload)
                    .eq("id", id);
                if (error) throw error;
            } else {
                const { data: result, error } = await supabase
                    .from("workouts")
                    .insert(workoutPayload)
                    .select()
                    .single();
                if (error) throw error;
                workoutId = result.id;
            }

            if (!workoutId) throw new Error("Failed to get workout ID");

            // 2. Handle Exercises
            if (id) {
                // Delete existing exercises
                await supabase.from("workout_exercises").delete().eq("workout_id", id);
            }

            // Insert exercises
            if (data.exercises && data.exercises.length > 0) {
                await supabase.from("workout_exercises").insert(
                    data.exercises.map((exercise: any, index: number) => ({
                        workout_id: workoutId,
                        name: exercise.name,
                        description: exercise.description,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        rest_seconds: exercise.restSeconds || 60,
                        video_url: exercise.videoUrl,
                        image_url: exercise.imageUrl,
                        display_order: index,
                    }))
                );
            }

            // REMOVED REDUNDANT saveVisibilityConfig call

            return workoutId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
            toast.success("Treino salvo com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao salvar treino: " + error.message);
        }
    });

    // Toggle Active
    const toggleWorkoutMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from("workouts")
                .update({ is_active: isActive })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
            toast.success("Status atualizado!");
        },
    });

    // Delete Workout
    const deleteWorkoutMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("workouts")
                .update({ is_active: false })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
            toast.success("Treino removido!");
        },
        onError: (error: any) => {
            toast.error("Erro ao remover: " + error.message);
        }
    });

    // Export Workouts
    const exportWorkoutsMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('export_workouts');
            if (error) throw error;
            return data;
        },
        onError: (error: any) => {
            toast.error("Erro ao exportar treinos: " + error.message);
        }
    });

    // Import Workouts
    const importWorkoutsMutation = useMutation({
        mutationFn: async (json: any) => {
            const { error } = await supabase.rpc('import_workouts', { import_data: json });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
            toast.success("Treinos importados com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao importar treinos: " + error.message);
        }
    });

    return {
        workouts: workoutsQuery.data || [],
        isLoading: workoutsQuery.isLoading,
        saveWorkout: (id: string | undefined, data: any) => saveWorkoutMutation.mutateAsync({ id, data }),
        toggleActive: (id: string, isActive: boolean) => toggleWorkoutMutation.mutateAsync({ id, isActive }),
        deleteWorkout: (id: string) => deleteWorkoutMutation.mutateAsync(id),
        exportWorkouts: () => exportWorkoutsMutation.mutateAsync(),
        importWorkouts: (json: any) => importWorkoutsMutation.mutateAsync(json),
    };
}
