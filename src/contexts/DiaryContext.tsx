import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DiaryEntry,
  MealLogEntry,
  WorkoutLogEntry,
  DailySummary
} from "@/types/diary";
import { Diet, Workout } from "@/types/content";
import { Challenge, ChallengeTask } from "@/types/challenges";
import { toast } from "sonner";
import { addMealToCheckin } from "@/lib/checkinHelpers";

const getTodayISO = () => new Date().toISOString().split("T")[0];

interface UserChallengeProgress {
  challengeId: string;
  startedAt: string;
  currentDay: number;
  completedTasks: string[];
  status: "active" | "completed" | "abandoned";
}

interface DiaryContextType {
  entries: DiaryEntry[];
  todayEntries: DiaryEntry[];
  isLoading: boolean;

  logMeal: (diet: Diet) => void;
  updateMealLog: (id: string, updates: any) => void;
  removeMealLog: (entryId: string) => void;
  isMealLogged: (dietId: string, date?: string) => boolean;

  logWorkout: (workout: Workout, duration?: number) => void;
  removeWorkoutLog: (entryId: string) => void;
  isWorkoutLogged: (workoutId: string, date?: string) => boolean;

  logExercise: (data: { exercise: any; logData?: any }) => void;
  isExerciseDone: (exerciseId: string, date?: string) => boolean;

  challengeProgress: UserChallengeProgress | null;
  startChallenge: (challenge: Challenge) => void;
  completeTask: (challenge: Challenge, dayNumber: number, task: ChallengeTask) => void;
  isTaskCompleted: (taskId: string) => boolean;
  abandonChallenge: () => void;

  getTodaySummary: () => DailySummary;
  getEntriesByDate: (date: string) => DiaryEntry[];
  updateWorkoutSet: (setId: string, updates: any) => void;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch diary entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["diary-entries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("diary_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((entry): DiaryEntry => {
        if (entry.entry_type === "meal") {
          return {
            id: entry.id,
            date: entry.date || getTodayISO(),
            source: "diet",
            type: "meal",
            dietId: entry.reference_id || "",
            dietTitle: entry.title || "",
            dietCategory: entry.category || "",
            macros: {
              calories: entry.calories || 0,
              protein: entry.protein || 0,
              carbs: entry.carbs || 0,
              fat: entry.fat || 0,
            },
            ingredients: entry.ingredients || [],
            createdAt: entry.created_at || new Date().toISOString(),
          } as MealLogEntry;
        } else if (entry.entry_type === "exercise") {
          return {
            id: entry.id,
            date: entry.date || getTodayISO(),
            source: "manual",
            type: "exercise",
            exerciseId: entry.reference_id || "",
            exerciseTitle: entry.title || "",
            muscleGroup: entry.category || undefined,
            createdAt: entry.created_at || new Date().toISOString(),
          } as any; // Cast as any to avoid circular type issues during update
        } else {
          return {
            id: entry.id,
            date: entry.date || getTodayISO(),
            source: "workout",
            type: "workout",
            workoutId: entry.reference_id || "",
            workoutTitle: entry.title || "",
            workoutCategory: entry.category || "",
            exercisesCount: 0,
            duration: entry.duration_minutes || undefined,
            createdAt: entry.created_at || new Date().toISOString(),
          } as WorkoutLogEntry;
        }
      });
    },
  });

  // Fetch challenge progress
  const { data: challengeProgress } = useQuery({
    queryKey: ["challenge-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      // 1. Get active participation
      const { data: participation, error } = await supabase
        .from("user_challenge_participations")
        .select(`
          *,
          progress:user_challenge_progress (
            id,
            challenge_day_id,
            tasks_completed,
            completed_at
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      if (!participation) return null;

      // 2. Aggregate completed tasks from all daily progress rows
      // participation.progress is an array of { tasks_completed: string[] }
      const completedTasks = (participation.progress as any[] || [])
        .flatMap((p: any) => p.tasks_completed || [])
        .filter(Boolean);

      return {
        challengeId: participation.challenge_id,
        currentDay: participation.current_day || 1,
        startedAt: participation.started_at || new Date().toISOString(),
        status: (participation.status || "active") as UserChallengeProgress["status"],
        completedTasks: [...new Set(completedTasks)] as string[],
      };
    },
  });

  const todayEntries = entries.filter(e => e.date === getTodayISO());

  // Log meal mutation
  const logMealMutation = useMutation({
    mutationFn: async (diet: Diet) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Save to diary_entries (historical record)
      const { error: diaryError } = await supabase.from("diary_entries").insert({
        user_id: user.id,
        date: (diet as any).consumedAt ? (diet as any).consumedAt.split("T")[0] : getTodayISO(),
        entry_type: "meal",
        source: "diet",
        reference_id: diet.id,
        title: diet.title,
        category: diet.category,
        calories: diet.macros.calories,
        protein: diet.macros.protein,
        carbs: diet.macros.carbs,
        fat: diet.macros.fat,
        ingredients: (diet as any).ingredients, // Store granular ingredients
        created_at: (diet as any).consumedAt || new Date().toISOString(), // Use provided time or now
      });

      if (diaryError) {
        // Ignore unique constraint violation (idempotency)
        if (diaryError.code !== "23505") {
          throw diaryError;
        }
      }

      // 2. Add to today's check-in (live data)
      await addMealToCheckin(user.id, {
        diet_id: diet.id,
        diet_source: (diet as any).contentOrigin || "system",
        meal_type: (diet as any).category || "meal",
        completed: true,
        consumed_macros: (diet as any).macros,
      });

      return diet;
    },
    onSuccess: (diet) => {
      // Invalidate both diary and check-in queries
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-checkins"] });
      toast.success("Refeição registrada!", {
        description: `${diet.title} adicionada ao check-in`,
      });
    },
    onError: (error: any) => {
      console.error("Error logging meal:", error);
      toast.error("Erro ao registrar refeição", {
        description: error?.message || "Erro desconhecido"
      });
    },
  });

  // Update meal mutation
  const updateMealLogMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("diary_entries")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] }); // Refresh counters
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      toast.success("Consumo atualizado!");
    },
  });

  // Remove meal mutation
  const removeMealMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("diary_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      toast.success("Registro removido");
    },
  });

  // Log workout mutation
  const logWorkoutMutation = useMutation({
    mutationFn: async ({ workout, duration }: { workout: Workout; duration?: number }) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Save to diary_entries (historical record)
      const { error: diaryError } = await supabase.from("diary_entries").insert({
        user_id: user.id,
        date: getTodayISO(),
        entry_type: "workout",
        source: "workout",
        reference_id: workout.id,
        title: workout.title,
        category: workout.category,
        duration_minutes: duration,
      });

      if (diaryError) throw diaryError;

      // 2. Add to today's check-in (live data)
      const { addWorkoutToCheckin } = await import("@/lib/checkinHelpers");
      await addWorkoutToCheckin(user.id, {
        workout_id: workout.id,
        workout_source: (workout.contentOrigin as any) || "system",
        completed: true,
        duration_minutes: duration,
      });

      return workout;
    },
    onSuccess: (workout) => {
      // Invalidate both diary and check-in queries
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-checkins"] });
      toast.success("Treino registrado!", {
        description: `${workout.title} concluído e adicionado ao check-in`,
      });
    },
    onError: () => {
      toast.error("Erro ao registrar treino");
    },
  });

  // Remove workout mutation
  const removeWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Try to delete from diary_entries
      const { data: diaryEntry } = await supabase
        .from("diary_entries")
        .select("entry_type, reference_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (diaryEntry) {
        await supabase.from("diary_entries").delete().eq("id", id);

        // If it was a workout session, also delete the session
        if (diaryEntry.entry_type === 'workout' && diaryEntry.reference_id) {
          await supabase.from("workout_sessions").delete().eq("id", diaryEntry.reference_id);
        }
      } else {
        // If not found in diary_entries, maybe it's a session_id passed directly
        const { error: sessionError } = await supabase
          .from("workout_sessions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (sessionError) throw sessionError;

        // Also try to clean up any diary entry referencing this session
        await supabase.from("diary_entries")
          .delete()
          .eq("reference_id", id)
          .eq("entry_type", "workout");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      toast.success("Registro removido");
    },
  });

  // Update workout session set
  const updateWorkoutSetMutation = useMutation({
    mutationFn: async ({ setId, updates }: { setId: string; updates: any }) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("session_sets")
        .update(updates)
        .eq("id", setId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      toast.success("Série atualizada!");
    },
  });

  // Log single exercise mutation
  const logExerciseMutation = useMutation({
    mutationFn: async ({ exercise, logData }: { exercise: any; logData?: any }) => {
      if (!user) throw new Error("User not authenticated");

      const today = getTodayISO();

      // 1. Idempotency Check: Verify if already logged today (for simple toggle)
      // Only skip if NO detailed log data is provided. If details provided, allows multiple logs?
      // User request implies "updating data", maybe multiple times.
      // But "Marcar como Feito" usually implies once-per-day simply.
      // If logData is provided, we treat it as a NEW execution record always.

      if (!logData) {
        const { data: existing } = await supabase
          .from("diary_entries")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("reference_id", exercise.id)
          .eq("entry_type", "exercise")
          .maybeSingle();

        if (existing) {
          return exercise; // Already done (simple mode), just return
        }
      }

      // 2. If detailed log data is provided, create a Standalone Session
      if (logData) {
        // A. Create Ad-Hoc Session
        const { data: session, error: sessionError } = await supabase
          .from("workout_sessions")
          .insert({
            user_id: user.id,
            workout_id: null, // Ad-hoc session (requires schema change applied)
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            total_duration_seconds: logData.duration ? logData.duration * logData.sets : 0, // Approx
            total_sets: logData.sets,
            completed_sets: logData.sets,
            total_exercises: 1,
            completed_exercises: 1,
            metadata: { type: 'standalone_exercise', exercise_name: exercise.name }
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // B. Add Exercise to Session
        const { data: sessionExercise, error: exerciseError } = await supabase
          .from("session_exercises")
          .insert({
            session_id: session.id,
            exercise_id: exercise.id,
            is_completed: true,
            completed_at: new Date().toISOString(),
            display_order: 1
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        // C. Add Sets
        const setsToInsert = logData.details
          ? logData.details.map((detail: any, i: number) => ({
            session_exercise_id: sessionExercise.id,
            set_number: i + 1,
            is_completed: true,
            actual_reps: detail.reps,
            actual_weight_kg: detail.weight,
            time_under_tension_seconds: detail.duration,
            rest_seconds_taken: 0,
            completed_at: new Date().toISOString(),
          }))
          : Array.from({ length: logData.sets }).map((_, i) => ({
            // Fallback for old data structure
            session_exercise_id: sessionExercise.id,
            set_number: i + 1,
            is_completed: true,
            actual_reps: logData.reps,
            actual_weight_kg: logData.weight,
            time_under_tension_seconds: logData.duration,
            rest_seconds_taken: 0,
            completed_at: new Date().toISOString(),
          }));

        const { error: setsError } = await supabase
          .from("session_sets")
          .insert(setsToInsert);

        if (setsError) throw setsError;
      }

      // 3. Save to diary_entries (for Calendar Tracking)
      // Even if doing multiple details, we want to ensure at least one entry exists for the day
      const { data: existingDiary } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("reference_id", exercise.id)
        .eq("entry_type", "exercise")
        .maybeSingle();

      if (!existingDiary) {
        const { error: diaryError } = await supabase.from("diary_entries").insert({
          user_id: user.id,
          date: today,
          entry_type: "exercise",
          source: "manual",
          reference_id: exercise.id,
          title: exercise.name,
          category: exercise.primaryMuscleGroup || exercise.muscleGroups?.[0] || "other",
        });
        if (diaryError) throw diaryError;
      }

      // 4. Update Check-in Status (Ensure Partial)
      const { ensureTodayCheckin } = await import("@/lib/checkinHelpers");
      await ensureTodayCheckin(user.id);

      return exercise;
    },
    onSuccess: (exercise) => {
      queryClient.invalidateQueries({ queryKey: ["diary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-history"] }); // Update history chart
      toast.success("Exercício concluído!", {
        description: `${exercise.name} registrado com sucesso.`,
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao registrar exercício");
    },
  });

  // Start challenge mutation
  const startChallengeMutation = useMutation({
    mutationFn: async (challenge: Challenge) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("join_challenge", {
        p_challenge_id: challenge.id,
        p_user_id: user.id
      });

      if (error) throw error;
      return challenge;
    },
    onSuccess: (challenge) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });
      // Invalidate challenges list as well since participation status checks it
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast.success("Desafio iniciado!", {
        description: `Você começou: ${challenge.name}`,
      });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ challenge, dayNumber, task }: { challenge: Challenge; dayNumber: number; task: ChallengeTask }) => {
      if (!user || !challengeProgress) throw new Error("No active challenge or user");

      // We need the dayId to complete the task via RPC
      // Assuming we have to find it or passing it? 
      // The RPC signature in useChallenges is: p_participation_id, p_day_id, p_task_id, p_user_id
      // But here we have dayNumber. We need to fetch the dayId first or use a helper?

      // Since we don't have dayId handy here easily without fetching, 
      // we can fetch the day info from 'challenge_days' using challenge_id + day_number
      const { data: dayData, error: dayError } = await supabase
        .from("challenge_days")
        .select("id")
        .eq("challenge_id", challenge.id)
        .eq("day_number", dayNumber)
        .single();

      if (dayError || !dayData) throw new Error("Day not found");

      // Get participation ID
      const { data: partData, error: partError } = await supabase
        .from("user_challenge_participations")
        .select("id")
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (partError || !partData) throw new Error("Participation not found");

      const { data, error } = await supabase.rpc("complete_challenge_task", {
        p_participation_id: partData.id,
        p_day_id: dayData.id,
        p_task_id: task.id,
        p_user_id: user.id
      });

      if (error) throw error;
      return task;
    },
    onSuccess: (task) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });
      queryClient.invalidateQueries({ queryKey: ["active-challenge-participation"] });
      toast.success("Tarefa concluída!", { description: task.title });
    },
    onError: (error: any) => {
      toast.error("Erro ao completar tarefa");
    },
  });

  // Abandon challenge mutation
  const abandonChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !challengeProgress) throw new Error("No active challenge");

      const { error } = await supabase
        .from("user_challenge_participations") // Use new table
        .update({ status: "abandoned" })
        .eq("user_id", user.id)
        .eq("challenge_id", challengeProgress.challengeId)
        .eq("status", "active");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast.info("Desafio abandonado");
    },
  });

  const isMealLogged = (dietId: string, date?: string) => {
    const targetDate = date || getTodayISO();
    return entries.some(
      (e) => e.type === "meal" && (e as MealLogEntry).dietId === dietId && e.date === targetDate
    );
  };

  const isWorkoutLogged = (workoutId: string, date?: string) => {
    const targetDate = date || getTodayISO();
    return entries.some(
      (e) => e.type === "workout" && (e as WorkoutLogEntry).workoutId === workoutId && e.date === targetDate
    );
  };

  const isExerciseDone = (exerciseId: string, date?: string) => {
    const targetDate = date || getTodayISO();
    return entries.some(
      (e) => e.type === "exercise" && (e as any).exerciseId === exerciseId && e.date === targetDate
    );
  };

  const isTaskCompleted = (taskId: string) => {
    return challengeProgress?.completedTasks.includes(taskId) || false;
  };

  const getTodaySummary = (): DailySummary => {
    const today = getTodayISO();
    const todayMeals = entries.filter((e) => e.date === today && e.type === "meal") as MealLogEntry[];
    const todayWorkouts = entries.filter((e) => e.date === today && e.type === "workout") as WorkoutLogEntry[];

    return {
      date: today,
      totalCalories: todayMeals.reduce((sum, m) => sum + m.macros.calories, 0),
      totalProtein: todayMeals.reduce((sum, m) => sum + m.macros.protein, 0),
      totalCarbs: todayMeals.reduce((sum, m) => sum + m.macros.carbs, 0),
      totalFat: todayMeals.reduce((sum, m) => sum + m.macros.fat, 0),
      mealsCount: todayMeals.length,
      workoutsCount: todayWorkouts.length,
      challengeTasksCount: challengeProgress?.completedTasks.length || 0,
    };
  };

  const getEntriesByDate = (date: string): DiaryEntry[] => {
    return entries.filter((e) => e.date === date);
  };

  const updateWorkoutSet = (setId: string, updates: any) => {
    updateWorkoutSetMutation.mutate({ setId, updates });
  };

  const value: DiaryContextType = {
    entries,
    todayEntries,
    isLoading,
    logMeal: (diet) => logMealMutation.mutate(diet),
    removeMealLog: (id) => removeMealMutation.mutate(id),
    isMealLogged,
    logWorkout: (workout, duration) => logWorkoutMutation.mutate({ workout, duration }),
    removeWorkoutLog: (id) => removeWorkoutMutation.mutate(id),
    isWorkoutLogged,
    logExercise: (data) => logExerciseMutation.mutate(data),
    isExerciseDone,
    challengeProgress,
    startChallenge: (c) => startChallengeMutation.mutate(c),
    completeTask: (c, d, t) => completeTaskMutation.mutate({ challenge: c, dayNumber: d, task: t }),
    isTaskCompleted,
    abandonChallenge: () => abandonChallengeMutation.mutate(),
    getTodaySummary,
    getEntriesByDate,
    updateMealLog: (id, updates) => updateMealLogMutation.mutate({ id, updates }),
    updateWorkoutSet,
  };

  // Expose to window for quick access in components without refactoring all props
  if (typeof window !== "undefined") {
    (window as any).removeMealLog = value.removeMealLog;
    (window as any).removeWorkoutLog = value.removeWorkoutLog;
    (window as any).updateMealLog = value.updateMealLog;
    (window as any).updateWorkoutSet = value.updateWorkoutSet;
  }

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return context;
}
