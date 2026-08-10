import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutSession, SessionExercise, SessionSet, Workout } from "@/types/content";
import { toast } from "sonner";

export function useWorkoutExecution() {
    const queryClient = useQueryClient();

    // Fetch suggested workout for today
    const fetchSuggestedWorkout = async (userId: string) => {
        const dayOfWeek = new Date().getDay();

        // 1. Get active plan
        const { data: plan } = await supabase
            .from("user_training_plans")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle();

        if (!plan) return null;

        // 2. Get workout for today
        const { data: planDay } = await supabase
            .from("user_training_plan_days")
            .select("workout_id, notes")
            .eq("plan_id", plan.id)
            .eq("day_of_week", dayOfWeek)
            .maybeSingle();

        if (!planDay?.workout_id) return null;

        // 3. Get workout details
        const { data: workout } = await supabase
            .from("workouts")
            .select("*, exercises:workout_exercises(*)")
            .eq("id", planDay.workout_id)
            .single();

        return { workout, notes: planDay.notes };
    };

    // Start a new session
    const startSessionMutation = useMutation({
        mutationFn: async ({ userId, workoutId }: { userId: string; workoutId: string }) => {
            const { data, error } = await supabase
                .from("workout_sessions")
                .insert({
                    user_id: userId,
                    workout_id: workoutId,
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["active-session"] });
        }
    });

    // Log a set
    const logSetMutation = useMutation({
        mutationFn: async (setData: Omit<SessionSet, "id" | "executedAt">) => {
            const { data, error } = await supabase
                .from("session_sets")
                .insert({
                    session_exercise_id: setData.sessionExerciseId,
                    set_number: setData.setNumber,
                    actual_load_kg: setData.actualLoadKg,
                    actual_reps: setData.actualReps,
                    rpe: setData.rpe,
                    executed_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    });

    // Complete exercise with sentiment
    const updateExerciseFeedbackMutation = useMutation({
        mutationFn: async ({ id, sentiment, isCompleted }: { id: string; sentiment?: string; isCompleted: boolean }) => {
            const { error } = await supabase
                .from("session_exercises")
                .update({ sentiment, is_completed: isCompleted })
                .eq("id", id);

            if (error) throw error;
        }
    });

    // Finish session
    const finishSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            const { error } = await supabase
                .from("workout_sessions")
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq("id", sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Treino finalizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["workout-history"] });
        }
    });

    return {
        fetchSuggestedWorkout,
        startSession: startSessionMutation.mutateAsync,
        logSet: logSetMutation.mutateAsync,
        updateFeedback: updateExerciseFeedbackMutation.mutateAsync,
        finishSession: finishSessionMutation.mutateAsync,
        isStarting: startSessionMutation.isPending,
        isFinishing: finishSessionMutation.isPending
    };
}
