import { supabase } from "@/integrations/supabase/client";

export const MEDIA_PLACEHOLDER = "/placeholder.svg";

/** Anything already loadable by the browser as-is (no bucket resolution needed). */
function isDirectUrl(value?: string | null): boolean {
    return !!value && /^(https?:\/\/|data:|blob:|\/)/i.test(value);
}

type ExerciseMediaSource = {
    gifUrl?: string | null;
    imageUrl?: string | null;
    imagePath?: string | null;
};

/**
 * Every usable media URL for an exercise, in priority order.
 *
 * The grid reads `imageUrl` (already resolved by useExercises) while the detail
 * screens read `imagePath` first. Rows that carry both columns - or an
 * `image_path` pointing outside the exercises-media bucket - render in the grid
 * and break when opened. Returning the whole chain lets the UI fall back to the
 * other source instead of dropping straight to the placeholder.
 */
export function getExerciseMediaCandidates(exercise: ExerciseMediaSource): string[] {
    const candidates: string[] = [];

    const push = (url?: string | null) => {
        if (url && !candidates.includes(url)) candidates.push(url);
    };

    push(exercise.gifUrl);
    push(isDirectUrl(exercise.imageUrl) ? exercise.imageUrl : undefined);

    if (exercise.imagePath) {
        push(
            isDirectUrl(exercise.imagePath)
                ? exercise.imagePath
                : supabase.storage.from("exercises-media").getPublicUrl(exercise.imagePath).data.publicUrl
        );
    }

    return candidates;
}

/** First usable media URL, or the placeholder when the exercise has none. */
export function getExerciseMediaUrl(exercise: ExerciseMediaSource): string {
    return getExerciseMediaCandidates(exercise)[0] || MEDIA_PLACEHOLDER;
}

/** Matches video extensions even when the URL carries a query string or hash. */
export function isVideoUrl(url?: string | null): boolean {
    return !!url && /\.(mp4|mov|webm|quicktime|m4v)(\?|#|$)/i.test(url);
}
