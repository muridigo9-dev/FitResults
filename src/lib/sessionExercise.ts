/**
 * Mapping for the exercise attached to a running workout session.
 *
 * `useWorkoutSession` selects `exercise:exercises(*)`, which comes back in the
 * database's snake_case. Every other field on the session is mapped to the
 * camelCase the components read, but the exercise used to be spread through
 * untouched - so `imagePath`, `videoUrl`, `defaultSets` and friends were all
 * undefined during a workout. That is why the instructions panel showed the
 * text but never the clip, and why the set tracker fell back to "12 reps"
 * instead of the workout's own plan.
 */

import { supabase } from "@/integrations/supabase/client";
import { localizedField } from "@/lib/contentI18n";
import type { Exercise } from "@/types/content";

type Row = Record<string, any>;

/**
 * The per-workout plan captured on `session_exercises.metadata` when the
 * session started. It is the authority for sets/reps/duration: the same
 * movement can be three sets of twelve in one workout and a 40s hold in
 * another, so the exercise library's defaults are only a fallback.
 */
export interface PlanSnapshot {
    sets?: number | null;
    reps?: string | number | null;
    reps_list?: (number | string)[] | null;
    reps_mode?: "fixed" | "variable" | null;
    rest_seconds?: number | null;
    execution_type?: "reps" | "time" | null;
    duration_seconds?: number | null;
    superset_id?: string | null;
}

/** Reads the plan snapshot off a session_exercises row, if it has one. */
export function readPlanSnapshot(metadata: unknown): PlanSnapshot {
    if (!metadata || typeof metadata !== "object") return {};
    const snapshot = (metadata as Record<string, unknown>).snapshot;
    if (!snapshot || typeof snapshot !== "object") return {};
    return snapshot as PlanSnapshot;
}

/** Storage path -> public URL, matching how useExercises resolves media. */
function resolveImageUrl(row: Row): string | undefined {
    if (row.image_url) return row.image_url;
    if (!row.image_path) return undefined;
    return supabase.storage.from("exercises-media").getPublicUrl(row.image_path).data.publicUrl;
}

/**
 * Builds the `Exercise` a session card renders: the library row in camelCase,
 * localised, with the workout's own plan laid over the library defaults.
 */
export function mapSessionExercise(
    row: Row | null | undefined,
    metadata: unknown,
    language: string | undefined | null,
): Exercise | undefined {
    if (!row) return undefined;

    const plan = readPlanSnapshot(metadata);

    const executionType = plan.execution_type ?? row.execution_type ?? "reps";
    const sets = plan.sets ?? row.default_sets ?? 3;
    const reps = plan.reps ?? row.default_reps ?? "12";
    const restSeconds = plan.rest_seconds ?? row.default_rest_seconds ?? 60;

    return {
        ...row,

        id: row.id,
        slug: row.slug,
        name: localizedField(row, "name", language),
        description: localizedField(row, "description", language),
        instructions: localizedField(row, "instructions", language),

        // Media - the reason the instructions panel came up empty
        imageUrl: resolveImageUrl(row),
        imagePath: row.image_path ?? undefined,
        gifUrl: row.gif_url ?? undefined,
        videoUrl: row.video_url ?? undefined,
        thumbnailUrl: row.thumbnail_url ?? undefined,

        equipment: row.equipment || "none",
        difficulty: row.difficulty || "intermediate",
        isCompound: row.is_compound ?? false,
        primaryMuscleGroupId: row.primary_muscle_group_id ?? undefined,
        tags: row.tags || [],

        // The workout's plan, with the library defaults behind it
        executionType: executionType as Exercise["executionType"],
        repsMode: (plan.reps_mode ?? row.reps_mode ?? "fixed") as Exercise["repsMode"],
        repsList: plan.reps_list ?? row.reps_list ?? undefined,
        durationSeconds: plan.duration_seconds ?? row.duration_seconds ?? undefined,
        supersetId: plan.superset_id ?? undefined,

        sets,
        reps,
        restSeconds,
        defaultSets: sets,
        defaultReps: String(reps ?? ""),
        defaultRestSeconds: restSeconds,

        order: row.exercise_order ?? 0,
    } as Exercise;
}
