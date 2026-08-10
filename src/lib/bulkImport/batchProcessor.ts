// ============================================
// BATCH PROCESSOR WITH CANCELLATION SUPPORT
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ImportTemplate,
  ImportChallenge,
  ImportDiet,
  ImportWorkout,
  ImportResult,
  ImportItemResult,
  DuplicateStrategy,
} from "./types";

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  status: "idle" | "processing" | "completed" | "cancelled" | "error";
}

export interface BatchProcessorConfig {
  chunkSize: number;
  onProgress: (progress: BatchProgress) => void;
  signal?: AbortSignal;
}

const DEFAULT_CHUNK_SIZE = 50;

// ============================================
// BATCH CHALLENGE IMPORTER
// ============================================
export async function importChallengesBatch(
  template: ImportTemplate<ImportChallenge>,
  config: BatchProcessorConfig
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];
  const items = template.items;
  const total = items.length;
  const chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;

  config.onProgress({ current: 0, total, percentage: 0, status: "processing" });

  for (let i = 0; i < total; i++) {
    // Check for cancellation
    if (config.signal?.aborted) {
      config.onProgress({ current: i, total, percentage: (i / total) * 100, status: "cancelled" });
      return summarizeResults(results, total - i);
    }

    const item = items[i];
    
    try {
      const result = await processSingleChallenge(item, strategy);
      results.push(result);
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Update progress
    const percentage = ((i + 1) / total) * 100;
    config.onProgress({
      current: i + 1,
      total,
      percentage,
      currentItem: item.external_id,
      status: "processing",
    });

    // Yield to main thread every chunk
    if ((i + 1) % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  config.onProgress({ current: total, total, percentage: 100, status: "completed" });
  return summarizeResults(results);
}

async function processSingleChallenge(
  item: ImportChallenge,
  strategy: DuplicateStrategy
): Promise<ImportItemResult> {
  const { data: existing } = await supabase
    .from("challenges")
    .select("id, name")
    .eq("name", item.name)
    .maybeSingle();

  if (existing) {
    if (strategy === "skip") {
      return { external_id: item.external_id, status: "skipped", reason: "duplicate" };
    } else if (strategy === "error") {
      return { external_id: item.external_id, status: "error", reason: "duplicate exists" };
    }
    // Update
    await updateChallenge(existing.id, item);
    return { external_id: item.external_id, status: "updated" };
  } else {
    await insertChallenge(item);
    return { external_id: item.external_id, status: "inserted" };
  }
}

async function insertChallenge(item: ImportChallenge): Promise<void> {
  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      name: item.name,
      description: item.description,
      total_days: item.total_days,
      is_active: item.is_active,
    })
    .select()
    .single();

  if (error) throw error;

  for (const day of item.days) {
    const { data: challengeDay, error: dayError } = await supabase
      .from("challenge_days")
      .insert({
        challenge_id: challenge.id,
        day_number: day.day_number,
      })
      .select()
      .single();

    if (dayError) throw dayError;

    if (day.tasks.length > 0) {
      const { error: tasksError } = await supabase.from("challenge_tasks").insert(
        day.tasks.map((task, idx) => ({
          challenge_day_id: challengeDay.id,
          title: task.title,
          instruction: task.instruction,
          task_type: task.type,
          target: task.target,
          unit: task.unit,
          task_order: idx + 1,
        }))
      );
      if (tasksError) throw tasksError;
    }
  }
}

async function updateChallenge(id: string, item: ImportChallenge): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({
      name: item.name,
      description: item.description,
      total_days: item.total_days,
      is_active: item.is_active,
    })
    .eq("id", id);

  if (error) throw error;

  const { data: existingDays } = await supabase
    .from("challenge_days")
    .select("id")
    .eq("challenge_id", id);

  if (existingDays) {
    for (const day of existingDays) {
      await supabase.from("challenge_tasks").delete().eq("challenge_day_id", day.id);
    }
    await supabase.from("challenge_days").delete().eq("challenge_id", id);
  }

  for (const day of item.days) {
    const { data: challengeDay, error: dayError } = await supabase
      .from("challenge_days")
      .insert({
        challenge_id: id,
        day_number: day.day_number,
      })
      .select()
      .single();

    if (dayError) throw dayError;

    if (day.tasks.length > 0) {
      const { error: tasksError } = await supabase.from("challenge_tasks").insert(
        day.tasks.map((task, idx) => ({
          challenge_day_id: challengeDay.id,
          title: task.title,
          instruction: task.instruction,
          task_type: task.type,
          target: task.target,
          unit: task.unit,
          task_order: idx + 1,
        }))
      );
      if (tasksError) throw tasksError;
    }
  }
}

// ============================================
// BATCH DIET IMPORTER
// ============================================
export async function importDietsBatch(
  template: ImportTemplate<ImportDiet>,
  config: BatchProcessorConfig
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];
  const items = template.items;
  const total = items.length;
  const chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;

  config.onProgress({ current: 0, total, percentage: 0, status: "processing" });

  for (let i = 0; i < total; i++) {
    if (config.signal?.aborted) {
      config.onProgress({ current: i, total, percentage: (i / total) * 100, status: "cancelled" });
      return summarizeResults(results, total - i);
    }

    const item = items[i];
    
    try {
      const result = await processSingleDiet(item, strategy);
      results.push(result);
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const percentage = ((i + 1) / total) * 100;
    config.onProgress({
      current: i + 1,
      total,
      percentage,
      currentItem: item.external_id,
      status: "processing",
    });

    if ((i + 1) % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  config.onProgress({ current: total, total, percentage: 100, status: "completed" });
  return summarizeResults(results);
}

async function processSingleDiet(
  item: ImportDiet,
  strategy: DuplicateStrategy
): Promise<ImportItemResult> {
  const { data: existing } = await supabase
    .from("diets")
    .select("id, title")
    .eq("title", item.title)
    .eq("content_origin", "system")
    .maybeSingle();

  if (existing) {
    if (strategy === "skip") {
      return { external_id: item.external_id, status: "skipped", reason: "duplicate" };
    } else if (strategy === "error") {
      return { external_id: item.external_id, status: "error", reason: "duplicate exists" };
    }
    await updateDiet(existing.id, item);
    return { external_id: item.external_id, status: "updated" };
  } else {
    await insertDiet(item);
    return { external_id: item.external_id, status: "inserted" };
  }
}

async function insertDiet(item: ImportDiet): Promise<void> {
  const { data: diet, error } = await supabase
    .from("diets")
    .insert({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      category: item.category,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      is_active: item.is_active,
      content_origin: "system",
    })
    .select()
    .single();

  if (error) throw error;

  if (item.ingredients.length > 0) {
    const { error: ingError } = await supabase.from("diet_ingredients").insert(
      item.ingredients.map((ing, idx) => ({
        diet_id: diet.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        display_order: idx,
      }))
    );
    if (ingError) throw ingError;
  }

  if (item.preparation.length > 0) {
    const { error: prepError } = await supabase.from("diet_preparation_steps").insert(
      item.preparation.map((step) => ({
        diet_id: diet.id,
        step_order: step.order,
        description: step.description,
      }))
    );
    if (prepError) throw prepError;
  }
}

async function updateDiet(id: string, item: ImportDiet): Promise<void> {
  const { error } = await supabase
    .from("diets")
    .update({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      category: item.category,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      is_active: item.is_active,
    })
    .eq("id", id);

  if (error) throw error;

  await supabase.from("diet_ingredients").delete().eq("diet_id", id);
  await supabase.from("diet_preparation_steps").delete().eq("diet_id", id);

  if (item.ingredients.length > 0) {
    await supabase.from("diet_ingredients").insert(
      item.ingredients.map((ing, idx) => ({
        diet_id: id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        display_order: idx,
      }))
    );
  }

  if (item.preparation.length > 0) {
    await supabase.from("diet_preparation_steps").insert(
      item.preparation.map((step) => ({
        diet_id: id,
        step_order: step.order,
        description: step.description,
      }))
    );
  }
}

// ============================================
// BATCH WORKOUT IMPORTER
// ============================================
export async function importWorkoutsBatch(
  template: ImportTemplate<ImportWorkout>,
  config: BatchProcessorConfig
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];
  const items = template.items;
  const total = items.length;
  const chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;

  config.onProgress({ current: 0, total, percentage: 0, status: "processing" });

  for (let i = 0; i < total; i++) {
    if (config.signal?.aborted) {
      config.onProgress({ current: i, total, percentage: (i / total) * 100, status: "cancelled" });
      return summarizeResults(results, total - i);
    }

    const item = items[i];
    
    try {
      const result = await processSingleWorkout(item, strategy);
      results.push(result);
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const percentage = ((i + 1) / total) * 100;
    config.onProgress({
      current: i + 1,
      total,
      percentage,
      currentItem: item.external_id,
      status: "processing",
    });

    if ((i + 1) % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  config.onProgress({ current: total, total, percentage: 100, status: "completed" });
  return summarizeResults(results);
}

async function processSingleWorkout(
  item: ImportWorkout,
  strategy: DuplicateStrategy
): Promise<ImportItemResult> {
  const { data: existing } = await supabase
    .from("workouts")
    .select("id, title")
    .eq("title", item.title)
    .eq("content_origin", "system")
    .maybeSingle();

  if (existing) {
    if (strategy === "skip") {
      return { external_id: item.external_id, status: "skipped", reason: "duplicate" };
    } else if (strategy === "error") {
      return { external_id: item.external_id, status: "error", reason: "duplicate exists" };
    }
    await updateWorkout(existing.id, item);
    return { external_id: item.external_id, status: "updated" };
  } else {
    await insertWorkout(item);
    return { external_id: item.external_id, status: "inserted" };
  }
}

async function insertWorkout(item: ImportWorkout): Promise<void> {
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      category: item.category,
      is_active: item.is_active,
      content_origin: "system",
    })
    .select()
    .single();

  if (error) throw error;

  if (item.exercises.length > 0) {
    const { error: exError } = await supabase.from("workout_exercises").insert(
      item.exercises.map((ex) => ({
        workout_id: workout.id,
        name: ex.name,
        description: ex.description,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        exercise_order: ex.order,
      }))
    );
    if (exError) throw exError;
  }
}

async function updateWorkout(id: string, item: ImportWorkout): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      category: item.category,
      is_active: item.is_active,
    })
    .eq("id", id);

  if (error) throw error;

  await supabase.from("workout_exercises").delete().eq("workout_id", id);

  if (item.exercises.length > 0) {
    await supabase.from("workout_exercises").insert(
      item.exercises.map((ex) => ({
        workout_id: id,
        name: ex.name,
        description: ex.description,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        exercise_order: ex.order,
      }))
    );
  }
}

// ============================================
// HELPERS
// ============================================
function summarizeResults(results: ImportItemResult[], cancelled?: number): ImportResult {
  return {
    total_items: results.length + (cancelled || 0),
    inserted: results.filter((r) => r.status === "inserted").length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length + (cancelled || 0),
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };
}
