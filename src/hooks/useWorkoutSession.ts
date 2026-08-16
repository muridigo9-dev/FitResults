import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18nSafe } from "@/hooks/useI18nSafe";
import { localizedField } from "@/lib/contentI18n";
import { mapSessionExercise, readPlanSnapshot } from "@/lib/sessionExercise";
import type {
  WorkoutSession,
  SessionExercise,
  SessionSet,
  ExerciseFeedbackMood,
  LikeDislike,
  CompleteExerciseResponse,
  CompleteSessionResponse,
  WorkoutStreak,
} from "@/types/workout";

// ============================================
// WORKOUT SESSION HOOK
// ============================================

export function useWorkoutSession(sessionId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useI18nSafe();

  // Timer state
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestDuration, setTotalRestDuration] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isRestTimerPaused, setIsRestTimerPaused] = useState(false);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session data
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ["workout-session", sessionId, language],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          workout:workouts(*),
          exercises:session_exercises(
            *,
            exercise:exercises(*),
            sets:session_sets(*)
          )
        `)
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Transform data to match WorkoutSession type (camelCase)
      const mappedSession: WorkoutSession = {
        id: data.id,
        userId: data.user_id,
        workoutId: data.workout_id,
        workout: data.workout
          ? {
            ...data.workout,
            title: localizedField(data.workout, "title", language),
            description: localizedField(data.workout, "description", language),
          }
          : data.workout,
        seriesId: data.series_id,
        academyId: data.academy_id,
        trainerId: data.trainer_id,
        status: data.status,
        startedAt: data.started_at,
        pausedAt: data.paused_at,
        resumedAt: data.resumed_at,
        completedAt: data.completed_at,
        totalDurationSeconds: data.total_duration_seconds,
        activeDurationSeconds: data.active_duration_seconds,
        totalExercises: data.total_exercises,
        completedExercises: data.completed_exercises,
        totalSets: data.total_sets,
        completedSets: data.completed_sets,
        totalVolumeKg: data.total_volume_kg,
        estimatedCalories: data.estimated_calories,
        overallMood: data.overall_mood,
        overallRating: data.overall_rating,
        notes: data.notes,
        deviceInfo: data.device_info as Record<string, unknown>,
        metadata: data.metadata as Record<string, unknown>,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        exercises: (data.exercises || [])
          .map((ex: any) => ({
            id: ex.id,
            sessionId: ex.session_id,
            exerciseId: ex.exercise_id,
            exercise: mapSessionExercise(ex.exercise, ex.metadata, language),
            seriesExerciseId: ex.series_exercise_id,
            supersetId: readPlanSnapshot(ex.metadata).superset_id ?? undefined,
            displayOrder: ex.display_order,
            isCompleted: ex.is_completed,
            skipped: ex.skipped,
            skipReason: ex.skip_reason,
            startedAt: ex.started_at,
            completedAt: ex.completed_at,
            mood: ex.mood,
            rating: ex.rating,
            likeDislike: ex.like_dislike,
            comment: ex.comment,
            metadata: ex.metadata,
            createdAt: ex.created_at,
            updatedAt: ex.updated_at,
            sets: (ex.sets || [])
              .map((s: any) => ({
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
              }))
              .sort((a: any, b: any) => a.setNumber - b.setNumber),
          }))
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder),
      };

      return mappedSession;
    },
    enabled: !!sessionId,
  });

  // Rest timer functions
  const startRestTimer = useCallback((seconds: number) => {
    setRestTimeRemaining(seconds);
    setTotalRestDuration(seconds);
    setIsRestTimerActive(true);
    setIsRestTimerPaused(false);
  }, []);

  const stopRestTimer = useCallback(() => {
    setIsRestTimerActive(false);
    setIsRestTimerPaused(false);
    setRestTimeRemaining(0);
    setTotalRestDuration(0);
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  const toggleRestTimer = useCallback(() => {
    setIsRestTimerPaused(prev => !prev);
  }, []);

  const resetRestTimer = useCallback(() => {
    setRestTimeRemaining(totalRestDuration);
    setIsRestTimerPaused(true);
  }, [totalRestDuration]);

  // Rest timer effect
  useEffect(() => {
    if (isRestTimerActive && restTimeRemaining > 0 && !isRestTimerPaused) {
      restTimerRef.current = setInterval(() => {
        setRestTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRestTimerActive(false);
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [isRestTimerActive, restTimeRemaining > 0, isRestTimerPaused]);

  // ============================================
  // MUTATIONS
  // ============================================

  const startSessionMutation = useMutation({
    mutationFn: async ({ workoutId, seriesId, isUserWorkout = false }: { workoutId: string; seriesId?: string; isUserWorkout?: boolean }) => {
      const { data, error } = await supabase.rpc("start_workout_session", {
        p_workout_id: workoutId,
        p_series_id: seriesId,
        p_is_user_workout: isUserWorkout,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (newSessionId) => {
      queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
      if (newSessionId) {
        queryClient.invalidateQueries({ queryKey: ["workout-session", newSessionId] });
      }
      toast({ title: "Treino iniciado", description: "Bom treino!" });
    },
    onError: (error) => {
      console.error("Error starting session:", error);
      toast({ variant: "destructive", title: "Erro ao iniciar treino" });
    },
  });

  const completeExerciseMutation = useMutation({
    mutationFn: async ({ sessionExerciseId, mood, rating, likeDislike, comment }: any) => {
      if (!sessionExerciseId) throw new Error("No session exercise ID");
      const { data, error } = await supabase.rpc("complete_session_exercise", {
        p_session_exercise_id: sessionExerciseId,
        p_mood: mood,
        p_rating: rating,
        p_like_dislike: likeDislike,
        p_comment: comment,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
    },
    onError: (error) => {
      console.error("Error completing exercise:", error);
      toast({ variant: "destructive", title: "Erro ao concluir exercício" });
    },
  });

  const completeSetMutation = useMutation({
    mutationFn: async ({
      sessionExerciseId,
      setNumber,
      actualReps,
      actualWeightKg,
      rpe,
      notes
    }: {
      sessionExerciseId: string;
      setNumber: number;
      actualReps?: number;
      actualWeightKg?: number;
      rpe?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("complete_session_set", {
        p_session_exercise_id: sessionExerciseId,
        p_set_number: setNumber,
        p_actual_reps: actualReps,
        p_actual_weight_kg: actualWeightKg,
        p_rpe: rpe,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session", sessionId] });
    },
    onError: (error) => {
      console.error("Error completing set:", error);
      toast({ variant: "destructive", title: "Erro ao salvar série" });
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (data: {
      mood: ExerciseFeedbackMood;
      rating: number;
      notes?: string;
      durationSeconds?: number; // Optional in frontend, calculated in backend
    }) => {
      if (!sessionId) throw new Error("No session ID");

      // Note: p_duration_seconds is calculated in the backend based on started_at
      const { data: result, error } = await supabase.rpc("complete_workout_session", {
        p_session_id: sessionId,
        p_overall_mood: data.mood,
        p_overall_rating: data.rating,
        p_notes: data.notes || null
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session"] });
      queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      toast({ title: "Treino concluído!", description: "Sua sessão foi salva com sucesso." });
    },
    onError: (error) => {
      console.error("Error completing session:", error);
      toast({ variant: "destructive", title: "Erro ao concluir treino" });
    }
  });

  const pauseSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("workout_sessions")
        .update({ status: "paused", paused_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
      setIsRestTimerPaused(true);
    },
  });

  const resumeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("workout_sessions")
        .update({ status: "in_progress", resumed_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
    },
  });

  const abandonSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("workout_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session"] });
      queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
    },
  });

  // ... (progress calc) - Note: I am NOT replacing progress calc, I am stopping at return
  // Wait, I need to match the context before return.

  // Actually, let's target the Return block separately or include it?
  // The original code has progress calc before return. The return is lines 618+.
  // My ReplacementContent above ends with useEffect closing. 
  // I need to handle adjustRestTime which is inside the return object.
  // Let's make a 3rd chunk for the return object.


  // Calculate progress
  const progress = session
    ? {
      exercisesCompleted: session.completedExercises,
      exercisesTotal: session.totalExercises,
      exercisesPercent: session.totalExercises > 0
        ? Math.round((session.completedExercises / session.totalExercises) * 100)
        : 0,
      setsCompleted: session.completedSets,
      setsTotal: session.totalSets,
      setsPercent: session.totalSets > 0
        ? Math.round((session.completedSets / session.totalSets) * 100)
        : 0,
      currentExerciseIndex: session.exercises.findIndex(e => !e.isCompleted),
      currentExercise: session.exercises.find(e => !e.isCompleted),
      nextExercise: session.exercises.find((e, i) =>
        !e.isCompleted && i > session.exercises.findIndex(ex => !ex.isCompleted)
      ),
    }
    : null;

  return {
    session,
    isLoading,
    error,
    refetch,
    progress,

    // Mutations
    startSession: startSessionMutation.mutateAsync,
    completeExercise: completeExerciseMutation.mutate,
    completeSet: completeSetMutation.mutate,
    completeSession: completeSessionMutation.mutate,
    pauseSession: pauseSessionMutation.mutate,
    resumeSession: resumeSessionMutation.mutate,
    abandonSession: abandonSessionMutation.mutate,

    // Loading states
    isStarting: startSessionMutation.isPending,
    isCompletingExercise: completeExerciseMutation.isPending,
    isCompletingSet: completeSetMutation.isPending,
    isCompletingSession: completeSessionMutation.isPending,

    // Rest timer
    restTimeRemaining,
    totalRestDuration,
    isRestTimerActive,
    isRestTimerPaused,
    startRestTimer,
    stopRestTimer,
    toggleRestTimer,
    resetRestTimer,
    adjustRestTime: useCallback((delta: number) => {
      setRestTimeRemaining((prev) => {
        const newTime = Math.max(0, prev + delta);
        // Do not auto-close
        return newTime;
      });
    }, []),
  };
}

// ============================================
// WORKOUT STREAK HOOK
// ============================================

export function useWorkoutStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workout-streak", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      const streak: WorkoutStreak = {
        id: data.id,
        userId: data.user_id,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastWorkoutDate: data.last_workout_date,
        streakStartedDate: data.streak_started_date,
        totalWorkouts: data.total_workouts,
        totalWorkoutMinutes: data.total_workout_minutes,
        updatedAt: data.updated_at,
      };

      return streak;
    },
  });
}

// ============================================
// WORKOUT HISTORY HOOK
// ============================================

export function useWorkoutHistory(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workout-history", user?.id, limit],
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          workout_id,
          status,
          started_at,
          completed_at,
          total_duration_seconds,
          completed_exercises,
          total_exercises,
          overall_mood,
          overall_rating,
          workout:workouts(id, title, image_url, category)
        `)
        .eq("user_id", user!.id)
        .in("status", ["completed", "abandoned"])
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(session => ({
        id: session.id,
        workoutId: session.workout_id,
        workout: session.workout ? {
          id: session.workout.id,
          title: session.workout.title,
          imageUrl: session.workout.image_url,
          category: session.workout.category,
        } : undefined,
        status: session.status as WorkoutSession['status'],
        startedAt: session.started_at,
        completedAt: session.completed_at,
        durationMinutes: session.total_duration_seconds
          ? Math.round(session.total_duration_seconds / 60)
          : undefined,
        completedExercises: session.completed_exercises,
        totalExercises: session.total_exercises,
        overallMood: session.overall_mood as ExerciseFeedbackMood | undefined,
        overallRating: session.overall_rating,
      }));
    },
  });
}

// ============================================
// ACTIVE SESSION HOOK
// ============================================

export function useActiveSession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-workout-session", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    refetchInterval: 1000 * 60 * 2, // Polling every 2 minutes is enough for background check
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          workout_id,
          started_at,
          status,
          completed_exercises,
          total_exercises,
          workout:workouts(id, title, image_url)
        `)
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// ============================================
// EXERCISE HISTORY HOOK
// ============================================

export function useLastExerciseLog(exerciseId: string, currentSessionId?: string, enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exercise-last-log", exerciseId, user?.id],
    enabled: !!user && !!exerciseId && enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Find the last completed session exercise for this exercise
      const { data, error } = await supabase
        .from("session_exercises")
        .select(`
          id,
          completed_at,
          sets:session_sets(
            set_number,
            actual_weight_kg,
            actual_reps,
            is_completed
          )
        `)
        .eq("exercise_id", exerciseId)
        .eq("is_completed", true)
        .neq("session_id", currentSessionId || '00000000-0000-0000-0000-000000000000') // Exclude current session
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Sort sets by number
      const sortedSets = (data.sets || [])
        // @ts-ignore - Supabase types might be inferred loosely
        .filter(s => s.is_completed)
        // @ts-ignore
        .sort((a, b) => a.set_number - b.set_number);

      if (sortedSets.length === 0) return null;

      return {
        date: data.completed_at,
        sets: sortedSets as { set_number: number; actual_weight_kg: number; actual_reps: number; is_completed: boolean }[]
      };
    },
  });
}
