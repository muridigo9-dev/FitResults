import { ReactNode, Ref, useEffect, useMemo, useState } from "react";
import { getExerciseMediaCandidates, isVideoUrl, MEDIA_PLACEHOLDER } from "@/lib/exerciseMedia";

interface ExerciseMediaProps {
    exercise: {
        name?: string;
        gifUrl?: string | null;
        imageUrl?: string | null;
        imagePath?: string | null;
        videoUrl?: string | null;
    };
    className?: string;
    /** Autoplays when the media is a video (cards and thumbnails keep it off). */
    isActive?: boolean;
    loading?: "lazy" | "eager";
    /** Rendered when the exercise has no media, or every candidate failed. */
    fallback?: ReactNode;
    /**
     * Gives a video clip its native player chrome, for the places where the
     * point is to *watch* it (the instructions panel) rather than to show a
     * looping preview. On its own it implies no autoplay and no loop, so the
     * clip does not restart under the reader.
     */
    controls?: boolean;
    /**
     * Playback overrides.
     *
     * The `isActive`/`controls` pair covers two of the three combinations we
     * need: a silent looping preview in the grid, and a clip you press play on
     * in the instructions panel. The demonstration player wants the third -
     * autoplay *and* loop *and* a way to reach the clip - which the defaults
     * cannot express, so each flag can be set outright.
     */
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    /**
     * Videos here average 2 MB, so only the clip the student is actually on is
     * worth fetching in full. Everything else stays on metadata.
     */
    preload?: "none" | "metadata" | "auto";
    /** Handle on the underlying <video>, for mute and fullscreen controls. */
    mediaRef?: Ref<HTMLVideoElement>;
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
    controls = false,
    autoPlay,
    loop,
    muted,
    preload = "metadata",
    mediaRef,
}: ExerciseMediaProps) {
    const { name, gifUrl, imageUrl, imagePath, videoUrl } = exercise;

    const candidates = useMemo(
        () => getExerciseMediaCandidates({ gifUrl, imageUrl, imagePath, videoUrl }),
        [gifUrl, imageUrl, imagePath, videoUrl]
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
        const shouldAutoPlay = autoPlay ?? (isActive && !controls);
        const shouldLoop = loop ?? !controls;
        // Browsers only grant autoplay to muted video, so an autoplaying clip
        // always starts muted whatever the caller asked for. Unmuting later is
        // a user gesture, which they do allow.
        const shouldMute = muted ?? (shouldAutoPlay || !controls);

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
        // Applies to the controls case too: without it the panel shows a black
        // rectangle until the reader presses play. 0.1s in is imperceptible as
        // a starting point and the scrubber still reaches the whole clip.
        const shouldSeek = !shouldAutoPlay && !src.includes("#");
        const videoSrc = shouldSeek ? `${src}#t=0.1` : src;

        return (
            <video
                key={videoSrc}
                ref={mediaRef}
                src={videoSrc}
                className={className}
                controls={controls}
                autoPlay={shouldAutoPlay}
                loop={shouldLoop}
                muted={shouldMute}
                playsInline
                preload={preload}
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
