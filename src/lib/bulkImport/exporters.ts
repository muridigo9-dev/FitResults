// ============================================
// DATA EXPORTERS
// Export existing data from database in import-compatible format
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ImportTemplate,
  ImportChallenge,
  ImportChallengeDay,
  ImportChallengeTask,
  ImportDiet,
  ImportWorkout,
  ImportExercise,
  ImportIngredient,
  ImportPreparationStep,
} from "./types";
import { TEMPLATE_VERSION } from "./templates";

// Type for raw database response (supports optional image_path column)
interface RawChallenge {
  id: string;
  name: string | null;
  description: string | null;
  total_days: number | null;
  is_active: boolean | null;
  image_url?: string | null;
  image_path?: string | null;
  challenge_days: Array<{
    id: string;
    day_number: number;
    challenge_tasks: Array<{
      id: string;
      title: string | null;
      instruction: string | null;
      task_type: string | null;
      target: number | null;
      unit: string | null;
      task_order: number | null;
    }>;
  }>;
}

interface RawDiet {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path?: string | null;
  category: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  is_active: boolean | null;
  diet_ingredients: Array<{
    id: string;
    name: string | null;
    quantity: string | null;
    unit: string | null;
    display_order: number | null;
  }>;
  diet_preparation_steps: Array<{
    id: string;
    step_order: number | null;
    description: string | null;
  }>;
}

interface RawWorkout {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  image_path?: string | null;
  category: string | null;
  is_active: boolean | null;
  workout_exercises: Array<{
    id: string;
    name: string | null;
    description: string | null;
    sets: number | null;
    reps: number | null;
    rest_seconds: number | null;
    exercise_order: number | null;
  }>;
}

// ============================================
// CHALLENGE EXPORTER
// ============================================
export async function exportChallenges(): Promise<ImportTemplate<ImportChallenge>> {
  // Note: image_url and image_path columns are added via migration
  // If migration hasn't run, these fields will be undefined
  const { data, error } = await supabase
    .from("challenges")
    .select(`
      id,
      name,
      description,
      total_days,
      is_active,
      challenge_days (
        id,
        day_number,
        challenge_tasks (
          id,
          title,
          instruction,
          task_type,
          target,
          unit,
          task_order
        )
      )
    `)
    .order("name");

  if (error) throw error;

  // Cast to support optional image columns
  const challenges = data as unknown as RawChallenge[] | null;

  const items: ImportChallenge[] = (challenges || []).map((challenge, idx) => {
    const days: ImportChallengeDay[] = (challenge.challenge_days || [])
      .sort((a, b) => a.day_number - b.day_number)
      .map((day) => {
        const tasks: ImportChallengeTask[] = (day.challenge_tasks || [])
          .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
          .map((task) => ({
            title: task.title || "",
            instruction: task.instruction || "",
            type: (task.task_type as "water" | "workout" | "meal" | "habit") || "habit",
            target: task.target || 0,
            unit: task.unit || "",
          }));

        return {
          day_number: day.day_number,
          tasks,
        };
      });

    return {
      external_id: `challenge_${idx + 1}_${challenge.name?.toLowerCase().replace(/\s+/g, "_").slice(0, 20) || "unnamed"}`,
      name: challenge.name || "",
      description: challenge.description || "",
      total_days: challenge.total_days || 0,
      is_active: challenge.is_active ?? true,
      image_url: challenge.image_url || undefined,
      image_path: challenge.image_path || undefined,
      days,
    };
  });

  return {
    version: TEMPLATE_VERSION,
    entity: "challenges",
    on_duplicate: "update",
    items,
  };
}

// ============================================
// DIET EXPORTER
// ============================================
// ============================================
// DIET EXPORTER
// ============================================
export async function exportDiets(): Promise<ImportTemplate<ImportDiet>> {
  const { data, error } = await supabase
    .from("dishes")
    .select(`
      id,
      title,
      description,
      image_url,
      category,
      calories,
      protein,
      carbs,
      fat,
      is_active,
      dish_ingredients (
        id,
        quantity,
        metric_unit,
        ingredients (
          name,
          unit
        )
      ),
      diet_preparation_steps (
        id,
        step_order,
        description
      )
    `)
    .order("title");

  if (error) throw error;

  // Cast to support optional image_path column
  const diets = data as any[] | null;

  const items: ImportDiet[] = (diets || []).map((diet, idx) => {
    const ingredients: ImportIngredient[] = (diet.dish_ingredients || [])
      .map((di: any) => ({
        name: di.ingredients?.name || "",
        quantity: di.quantity ? String(di.quantity) : "",
        unit: di.metric_unit || di.ingredients?.unit || "",
      }));

    const preparation: ImportPreparationStep[] = (diet.diet_preparation_steps || [])
      .sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0))
      .map((step: any) => ({
        order: step.step_order || 0,
        description: step.description || "",
      }));

    return {
      external_id: `diet_${idx + 1}_${diet.title?.toLowerCase().replace(/\s+/g, "_").slice(0, 20) || "unnamed"}`,
      title: diet.title || "",
      description: diet.description || "",
      image_url: diet.image_url || undefined,
      image_path: diet.image_path || undefined,
      category: diet.category || "",
      calories: diet.calories || 0,
      protein: Number(diet.protein) || 0,
      carbs: Number(diet.carbs) || 0,
      fat: Number(diet.fat) || 0,
      is_active: diet.is_active ?? true,
      ingredients,
      preparation,
    };
  });

  return {
    version: TEMPLATE_VERSION,
    entity: "diets",
    on_duplicate: "update",
    items,
  };
}

// ============================================
// WORKOUT EXPORTER
// ============================================
export async function exportWorkouts(): Promise<ImportTemplate<ImportWorkout>> {
  const { data, error } = await supabase
    .from("workouts")
    .select(`
      id,
      title,
      description,
      image_url,
      category,
      is_active,
      workout_exercises (
        id,
        name,
        description,
        sets,
        reps,
        rest_seconds,
        exercise_order
      )
    `)
    .eq("content_origin", "system")
    .order("title");

  if (error) throw error;

  // Cast to support optional image_path column
  const workouts = data as unknown as RawWorkout[] | null;

  const items: ImportWorkout[] = (workouts || []).map((workout, idx) => {
    const exercises: ImportExercise[] = (workout.workout_exercises || [])
      .sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0))
      .map((ex) => ({
        name: ex.name || "",
        description: ex.description || "",
        sets: ex.sets || 0,
        reps: ex.reps || 0,
        rest_seconds: ex.rest_seconds || 0,
        order: ex.exercise_order || 0,
      }));

    return {
      external_id: `workout_${idx + 1}_${workout.title?.toLowerCase().replace(/\s+/g, "_").slice(0, 20) || "unnamed"}`,
      title: workout.title || "",
      description: workout.description || "",
      image_url: workout.image_url || undefined,
      image_path: workout.image_path || undefined,
      category: workout.category || "",
      is_active: workout.is_active ?? true,
      exercises,
    };
  });

  return {
    version: TEMPLATE_VERSION,
    entity: "workouts",
    on_duplicate: "update",
    items,
  };
}

// ============================================
// EXPORT COUNTS
// ============================================
export async function getExportCounts(): Promise<{
  challenges: number;
  diets: number;
  workouts: number;
}> {
  const [challengesRes, dietsRes, workoutsRes] = await Promise.all([
    supabase.from("challenges").select("id", { count: "exact", head: true }),
    supabase.from("dishes").select("id", { count: "exact", head: true }),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("content_origin", "system"),
  ]);

  return {
    challenges: challengesRes.count || 0,
    diets: dietsRes.count || 0,
    workouts: workoutsRes.count || 0,
  };
}
