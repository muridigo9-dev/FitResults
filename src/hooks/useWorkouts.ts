import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Workout, Exercise } from "@/types/content";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import type { BlockReason } from "./useUserCapabilities";

export interface WorkoutsData {
  systemWorkouts: Workout[];
  userWorkouts: Workout[];
  allWorkouts: Workout[];
  isLoading: boolean;
  error: Error | null;
  /** Reason why content is blocked (null if accessible) */
  blockReason: BlockReason;
  /** Whether the workouts feature is enabled */
  featureEnabled: boolean;
}

export function useWorkouts(): WorkoutsData {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlag('training_mode_enabled');

  // =====================================================
  // FETCH SYSTEM WORKOUTS (Global + Assigned)
  // Simplified query - RLS handles visibility
  // =====================================================
  const { data: systemWorkouts = [], isLoading: loadingSystem, error: errorSystem } = useQuery({
    queryKey: ["workouts", "system", user?.id],
    enabled: !!user, // Removed limit by flag
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: "always",
    queryFn: async () => {
      if (!user) return [];

      // RLS policy (can_view_content) handles visibility logic
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50); // Prevent infinite loading

      if (error) {
        console.error("[useWorkouts] Error fetching system workouts:", error);
        throw error;
      }

      if (!workouts || workouts.length === 0) {
        return [];
      }

      // Fetch exercises for each workout
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const { data: exercises } = await supabase
            .from("workout_exercises")
            .select("*, exercise:exercises(image_url, image_path, video_url)") // Join to get library metadata
            .eq("workout_id", workout.id)
            .order("exercise_order", { ascending: true }); // Fixed column name

          const mappedExercises: Exercise[] = (exercises || []).map((ex: any) => {
            // Handle variable reps logic
            let displayReps = ex.reps || "0";
            if (ex.reps_mode === 'variable' && Array.isArray(ex.reps_list) && ex.reps_list.length > 0) {
              displayReps = ex.reps_list.join(',');
            }

            // Resolve image URL from library join
            let libraryImage = ex.exercise?.image_url;

            // PRIORITIZE path if available (as requested by user)
            if (ex.exercise?.image_path) {
              const { data } = supabase.storage
                .from("exercises-media")
                .getPublicUrl(ex.exercise.image_path);
              libraryImage = data.publicUrl;
            }

            const libraryVideo = ex.exercise?.video_url;

            return {
              id: ex.id,
              exercise_id: ex.exercise_id, // Important for linking
              name: ex.name || "",
              description: ex.description || "",
              sets: ex.sets || 0,
              reps: displayReps,
              duration: ex.duration_seconds || 0,
              rest: ex.rest_seconds?.toString() || "",
              restSeconds: ex.rest_seconds || 60,
              videoUrl: libraryVideo || ex.video_url || "",
              imageUrl: libraryImage || ex.image_url || "",
              order: ex.exercise_order || 0,

              // Advanced mapping
              supersetId: ex.superset_id,
              restType: ex.rest_type || 'individual',
              executionType: ex.execution_type || 'reps',
              repsMode: ex.reps_mode || 'fixed',
              repsList: ex.reps_list || [],
              durationSeconds: ex.duration_seconds
            };
          });

          // Fallback: Generate public URL if only path exists
          let finalImageUrl = workout.image_url || "";
          const workoutAny = workout as any;

          // PRIORITIZE path if available (as requested by user)
          if (workoutAny.image_path) {
            const { data } = supabase.storage
              .from("workouts-media")
              .getPublicUrl(workoutAny.image_path);
            finalImageUrl = data.publicUrl;
          }

          return {
            id: workout.id,
            title: workout.title || "Treino sem título",
            description: workout.description || "",
            imageUrl: finalImageUrl,
            category: workout.category || "other",
            difficulty: "intermediate", // Default as not in DB
            duration: 0, // Default as not in DB
            exercises: mappedExercises,
            muscleGroups: [], // Default as not in DB or different format
            isActive: workout.is_active ?? true,
            createdAt: workout.created_at || new Date().toISOString(),
            contentOrigin: workout.content_origin || "system",
          } as Workout;
        })
      );

      return workoutsWithExercises;
    },
  });

  // =====================================================
  // FETCH USER WORKOUTS (User-created content)
  // =====================================================
  const { data: userWorkouts = [], isLoading: loadingUser, error: errorUser } = useQuery({
    queryKey: ["workouts", "user", user?.id],
    enabled: !!user, // Removed limit by flag
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return [];

      const { data: workouts, error } = await supabase
        .from("user_workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useWorkouts] Error fetching user workouts:", error);
        throw error;
      }

      if (!workouts || workouts.length === 0) {
        return [];
      }

      return workouts.map((workout) => {
        const exercises = Array.isArray(workout.exercises)
          ? (workout.exercises as unknown as Exercise[])
          : [];

        // Fallback: Generate public URL if only path exists
        let finalImageUrl = workout.image_url || "";
        const workoutAny = workout as any;

        // PRIORITIZE path if available (as requested by user)
        if (workoutAny.image_path) {
          const { data } = supabase.storage
            .from("workouts-media")
            .getPublicUrl(workoutAny.image_path);
          finalImageUrl = data.publicUrl;
        }

        return {
          id: workout.id,
          title: workout.title || "Treino sem título",
          description: workout.description || "",
          imageUrl: finalImageUrl,
          category: workout.category || "other",
          difficulty: "intermediate",
          duration: 0,
          exercises,
          muscleGroups: [],
          isActive: workout.is_active ?? true,
          createdAt: workout.created_at || new Date().toISOString(),
          contentOrigin: "user",
        } as Workout;
      });
    },
  });

  // =====================================================
  // FETCH USER HISTORY (Last Performed & Progress)
  // =====================================================
  const { data: history = {} } = useQuery({
    queryKey: ["workouts-history", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return {};

      // Fetch last completed sessions per workout
      // Using a raw query or smart sorting to get latest
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("workout_id, status, started_at, completed_at, exercises:session_exercises(count)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
        return {};
      }

      // Process history in memory
      const historyMap: Record<string, { lastPerformed?: string; completedCount: number; inProgress?: boolean }> = {};

      sessions?.forEach((session) => {
        if (!historyMap[session.workout_id]) {
          historyMap[session.workout_id] = { completedCount: 0, inProgress: false };
        }

        const entry = historyMap[session.workout_id];

        if (session.status === 'completed') {
          entry.completedCount++;
          // First one found is the latest due to sort order
          if (!entry.lastPerformed) {
            entry.lastPerformed = session.completed_at || session.started_at;
          }
        } else if (session.status === 'in_progress') {
          entry.inProgress = true;
        }
      });

      return historyMap;
    }
  });

  const allWorkouts = [...systemWorkouts, ...userWorkouts].map(w => ({
    ...w,
    lastPerformed: history[w.id]?.lastPerformed,
    completedCount: history[w.id]?.completedCount || 0,
    isActiveSession: history[w.id]?.inProgress || false
  }));

  const isLoading = loadingSystem || loadingUser;
  const error = errorSystem || errorUser;

  // Determine block reason
  const blockReason: BlockReason = !user
    ? "not_authenticated"
    : !isEnabled
      ? "feature_disabled"
      : null;

  return {
    systemWorkouts: systemWorkouts.map(w => ({ ...w, ...history[w.id] })), // Inject history
    userWorkouts: userWorkouts.map(w => ({ ...w, ...history[w.id] })),
    allWorkouts,
    isLoading,
    error: error as Error | null,
    blockReason,
    featureEnabled: isEnabled,
  };
}
