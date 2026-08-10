// ============================================
// BULK IMPORTERS
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ImportTemplate,
  ImportChallenge,
  ImportDiet,
  ImportWorkout,
  ImportResult,
  ImportItemResult,
} from "./types";

// ============================================
// CHALLENGE IMPORTER
// ============================================
export async function importChallenges(
  template: ImportTemplate<ImportChallenge>
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];

  for (const item of template.items) {
    try {
      // Check for existing by external_id (stored as metadata) or name
      const { data: existing } = await supabase
        .from("challenges")
        .select("id, name")
        .eq("name", item.name)
        .maybeSingle();

      if (existing) {
        if (strategy === "skip") {
          results.push({ external_id: item.external_id, status: "skipped", reason: "duplicate" });
          continue;
        } else if (strategy === "error") {
          results.push({ external_id: item.external_id, status: "error", reason: "duplicate exists" });
          continue;
        }
        // strategy === "update"
        await updateChallenge(existing.id, item);
        results.push({ external_id: item.external_id, status: "updated" });
      } else {
        await insertChallenge(item);
        results.push({ external_id: item.external_id, status: "inserted" });
      }
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summarizeResults(results);
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
  // Build update payload with optional image fields
  const payload: Record<string, unknown> = {
    name: item.name,
    description: item.description,
    total_days: item.total_days,
    is_active: item.is_active,
  };

  // Add image fields if provided
  if (item.image_url !== undefined) payload.image_url = item.image_url || null;
  if (item.image_path !== undefined) payload.image_path = item.image_path || null;

  const { error } = await supabase
    .from("challenges")
    .update(payload)
    .eq("id", id);

  if (error) throw error;

  // Delete existing days and tasks
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

  // Insert new days and tasks
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
// DIET IMPORTER
// ============================================
// ============================================
// DIET IMPORTER (Now uses 'import_dishes' RPC)
// ============================================
export async function importDiets(
  template: ImportTemplate<ImportDiet>
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";

  // Map to RPC format
  const rpcItems = template.items.map(item => ({
    name: item.title,
    description: item.description,
    image_url: item.image_url,
    category: item.category,
    // Note: calories/macros are calculated from ingredients in the new system, 
    // but the RPC might not take them directly unless we added overrides.
    // The current RPC import_dishes does NOT take calories/macros params. 
    // It relies on ingredients. Use ingredients!
    ingredients: item.ingredients.map(ing => ({
      name: ing.name,
      quantity: parseFloat(ing.quantity) || 0,
      metric_unit: ing.unit
    })),
    preparation_steps: item.preparation.map(step => ({
      order: step.order,
      description: step.description
    }))
  }));

  try {
    const { data, error } = await (supabase.rpc as any)("import_dishes", {
      p_json: { data: rpcItems },
      p_dry_run: false
    });

    if (error) throw error;

    const result = data as any; // { success, imported, skipped, errors, logs }

    // Reconstruct ImportResult approx
    const results: ImportItemResult[] = [];

    // We can't easily map back 1-to-1 to external_ids without complex logic,
    // so we will mark all as "inserted" or "skipped" based on counts?
    // Or we iterate and fake it.
    // Ideally we want detailed feedback.

    // Fallback: If we want per-item status, we might have to call RPC one by one
    // OR just return the summary. 
    // The Importer UI likely expects specific result array length matching items.

    // Let's iterate and assume RPC processed in order? Not guaranteed if parallel not used (RPC is sequential loop).
    // RPC is sequential.

    // Actually, for immediate fix, let's just return a summary based on RPC output.
    // But to match the interface, let's create a generic "batch" result or map by name.

    const errorsMap = new Map(result.errors.map((e: any) => [e.name, e.error]));
    // skipped logs format: "Prato pulado (Duplicado): Name"
    const skippedNames = new Set(result.logs
      .filter((l: string) => l.includes("Prato pulado"))
      .map((l: string) => l.split(": ")[1]?.trim())
    );

    template.items.forEach(item => {
      if (errorsMap.has(item.title)) {
        results.push({ external_id: item.external_id, status: "error", reason: errorsMap.get(item.title) as string });
      } else if (skippedNames.has(item.title)) {
        results.push({ external_id: item.external_id, status: "skipped", reason: "duplicate" });
      } else {
        results.push({ external_id: item.external_id, status: "inserted" });
      }
    });

    return summarizeResults(results);

  } catch (err: any) {
    return {
      total_items: template.items.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: template.items.length,
      details: template.items.map(i => ({ external_id: i.external_id, status: "error", reason: err.message }))
    };
  }
}

// Helper functions insertDiet and updateDiet are removed as they are replaced by RPC

// ============================================
// WORKOUT IMPORTER
// ============================================
export async function importWorkouts(
  template: ImportTemplate<ImportWorkout>
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];

  for (const item of template.items) {
    try {
      const { data: existing } = await supabase
        .from("workouts")
        .select("id, title")
        .eq("title", item.title)
        .eq("content_origin", "system")
        .maybeSingle();

      if (existing) {
        if (strategy === "skip") {
          results.push({ external_id: item.external_id, status: "skipped", reason: "duplicate" });
          continue;
        } else if (strategy === "error") {
          results.push({ external_id: item.external_id, status: "error", reason: "duplicate exists" });
          continue;
        }
        await updateWorkout(existing.id, item);
        results.push({ external_id: item.external_id, status: "updated" });
      } else {
        await insertWorkout(item);
        results.push({ external_id: item.external_id, status: "inserted" });
      }
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summarizeResults(results);
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
      content_origin: "system" as const,
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
function summarizeResults(results: ImportItemResult[]): ImportResult {
  return {
    total_items: results.length,
    inserted: results.filter((r) => r.status === "inserted").length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };
}
