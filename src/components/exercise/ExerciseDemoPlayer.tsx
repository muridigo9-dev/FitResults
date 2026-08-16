import { useRef, useState } from "react";
import { Maximize2, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseMedia } from "./ExerciseMedia";
import { hasExerciseVideo } from "@/lib/exerciseMedia";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface ExerciseDemoPlayerProps {
    exercise: {
        name?: string;
        gifUrl?: string | null;
        imageUrl?: string | null;
        imagePath?: string | null;
        videoUrl?: string | null;
    };
    /**
     * True for the exercise the student is actually on. Only that clip is worth
     * streaming in full and looping; the rest stay on metadata.
     */
    isActive?: boolean;
    className?: string;
}

/**
 * The looping demonstration that sits at the top of the exercise a student is
 * performing.
 *
 * It exists because the clip used to be hidden behind "Ver instruções" and,
 * once opened, played through once and stopped - useless for copying a
 * movement. Here it runs on repeat, unattended, with no chrome in the way:
 * muted autoplay is the only kind browsers grant, and the two buttons cover the
 * cases where the student wants sound or a bigger picture.
 */
export function ExerciseDemoPlayer({ exercise, isActive = true, className }: ExerciseDemoPlayerProps) {
    const { t } = useI18n();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const hasVideo = hasExerciseVideo(exercise);

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    const expand = () => {
        const video = videoRef.current as
            | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
            | null;
        if (!video) return;

        // iOS Safari never implemented the Fullscreen API on arbitrary
        // elements; the video element carries its own entry point instead.
        if (video.requestFullscreen) {
            void video.requestFullscreen().catch(() => undefined);
        } else {
            video.webkitEnterFullscreen?.();
        }
    };

    return (
        <div
            className={cn(
                "relative w-fit max-w-full mx-auto rounded-lg overflow-hidden bg-muted shadow-sm border flex items-center justify-center",
                className
            )}
        >
            <ExerciseMedia
                exercise={exercise}
                mediaRef={videoRef}
                autoPlay
                loop
                muted={isMuted}
                preload={isActive ? "auto" : "metadata"}
                loading="eager"
                className="max-h-[42vh] w-auto max-w-full object-contain bg-background"
                fallback={
                    <div className="min-w-[220px] min-h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center">
                        <VideoOff className="h-7 w-7 opacity-40" />
                        <p className="text-xs">{t("workouts.noVideo")}</p>
                    </div>
                }
            />

            {hasVideo && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90"
                        onClick={toggleMute}
                        aria-label={isMuted ? t("execution.demoUnmute") : t("execution.demoMute")}
                    >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90"
                        onClick={expand}
                        aria-label={t("execution.demoFullscreen")}
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
