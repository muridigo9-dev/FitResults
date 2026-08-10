
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SessionExercise } from "@/types/workout";

export function useExerciseHistory(exerciseId: string | undefined) {
    return useQuery({
        queryKey: ["exercise-history", exerciseId],
        queryFn: async () => {
            if (!exerciseId) return [];

            // Fetch last 5 completed sessions for this exercise
            // We need to join workout_sessions to ensure session is completed
            // and filter by user? Supabase RLS handles user filter usually.

            const { data, error } = await supabase
                .from("session_exercises")
                .select(`
          *,
          sets:session_sets(*),
            session:workout_sessions(
            started_at,
            metadata,
            workout:workouts(title)
          )
        `)
                .eq("exercise_id", exerciseId)
                .eq("is_completed", true)
                .order("completed_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            // Map snake_case to camelCase
            return (data || []).map((item: any) => ({
                id: item.id,
                sessionId: item.session_id,
                exerciseId: item.exercise_id,
                displayOrder: item.display_order,
                isCompleted: item.is_completed,
                skipped: item.skipped,
                skipReason: item.skip_reason,
                startedAt: item.started_at,
                completedAt: item.completed_at,
                mood: item.mood,
                rating: item.rating,
                likeDislike: item.like_dislike,
                comment: item.comment,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                // Map sets
                sets: (item.sets || []).map((s: any) => ({
                    id: s.id,
                    sessionExerciseId: s.session_exercise_id,
                    setNumber: s.set_number,
                    plannedReps: s.planned_reps,
                    actualReps: s.actual_reps,
                    plannedWeightKg: s.planned_weight_kg,
                    actualWeightKg: s.actual_weight_kg,
                    restSecondsTaken: s.rest_seconds_taken,
                    isCompleted: s.is_completed,
                    isWarmup: s.is_warmup,
                    isDropset: s.is_dropset,
                    rpe: s.rpe,
                    startedAt: s.started_at,
                    completedAt: s.completed_at,
                    notes: s.notes,
                    createdAt: s.created_at,
                })),
                // Extra fields (joined)
                session: item.session ? {
                    startedAt: item.session.started_at,
                    workout: item.session.workout,
                    metadata: item.session.metadata
                } : undefined
            })) as unknown as SessionExercise[];
        },
        enabled: !!exerciseId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
