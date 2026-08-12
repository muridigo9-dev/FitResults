import { ReactNode, useEffect, useMemo, useState } from "react";
import { getExerciseMediaCandidates, isVideoUrl, MEDIA_PLACEHOLDER } from "@/lib/exerciseMedia";

interface ExerciseMediaProps {
    exercise: {
        name?: string;
        gifUrl?: string | null;
        imageUrl?: string | null;
        imagePath?: string | null;
    };
    className?: string;
    /** Autoplays when the media is a video (cards and thumbnails keep it off). */
    isActive?: boolean;
    loading?: "lazy" | "eager";
    /** Rendered when the exercise has no media, or every candidate failed. */
    fallback?: ReactNode;
}

/**
 * Renders exercise media (gif, image or video) trying every known source before
 * giving up, so a stale image_path/image_url pair does not blank out the media.
 */
export function ExerciseMedia({
    exercise,
    className,
    isActive = false,
    loading = "lazy",
    fallback,
}: ExerciseMediaProps) {
    const { name, gifUrl, imageUrl, imagePath } = exercise;

    const candidates = useMemo(
        () => getExerciseMediaCandidates({ gifUrl, imageUrl, imagePath }),
        [gifUrl, imageUrl, imagePath]
    );
    const candidatesKey = candidates.join("|");

    const [index, setIndex] = useState(0);

    // Restart the chain whenever the exercise (and so its sources) changes
    useEffect(() => {
        setIndex(0);
    }, [candidatesKey]);

    const src = candidates[index];

    if (!src) {
        return <>{fallback ?? <img src={MEDIA_PLACEHOLDER} alt="" className={className} />}</>;
    }

    const handleError = () => setIndex(prev => prev + 1);

    if (isVideoUrl(src)) {
        return (
            <video
                key={src}
                src={src}
                className={className}
                autoPlay={isActive}
                loop
                muted
                playsInline
                onError={handleError}
            />
        );
    }

    return (
        <img
            key={src}
            src={src}
            alt={name || ""}
            className={className}
            loading={loading}
            onError={handleError}
        />
    );
}
