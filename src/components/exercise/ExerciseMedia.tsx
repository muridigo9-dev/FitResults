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
        /**
         * A <video> that is not autoplaying paints nothing until a frame has
         * been decoded, and `preload` defaults to metadata only - so every
         * card in the exercise grid came out blank once the GIFs were replaced
         * by MP4s.
         *
         * The `#t=0.1` media fragment asks the browser to seek to that moment
         * and render it, which costs a ranged request instead of pulling the
         * whole 2 MB clip. Autoplaying instances keep the untouched URL so
         * playback and looping start where the clip does. The fragment is only
         * appended when the URL has no hash of its own.
         */
        const shouldSeek = !isActive && !src.includes("#");
        const videoSrc = shouldSeek ? `${src}#t=0.1` : src;

        return (
            <video
                key={videoSrc}
                src={videoSrc}
                className={className}
                autoPlay={isActive}
                loop
                muted
                playsInline
                preload="metadata"
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
