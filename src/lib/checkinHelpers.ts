import { supabase } from "@/integrations/supabase/client";

/**
 * Checkin Helpers - Centralized functions for check-in operations
 * 
 * This module provides reusable functions to ensure consistency
 * across all features that interact with the check-in system.
 */

// ==========================================
// TYPES
// ==========================================

export interface CheckinData {
  id: string;
  user_id: string;
  date: string;
  status: "partial" | "complete";
}

export interface MealData {
  diet_id: string;
  diet_source: "system" | "user" | "admin";
  meal_type?: string;
  completed: boolean;
  consumed_macros?: any; // JSONB
  diet_plan_id?: string;
  diet_plan_meal_id?: string;
}

export interface WorkoutData {
  workout_id: string;
  workout_source: "system" | "user";
  completed: boolean;
  duration_minutes?: number;
}

export interface ChallengeTaskData {
  challenge_id: string;
  task_id: string;
  day_number: number;
  completed: boolean;
  value?: number;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Ensure a daily check-in exists for today
 * Creates one if it doesn't exist, returns existing otherwise
 */
export async function ensureTodayCheckin(userId: string): Promise<CheckinData> {
  const today = getTodayISO();

  // Try to get existing checkin
  const { data: existingCheckin } = await supabase
    .from("daily_checkins")
    .select("id, user_id, date, status")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (existingCheckin) {
    return existingCheckin as CheckinData;
  }

  // Create new checkin
  const { data: newCheckin, error } = await supabase
    .from("daily_checkins")
    .insert({
      user_id: userId,
      date: today,
      status: "partial",
      water_current: 0,
      water_goal: 2000,
    })
    .select("id, user_id, date, status")
    .single();

  if (error) throw error;
  return newCheckin as CheckinData;
}

/**
 * Add a meal to today's check-in
 */
export async function addMealToCheckin(
  userId: string,
  mealData: MealData
): Promise<void> {
  const checkin = await ensureTodayCheckin(userId);

  // Insert new meal entry every time (Diary-style)
  // This supports eating the same meal multiple times a day
  const { error } = await supabase.from("checkin_meals").insert({
    checkin_id: checkin.id,
    diet_id: mealData.diet_id,
    diet_source: mealData.diet_source,
    meal_type: mealData.meal_type,
    completed: mealData.completed,
    consumed_macros: mealData.consumed_macros,
    diet_plan_id: mealData.diet_plan_id,
    diet_plan_meal_id: mealData.diet_plan_meal_id,
  });

  if (error) throw error;
}

/**
 * Add a workout to today's check-in
 */
export async function addWorkoutToCheckin(
  userId: string,
  workoutData: WorkoutData
): Promise<void> {
  const checkin = await ensureTodayCheckin(userId);

  // Allow multiple workout entries
  const { error } = await supabase.from("checkin_workouts").insert({
    checkin_id: checkin.id,
    workout_id: workoutData.workout_id,
    workout_source: workoutData.workout_source,
    completed: workoutData.completed,
    duration_minutes: workoutData.duration_minutes,
  });

  if (error) throw error;
}

/**
 * Add a challenge task to today's check-in
 * Idempotent - won't create duplicates
 */
export async function addChallengeTaskToCheckin(
  userId: string,
  taskData: ChallengeTaskData
): Promise<void> {
  const checkin = await ensureTodayCheckin(userId);

  // Check if task already exists
  const { data: existing } = await supabase
    .from("checkin_challenge_tasks")
    .select("id")
    .eq("checkin_id", checkin.id)
    .eq("challenge_id", taskData.challenge_id)
    .eq("task_id", taskData.task_id)
    .eq("day_number", taskData.day_number)
    .maybeSingle();

  if (existing) {
    // Already completed, do nothing
    return;
  }

  // Insert new
  const { error } = await supabase.from("checkin_challenge_tasks").insert({
    checkin_id: checkin.id,
    challenge_id: taskData.challenge_id,
    task_id: taskData.task_id,
    day_number: taskData.day_number,
    completed: taskData.completed,
    value: taskData.value,
  });

  if (error) {
    // If unique constraint error, task is already completed
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

/**
 * Save complete check-in with all data
 * This is the main function for persisting check-in state
 */
export async function saveCompleteCheckin(
  userId: string,
  checkinData: {
    meals: MealData[];
    workouts: WorkoutData[];
    challengeTasks: ChallengeTaskData[];
    water?: { current: number; goal: number };
    mood?: string;
    weight?: number;
    notes?: string;
  }
): Promise<string> {
  const today = getTodayISO();

  // 1. Upsert daily_checkins
  const { data: savedCheckin, error: checkinError } = await supabase
    .from("daily_checkins")
    .upsert(
      {
        user_id: userId,
        date: today,
        water_current: checkinData.water?.current || 0,
        water_goal: checkinData.water?.goal || 2000,
        mood: checkinData.mood as "great" | "good" | "okay" | "bad" | undefined,
        weight: checkinData.weight,
        status: "complete",
        completed_at: new Date().toISOString(),
        notes: checkinData.notes,
      },
      { onConflict: "user_id,date" }
    )
    .select("id")
    .single();

  if (checkinError) throw checkinError;

  const checkinId = savedCheckin.id;

  // 2. Save weight log if provided
  if (checkinData.weight) {
    await supabase.from("weight_logs").upsert(
      {
        user_id: userId,
        date: today,
        weight: checkinData.weight,
      },
      { onConflict: "user_id,date" }
    );

    // FIX: Also update the main user profile with the new weight
    await supabase.from("user_body_profiles").update({
      current_weight: checkinData.weight,
      updated_at: new Date().toISOString()
    }).eq("user_id", userId);
  }

  // 3. Save meals to BOTH checkin_meals AND diary_entries
  await supabase.from("checkin_meals").delete().eq("checkin_id", checkinId);

  if (checkinData.meals.length > 0) {
    // A. Save to checkin_meals (checkin record)
    await supabase.from("checkin_meals").insert(
      checkinData.meals.map((meal) => ({
        checkin_id: checkinId,
        diet_id: meal.diet_id,
        diet_source: meal.diet_source,
        meal_type: meal.meal_type,
        completed: meal.completed,
        consumed_macros: meal.consumed_macros,
        diet_plan_id: meal.diet_plan_id,
        diet_plan_meal_id: meal.diet_plan_meal_id,
      }))
    );

    // B. Save to diary_entries (historical record - used by daily summary)
    for (const meal of checkinData.meals) {
      // Check if already exists in diary_entries for today
      const { data: existing } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("reference_id", meal.diet_id)
        .eq("entry_type", "meal")
        .maybeSingle();

      if (!existing) {
        // Fetch diet details to get macros and ingredients
        const { data: diet } = await supabase
          .from("dishes")
          .select("*")
          .eq("id", meal.diet_id)
          .single();

        if (diet) {
          await supabase.from("diary_entries").insert({
            user_id: userId,
            date: today,
            entry_type: "meal",
            source: "diet",
            reference_id: meal.diet_id,
            title: diet.name,
            category: meal.meal_type || diet.category,
            calories: diet.calories || 0,
            protein: diet.protein || 0,
            carbs: diet.carbs || 0,
            fat: diet.fat || 0,
            ingredients: diet.ingredients || [],
          });
        }
      }
    }
  }

  // 4. Save workouts to BOTH checkin_workouts AND workout_sessions
  await supabase.from("checkin_workouts").delete().eq("checkin_id", checkinId);

  if (checkinData.workouts.length > 0) {
    // A. Save to checkin_workouts (checkin record)
    await supabase.from("checkin_workouts").insert(
      checkinData.workouts.map((workout) => ({
        checkin_id: checkinId,
        workout_id: workout.workout_id,
        workout_source: workout.workout_source,
        completed: workout.completed,
        duration_minutes: workout.duration_minutes,
      }))
    );

    // B. Save to workout_sessions (historical record - used by daily summary)
    for (const workout of checkinData.workouts) {
      // Check if already exists in diary_entries for today
      const { data: existingDiary } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("reference_id", workout.workout_id)
        .eq("entry_type", "workout")
        .maybeSingle();

      if (!existingDiary) {
        // Fetch workout details
        const { data: workoutDetails } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", workout.workout_id)
          .single();

        if (workoutDetails) {
          await supabase.from("diary_entries").insert({
            user_id: userId,
            date: today,
            entry_type: "workout",
            source: "workout",
            reference_id: workout.workout_id,
            title: workoutDetails.title,
            category: workoutDetails.category,
            duration_minutes: workout.duration_minutes,
          });
        }
      }
    }
  }

  // 5. Insert challenge tasks (don't delete, they accumulate)
  if (checkinData.challengeTasks.length > 0) {
    for (const task of checkinData.challengeTasks) {
      const { error } = await supabase.from("checkin_challenge_tasks").insert({
        checkin_id: checkinId,
        challenge_id: task.challenge_id,
        task_id: task.task_id,
        day_number: task.day_number,
        completed: task.completed,
        value: task.value,
      });

      // Ignore unique constraint errors (already exists)
      if (error && error.code !== "23505") {
        throw error;
      }
    }
  }

  return checkinId;
}

/**
 * Save a single check-in action (partial save)
 * Useful for "Quick Logging" from dashboard or fast check-in
 */
export async function savePartialCheckin(
  userId: string,
  action: {
    type: "water" | "mood" | "weight" | "meal" | "workout" | "task" | "habit";
    value: any;
    id?: string; // ID of the specific item (diet_id, workout_id, etc.)
  }
): Promise<void> {
  const today = getTodayISO();
  const checkin = await ensureTodayCheckin(userId);

  switch (action.type) {
    case "water":
      await supabase
        .from("daily_checkins")
        .update({
          water_current: action.value.current,
          water_goal: action.value.goal || 2000,
          updated_at: new Date().toISOString()
        })
        .eq("id", checkin.id);
      break;

    case "mood":
      await supabase
        .from("daily_checkins")
        .update({
          mood: action.value,
          updated_at: new Date().toISOString()
        })
        .eq("id", checkin.id);
      break;

    case "weight":
      await supabase
        .from("daily_checkins")
        .update({
          weight: action.value,
          updated_at: new Date().toISOString()
        })
        .eq("id", checkin.id);

      // Also update log and profile
      await supabase.from("weight_logs").upsert({
        user_id: userId,
        date: today,
        weight: action.value
      }, { onConflict: "user_id,date" });

      await supabase.from("user_body_profiles")
        .update({
          current_weight: action.value,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      break;

    case "meal":
      // Save to checkin_meals
      await addMealToCheckin(userId, action.value);

      // ALSO save to diary_entries (for daily summary)
      const { data: existingMeal } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("reference_id", action.value.diet_id)
        .eq("entry_type", "meal")
        .maybeSingle();

      if (!existingMeal) {
        const { data: diet } = await supabase
          .from("dishes")
          .select("*")
          .eq("id", action.value.diet_id)
          .single();

        if (diet) {
          await supabase.from("diary_entries").insert({
            user_id: userId,
            date: today,
            entry_type: "meal",
            source: "diet",
            reference_id: action.value.diet_id,
            title: diet.name,
            category: action.value.meal_type || diet.category,
            calories: diet.calories || 0,
            protein: diet.protein || 0,
            carbs: diet.carbs || 0,
            fat: diet.fat || 0,
            ingredients: diet.ingredients || [],
          });
        }
      }
      break;

    case "workout":
      // Save to checkin_workouts
      await addWorkoutToCheckin(userId, action.value);

      // ALSO save to diary_entries (for daily summary)
      const { data: existingWorkout } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("reference_id", action.value.workout_id)
        .eq("entry_type", "workout")
        .maybeSingle();

      if (!existingWorkout) {
        const { data: workoutDetails } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", action.value.workout_id)
          .single();

        if (workoutDetails) {
          await supabase.from("diary_entries").insert({
            user_id: userId,
            date: today,
            entry_type: "workout",
            source: "workout",
            reference_id: action.value.workout_id,
            title: workoutDetails.title,
            category: workoutDetails.category,
            duration_minutes: action.value.duration_minutes,
          });
        }
      }
      break;

    case "task":
      await addChallengeTaskToCheckin(userId, action.value);
      break;

    case "habit":
      await supabase.from("habit_logs").upsert(
        {
          user_id: userId,
          habit_id: action.id,
          date: today,
          value: action.value.value,
          goal: action.value.goal,
        },
        { onConflict: "user_id,habit_id,date" }
      );
      break;
  }
}

/**
 * Invalidate all check-in related queries
 * Call this after any check-in operation to ensure UI updates
 */
export function getCheckinQueryKeys(userId?: string) {
  return [
    ["today-checkin", userId],
    ["weekly-checkins", userId],
    ["diary-entries", userId],
    ["challenge-progress", userId],
    ["last-weight", userId],
    ["weekly-weight", userId],
    ["user-metrics", userId],
    ["body-metrics", userId],
    ["user_body_profiles", userId], // FIX: Invalidate profile when weight changes
    ["daily-summary", userId], // FIX: Invalidate summary to show updated data
    ["achievements", userId],
    ["user-xp", userId],
  ];
}

/**
 * Process post-checkin actions (achievements, streaks, XP)
 * Call this after a successful check-in
 */
export async function processPostCheckinActions(
  userId: string,
  queryClient: any
): Promise<void> {
  try {
    // 1. Update streak
    const { updateStreak, checkAllAchievementsAfterCheckin } = await import(
      "@/lib/achievementHelpers"
    );
    const newStreak = await updateStreak(userId);

    // 2. Check and grant achievements
    const granted = await checkAllAchievementsAfterCheckin(userId, queryClient);

    // 3. Award base XP for check-in
    const { data: xpSettings } = await supabase
      .from("xp_settings")
      .select("xp_per_checkin")
      .limit(1)
      .maybeSingle();

    const xpSettingsData = xpSettings as any;
    const baseXp = xpSettingsData?.xp_per_checkin || 10;

    // Award XP directly
    const { data: userXp } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", userId)
      .maybeSingle();

    const newTotalXp = (userXp?.total_xp || 0) + baseXp;

    await supabase.from("user_xp").upsert(
      {
        user_id: userId,
        total_xp: newTotalXp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log("✅ Post-checkin actions completed:", {
      streak: newStreak,
      xpAwarded: baseXp,
      achievements: granted,
    });
  } catch (error) {
    console.error("Error in post-checkin actions:", error);
    // Don't throw - these are bonus features
  }
}
