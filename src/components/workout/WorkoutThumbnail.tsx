import { Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { cn } from "@/lib/utils";

interface ThumbnailExercise {
    name?: string;
    imageUrl?: string | null;
    imagePath?: string | null;
    gifUrl?: string | null;
    videoUrl?: string | null;
}

interface ThumbnailWorkout {
    title?: string;
    imageUrl?: string | null;
    imagePath?: string | null;
    exercises?: ThumbnailExercise[];
}

interface WorkoutThumbnailProps {
    workout: ThumbnailWorkout;
    className?: string;
    /** Autoplays when the chosen media is a clip. Lists keep it off. */
    isActive?: boolean;
}

/**
 * The workout's own cover, or undefined when it has none.
 *
 * Deliberately not `resolveImageUrl`, which answers "/placeholder.svg" for a
 * workout with no cover - that placeholder is exactly what we want to replace,
 * so we need to be able to tell "no cover" apart from "this cover".
 */
function workoutCoverUrl(workout: ThumbnailWorkout): string | undefined {
    if (workout.imagePath) {
        return supabase.storage.from("workouts-media").getPublicUrl(workout.imagePath).data.publicUrl;
    }
    if (workout.imageUrl && /^(https?:\/\/|data:|blob:|\/)/i.test(workout.imageUrl)) {
        return workout.imageUrl;
    }
    return undefined;
}

/** First exercise that actually carries media, so an empty one is skipped. */
function firstExerciseWithMedia(workout: ThumbnailWorkout): ThumbnailExercise | undefined {
    return workout.exercises?.find(
        (ex) => ex.imageUrl || ex.imagePath || ex.gifUrl || ex.videoUrl
    );
}

function ThumbnailFallback({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted",
                className
            )}
        >
            <Dumbbell className="h-7 w-7 text-primary/40" />
        </div>
    );
}

/**
 * Cover art for a workout card.
 *
 * Almost no workout carries a cover of its own, so the cards were a wall of
 * identical grey placeholders. Falling back to the first exercise's media gives
 * each card a picture of the movement it actually starts with - and since the
 * demonstrations are clips, ExerciseMedia renders a still frame from them
 * rather than a blank video element.
 */
export function WorkoutThumbnail({ workout, className, isActive = false }: WorkoutThumbnailProps) {
    const cover = workoutCoverUrl(workout);
    const source: ThumbnailExercise | undefined = cover
        ? { imageUrl: cover, name: workout.title }
        : firstExerciseWithMedia(workout);

    if (!source) return <ThumbnailFallback className={className} />;

    return (
        <ExerciseMedia
            exercise={{ ...source, name: source.name || workout.title }}
            isActive={isActive}
            className={cn("w-full h-full object-cover", className)}
            fallback={<ThumbnailFallback className={className} />}
        />
    );
}
