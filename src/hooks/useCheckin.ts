import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DailyCheckin,
  CheckinStep,
  CheckinStatus,
  MealEntry,
  WorkoutEntry,
  ChallengeTaskEntry,
  HabitEntry,
  MoodType,
  CHECKIN_STEPS,
} from "@/types/checkin";
import { useUserContent } from "@/contexts/UserContentContext";
import { useChallenges } from "@/hooks/useChallenges";
import { useUserHabits, Habit } from "@/hooks/useHabits";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { WATER_GOAL_ML } from "@/lib/constants";

const getTodayISO = () => new Date().toISOString().split("T")[0];

const createEmptyCheckin = (lastWeight?: number): DailyCheckin => ({
  id: crypto.randomUUID(),
  date: getTodayISO(),
  status: "not_started",
  meals: [],
  workouts: [],
  challengeTasks: [],
  habits: [],
  water: { current: 0, goal: WATER_GOAL_ML },
  mood: undefined,
  weight: undefined,
  lastWeight,
  notes: undefined,
  completedAt: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function useCheckin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { allDiets, allWorkouts } = useUserContent();
  const { activeChallenge, currentChallengeDay } = useChallenges();
  const { habits: availableHabits, isLoading: habitsLoading } = useUserHabits();
  const { isEnabled: habitsEnabled } = useFeatureFlag("enable_custom_habits");
  const { isEnabled: waterTrackingEnabled } = useFeatureFlag("water_tracking");

  const availableSteps = useMemo(() => {
    return CHECKIN_STEPS.filter(step => {
      if (step === 'habits') return habitsEnabled;
      if (step === 'water') return waterTrackingEnabled;
      return true;
    });
  }, [habitsEnabled, waterTrackingEnabled]);

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [mode, setMode] = useState<"hub" | "wizard">("hub");

  // Fetch last weight
  const { data: lastWeight } = useQuery({
    queryKey: ["last-weight", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from("weight_logs")
        .select("weight")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      return data?.weight ? Number(data.weight) : null;
    },
  });

  // Fetch today's checkin
  const { data: todayCheckin, isLoading: loadingCheckin } = useQuery({
    queryKey: ["today-checkin", user?.id, getTodayISO()],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const today = getTodayISO();
      const { data: checkin } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (!checkin) return null;

      // Fetch meals
      const { data: meals } = await supabase
        .from("checkin_meals")
        .select("*")
        .eq("checkin_id", checkin.id);

      // Fetch workouts
      const { data: workouts } = await supabase
        .from("checkin_workouts")
        .select("*")
        .eq("checkin_id", checkin.id);

      // Fetch challenge tasks
      const { data: tasks } = await supabase
        .from("checkin_challenge_tasks")
        .select("*")
        .eq("checkin_id", checkin.id);

      // Fetch habits - fallback to empty as this table is deprecated/missing
      const habitEntries: any[] = [];

      return {
        id: checkin.id,
        date: checkin.date || today,
        status: (checkin.status || "not_started") as CheckinStatus,
        meals: (meals || []).map((m: any) => ({
          dietId: m.diet_id || "",
          dietName: "", // Populated later or via join if needed
          mealType: (m.meal_type || "lunch") as MealEntry["mealType"],
          completed: m.completed || false,
          consumedMacros: m.consumed_macros,
        })),
        workouts: (workouts || []).map((w) => ({
          workoutId: w.workout_id || "",
          workoutName: "",
          completed: w.completed || false,
        })),
        challengeTasks: (tasks || []).map((t) => ({
          taskId: t.task_id || "",
          dayNumber: t.day_number || 1,
          completed: t.completed || false,
        })),
        habits: (habitEntries || []).map((h: any) => ({
          habitId: h.habit_id || "",
          habitName: h.habit_name || "",
          icon: h.icon || "target",
          color: h.color || "#6366f1",
          unit: h.unit || "",
          goal: h.goal || 1,
          current: h.current || 0,
          completed: h.completed || false,
        })) as HabitEntry[],
        water: {
          current: checkin.water_current || 0,
          goal: checkin.water_goal || WATER_GOAL_ML,
        },
        mood: checkin.mood as MoodType | undefined,
        weight: checkin.weight ? Number(checkin.weight) : undefined,
        lastWeight: lastWeight,
        notes: checkin.notes || undefined,
        completedAt: checkin.completed_at || undefined,
        createdAt: checkin.created_at || new Date().toISOString(),
        updatedAt: checkin.updated_at || new Date().toISOString(),
      } as DailyCheckin;
    },
  });

  const [localCheckin, setLocalCheckin] = useState<DailyCheckin | null>(null);

  const checkin = useMemo(() => {
    if (localCheckin) return localCheckin;
    if (todayCheckin) return todayCheckin;
    return createEmptyCheckin(lastWeight);
  }, [localCheckin, todayCheckin, lastWeight]);

  const availableDiets = allDiets.filter((d) => d.isActive);
  const availableWorkouts = allWorkouts.filter((w) => w.isActive);

  const currentStep: CheckinStep =
    currentStepIndex === -1 ? "initial" : availableSteps[currentStepIndex];

  const calculateStatus = useCallback((data: DailyCheckin): CheckinStatus => {
    const hasAnyData =
      data.meals.length > 0 ||
      data.workouts.length > 0 ||
      data.challengeTasks.length > 0 ||
      (habitsEnabled && data.habits.length > 0) ||
      (waterTrackingEnabled && data.water.current > 0) ||
      data.mood !== undefined ||
      data.weight !== undefined;

    if (!hasAnyData) return "not_started";

    const hasCompletedMeal = data.meals.some((m) => m.completed);
    const hasCompletedWorkout = data.workouts.some((w) => w.completed);
    const hasCompletedTask = data.challengeTasks.some((t) => t.completed);
    const hasCompletedHabit = habitsEnabled && data.habits.some((h) => h.completed);
    const hasWater = waterTrackingEnabled && data.water.current >= data.water.goal * 0.5;
    const hasMood = data.mood !== undefined;

    const completionCount = [hasCompletedMeal, hasCompletedWorkout, hasCompletedTask, hasCompletedHabit, hasWater, hasMood].filter(Boolean).length;

    if (completionCount >= 3) return "complete";
    return "partial";
  }, [habitsEnabled, waterTrackingEnabled]);

  const startWizard = useCallback((stepIndex?: number) => {
    setMode("wizard");
    setCurrentStepIndex(stepIndex ?? 0);
  }, []);

  const exitWizard = useCallback(() => {
    setMode("hub");
    setCurrentStepIndex(-1);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < availableSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, availableSteps.length]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setMode("hub");
      setCurrentStepIndex(-1);
    }
  }, [currentStepIndex]);

  const toggleMeal = useCallback((
    dietId: string,
    dietName: string,
    mealType: MealEntry["mealType"],
    consumedMacros?: MealEntry["consumedMacros"]
  ) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const existingIndex = current.meals.findIndex((m) => m.dietId === dietId);
      let newMeals: MealEntry[];

      if (existingIndex !== -1) {
        // If providing new macros, update them. Use toggle logic if just clicking.
        // If macros provided, assume we are setting/updating, not just toggling off.
        if (consumedMacros) {
          newMeals = current.meals.map((m, i) =>
            i === existingIndex ? { ...m, completed: true, consumedMacros } : m
          );
        } else {
          // Standard toggle behavior (remove if exists or toggle completed status)
          newMeals = current.meals.map((m, i) =>
            i === existingIndex ? { ...m, completed: !m.completed } : m
          );
        }
      } else {
        newMeals = [...current.meals, {
          dietId,
          dietName,
          mealType,
          completed: true,
          consumedMacros
        }];
      }

      return {
        ...current,
        meals: newMeals,
        status: calculateStatus({ ...current, meals: newMeals }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const toggleWorkout = useCallback((workoutId: string, workoutName: string) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const existingIndex = current.workouts.findIndex((w) => w.workoutId === workoutId);
      let newWorkouts: WorkoutEntry[];

      if (existingIndex !== -1) {
        newWorkouts = current.workouts.map((w, i) =>
          i === existingIndex ? { ...w, completed: !w.completed } : w
        );
      } else {
        newWorkouts = [...current.workouts, { workoutId, workoutName, completed: true }];
      }

      return {
        ...current,
        workouts: newWorkouts,
        status: calculateStatus({ ...current, workouts: newWorkouts }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const toggleChallengeTask = useCallback((task: ChallengeTaskEntry) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const existingIndex = current.challengeTasks.findIndex((t) => t.taskId === task.taskId);
      let newTasks: ChallengeTaskEntry[];

      if (existingIndex !== -1) {
        newTasks = current.challengeTasks.map((t, i) =>
          i === existingIndex ? { ...t, completed: !t.completed } : t
        );
      } else {
        newTasks = [...current.challengeTasks, { ...task, completed: true }];
      }

      return {
        ...current,
        challengeTasks: newTasks,
        status: calculateStatus({ ...current, challengeTasks: newTasks }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const updateWater = useCallback((amount: number) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const newWater = {
        ...current.water,
        current: Math.max(0, current.water.current + amount),
      };
      return {
        ...current,
        water: newWater,
        status: calculateStatus({ ...current, water: newWater }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const setWater = useCallback((current: number) => {
    setLocalCheckin((prev) => {
      const currentCheckin = prev || checkin;
      const newWater = { ...currentCheckin.water, current: Math.max(0, current) };
      return {
        ...currentCheckin,
        water: newWater,
        status: calculateStatus({ ...currentCheckin, water: newWater }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const updateMood = useCallback((mood: MoodType) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      return {
        ...current,
        mood,
        status: calculateStatus({ ...current, mood }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  const updateWeight = useCallback((weight: number | undefined) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      return {
        ...current,
        weight,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin]);

  // Toggle habit completion (for simple habits with goal = 1)
  const toggleHabit = useCallback((habit: Habit) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const existingIndex = current.habits.findIndex((h) => h.habitId === habit.id);
      let newHabits: HabitEntry[];

      if (existingIndex !== -1) {
        // Toggle existing
        const existing = current.habits[existingIndex];
        const newCompleted = !existing.completed;
        newHabits = current.habits.map((h, i) =>
          i === existingIndex
            ? { ...h, completed: newCompleted, current: newCompleted ? h.goal : 0 }
            : h
        );
      } else {
        // Add new entry as completed
        newHabits = [
          ...current.habits,
          {
            habitId: habit.id,
            habitName: habit.name,
            icon: habit.icon,
            color: habit.color,
            unit: habit.unit,
            goal: habit.default_goal,
            current: habit.default_goal,
            completed: true,
          },
        ];
      }

      return {
        ...current,
        habits: newHabits,
        status: calculateStatus({ ...current, habits: newHabits }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, calculateStatus]);

  // Update habit progress (for habits with goal > 1)
  const updateHabitProgress = useCallback((habitId: string, delta: number) => {
    setLocalCheckin((prev) => {
      const current = prev || checkin;
      const habit = availableHabits.find((h) => h.id === habitId);
      if (!habit) return current;

      const existingIndex = current.habits.findIndex((h) => h.habitId === habitId);
      let newHabits: HabitEntry[];

      if (existingIndex !== -1) {
        // Update existing
        const existing = current.habits[existingIndex];
        const newCurrent = Math.max(0, Math.min(existing.goal, existing.current + delta));
        newHabits = current.habits.map((h, i) =>
          i === existingIndex
            ? { ...h, current: newCurrent, completed: newCurrent >= h.goal }
            : h
        );
      } else {
        // Create new entry with progress
        const newCurrent = Math.max(0, delta);
        newHabits = [
          ...current.habits,
          {
            habitId: habit.id,
            habitName: habit.name,
            icon: habit.icon,
            color: habit.color,
            unit: habit.unit,
            goal: habit.default_goal,
            current: newCurrent,
            completed: newCurrent >= habit.default_goal,
          },
        ];
      }

      return {
        ...current,
        habits: newHabits,
        status: calculateStatus({ ...current, habits: newHabits }),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [checkin, availableHabits, calculateStatus]);

  const saveCheckin = useCallback(async () => {
    if (!user) return false;

    setIsSaving(true);
    const dataToSave = localCheckin || checkin;

    try {
      // Use centralized helper to save complete check-in
      const { saveCompleteCheckin, getCheckinQueryKeys } = await import("@/lib/checkinHelpers");

      await saveCompleteCheckin(user.id, {
        meals: dataToSave.meals.map(m => ({
          diet_id: m.dietId,
          diet_source: m.source || "system",
          meal_type: m.mealType || "meal",
          completed: m.completed,
          consumed_macros: m.consumedMacros,
        })),
        workouts: dataToSave.workouts.map(w => ({
          workout_id: w.workoutId,
          workout_source: w.source || "system",
          completed: w.completed,
          duration_minutes: w.durationMinutes,
        })),
        challengeTasks: dataToSave.challengeTasks.map(t => ({
          challenge_id: t.challengeId,
          task_id: t.taskId,
          day_number: t.dayNumber,
          completed: t.completed,
          value: t.value,
        })),
        water: dataToSave.water,
        mood: dataToSave.mood,
        weight: dataToSave.weight,
        notes: dataToSave.notes,
      });

      // Also save habits
      if (dataToSave.habits && dataToSave.habits.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        for (const habit of dataToSave.habits) {
          if (habit.currentValue > 0) {
            await supabase.from("habit_logs").upsert(
              {
                user_id: user.id,
                habit_id: habit.id,
                date: today,
                value: habit.currentValue,
                goal: habit.goal,
              },
              { onConflict: "user_id,habit_id,date" }
            );
          }
        }
      }

      // Process post-checkin actions (achievements, streaks, XP)
      const { processPostCheckinActions } = await import("@/lib/checkinHelpers");
      await processPostCheckinActions(user.id, queryClient);

      // Invalidate all related queries
      const queryKeys = getCheckinQueryKeys(user.id);
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      setIsComplete(true);
      return true;
    } catch (error) {
      console.error("Error saving checkin:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, localCheckin, checkin, queryClient]);

  const resetCheckin = useCallback(() => {
    setLocalCheckin(null);
    setCurrentStepIndex(-1);
    setMode("hub");
    setIsComplete(false);
  }, []);

  const progress = useMemo(() => {
    if (currentStepIndex === -1) return 0;
    return Math.round(((currentStepIndex + 1) / availableSteps.length) * 100);
  }, [currentStepIndex, availableSteps.length]);

  const completionStats = useMemo(() => {
    const data = localCheckin || checkin;
    const mealsCompleted = data.meals.filter((m) => m.completed).length;
    const mealsTotal = availableDiets.length;
    const workoutsCompleted = data.workouts.filter((w) => w.completed).length;
    const workoutsTotal = availableWorkouts.length;
    const tasksCompleted = data.challengeTasks.filter((t) => t.completed).length;
    const tasksTotal = currentChallengeDay?.tasks.length || 0;
    const waterProgress = Math.min(100, Math.round((data.water.current / data.water.goal) * 100));
    const hasMood = data.mood !== undefined;
    const hasWeight = data.weight !== undefined;

    const allGoalsComplete =
      mealsCompleted >= mealsTotal &&
      mealsTotal > 0 &&
      workoutsCompleted >= workoutsTotal &&
      workoutsTotal > 0 &&
      (!waterTrackingEnabled || waterProgress >= 100) &&
      hasMood;

    const habitsCompleted = habitsEnabled ? data.habits.filter((h) => h.completed).length : 0;
    const habitsTotal = habitsEnabled ? availableHabits.length : 0;

    return {
      mealsCompleted,
      mealsTotal,
      workoutsCompleted,
      workoutsTotal,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal,
      waterProgress: waterTrackingEnabled ? waterProgress : 0,
      hasMood,
      hasWeight,
      allGoalsComplete,
    };
  }, [localCheckin, checkin, availableDiets.length, availableWorkouts.length, currentChallengeDay, availableHabits.length, habitsEnabled, waterTrackingEnabled]);

  return {
    checkin,
    currentStep,
    currentStepIndex,
    progress,
    isSaving,
    isComplete,
    completionStats,
    mode,
    availableSteps,
    availableDiets,
    availableWorkouts,
    availableHabits: habitsEnabled ? availableHabits : [],
    habitsEnabled,
    waterTrackingEnabled,
    activeChallenge,
    currentChallengeDay,
    startCheckin: startWizard,
    startWizard,
    exitWizard,
    nextStep,
    prevStep,
    goToStep: () => { },
    updateMeals: () => { },
    toggleMeal,
    updateWorkouts: () => { },
    toggleWorkout,
    toggleChallengeTask,
    toggleHabit,
    updateHabitProgress,
    updateWater: waterTrackingEnabled ? updateWater : () => { },
    setWater: waterTrackingEnabled ? setWater : () => { },
    updateMood,
    updateWeight,
    updateNotes: () => { },
    logAction: async (action: any) => {
      if (!user) return;
      if (action.type === 'water' && !waterTrackingEnabled) return;
      try {
        const { savePartialCheckin, getCheckinQueryKeys, processPostCheckinActions } = await import("@/lib/checkinHelpers");
        await savePartialCheckin(user.id, action);

        // Invalidate
        const queryKeys = getCheckinQueryKeys(user.id);
        queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

        // Optional: Trigger post-checkin actions (less heavy than full save)
        await processPostCheckinActions(user.id, queryClient);
      } catch (err) {
        console.error("Error logging action:", err);
      }
    },
    saveCheckin,
    resetCheckin,
  };
}
