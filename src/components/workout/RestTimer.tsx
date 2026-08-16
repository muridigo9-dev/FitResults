import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playCompletionSound, playTickSound } from "@/lib/timerSounds";
import { useI18n } from "@/hooks/useI18n";

interface RestTimerProps {
  initialSeconds: number;
  totalSeconds?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  onAdjustTime?: (delta: number) => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onReset?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RestTimer({
  initialSeconds,
  totalSeconds,
  onComplete,
  onSkip,
  onAdjustTime,
  isPaused,
  onTogglePause,
  onReset,
  autoStart = true,
  showControls = true,
  size = "md",
  className,
}: RestTimerProps) {
    const { t } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isMuted, setIsMuted] = useState(false);

  // Sync with parent state
  useEffect(() => {
    setTimeRemaining(initialSeconds);
  }, [initialSeconds]);

  // Sync running state from parent
  useEffect(() => {
    if (isPaused !== undefined) {
      setIsRunning(!isPaused);
    }
  }, [isPaused]);

  // Timer logic
  useEffect(() => {
    // If parent driven loop exists (onAdjustTime provided usually implies parent control context), 
    // we assume parent handles "ticking" of initialSeconds.
    if (onAdjustTime && initialSeconds !== undefined) {
      return;
    }

    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Play completion sound
            if (!isMuted) {
              playCompletionSound();
            }
            onComplete?.();
            return 0;
          }
          if (prev <= 4 && prev > 1 && !isMuted) {
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining, isMuted, onComplete, initialSeconds, onAdjustTime]);


  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress
  // Use totalSeconds if provided, otherwise fallback to initialSeconds (which might be updating if parent-driven, so this fallback is only good for local timer)
  const maxSeconds = totalSeconds || initialSeconds;
  // If maxSeconds is 0 or same as timeRemaining (when only current is passed), try to avoid 0 div?
  // Actually if totalSeconds is passed, it should be stable.
  const progress = maxSeconds > 0 ? ((maxSeconds - timeRemaining) / maxSeconds) * 100 : 0;

  // Size classes
  const sizeClasses = {
    sm: {
      container: "w-24 h-24",
      text: "text-xl",
      ring: "stroke-[6]",
      buttons: "h-7 w-7",
    },
    md: {
      container: "w-36 h-36",
      text: "text-3xl",
      ring: "stroke-[8]",
      buttons: "h-9 w-9",
    },
    lg: {
      container: "w-48 h-48",
      text: "text-5xl",
      ring: "stroke-[10]",
      buttons: "h-10 w-10",
    },
  };

  const classes = sizeClasses[size];

  // Adjust time
  const adjustTime = (delta: number) => {
    if (onAdjustTime) {
      onAdjustTime(delta);
    } else {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev + delta);
        if (newTime <= 0) {
          onComplete?.();
          setIsRunning(false);
        }
        return newTime;
      });
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Timer Circle */}
      <div className={cn("relative", classes.container)}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            className={cn(
              "transition-all duration-200",
              timeRemaining <= 3 ? "text-red-500" : "text-primary"
            )}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono font-bold tabular-nums",
              classes.text,
              timeRemaining <= 3 && timeRemaining > 0 && "text-red-500 animate-pulse"
            )}
          >
            {formatTime(timeRemaining)}
          </span>
          {timeRemaining === 0 && (
            <span className="text-xs text-green-500 font-medium animate-bounce">
              Pronto!
            </span>
          )}
        </div>

        {/* Pulse animation when almost done */}
        {timeRemaining <= 3 && timeRemaining > 0 && (
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-30" />
        )}
      </div>

      {/* Close Button when Done */}
      {timeRemaining === 0 && (
        <Button
          className="mt-2 w-full animate-in zoom-in"
          onClick={onComplete}
        >
          {t("execution.letsGo")}
        </Button>
      )}

      {/* Controls */}
      {showControls && timeRemaining > 0 && (
        <div className="flex items-center gap-2">
          {/* Decrease time */}
          <Button
            variant="ghost"
            size="icon"
            className={classes.buttons}
            onClick={() => adjustTime(-15)}
            disabled={timeRemaining <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant={isRunning ? "secondary" : "default"}
            size="icon"
            className={cn(classes.buttons, "rounded-full")}
            onClick={() => {
              if (onTogglePause) {
                onTogglePause();
              } else {
                setIsRunning(!isRunning);
              }
            }}
            disabled={timeRemaining <= 0}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className={classes.buttons}
            onClick={() => {
              if (onReset) {
                onReset();
              } else {
                setTimeRemaining(initialSeconds);
                setIsRunning(false);
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Increase time */}
          <Button
            variant="ghost"
            size="icon"
            className={classes.buttons}
            onClick={() => adjustTime(15)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className={classes.buttons}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Skip button */}
      {onSkip && timeRemaining > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Pular descanso
        </Button>
      )}
    </div>
  );
}

// ============================================
// INLINE REST TIMER (Compact)
// ============================================

interface InlineRestTimerProps {
  seconds: number;
  isActive: boolean;
  onComplete?: () => void;
  className?: string;
}

export function InlineRestTimer({
  seconds,
  isActive,
  onComplete,
  className,
}: InlineRestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(seconds);

  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(seconds);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, seconds, onComplete]);

  const progress = ((seconds - timeRemaining) / seconds) * 100;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  if (!isActive) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10",
        className
      )}
    >
      {/* Mini progress ring */}
      <div className="relative w-6 h-6">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="3"
          />
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            stroke="currentColor"
            className={cn(
              timeRemaining <= 3 ? "text-red-500" : "text-primary"
            )}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40} ${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
          />
        </svg>
      </div>

      <span
        className={cn(
          "text-sm font-mono font-medium",
          timeRemaining <= 3 && "text-red-500"
        )}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}

// ============================================
// REST TIMER MODAL
// ============================================

interface RestTimerModalProps {
  isOpen: boolean;
  seconds: number;
  totalSeconds?: number;
  isPaused: boolean;
  onTogglePause: () => void;
  exerciseName?: string;
  nextExerciseName?: string;
  onComplete: () => void;
  onSkip: () => void;
  onAdjustTime?: (delta: number) => void;
  onReset?: () => void;
}

export function RestTimerModal({
  isOpen,
  seconds,
  totalSeconds,
  isPaused,
  onTogglePause,
  exerciseName,
  nextExerciseName,
  onComplete,
  onSkip,
  onAdjustTime,
  onReset,
}: RestTimerModalProps) {
    const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Header */}
        <div className="text-center relative w-full">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 text-muted-foreground"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-muted-foreground">
            Descanso
          </h3>
          {exerciseName && (
            <p className="text-sm text-muted-foreground/70">
              {t("execution.after")}: {exerciseName}
            </p>
          )}
        </div>

        {/* Timer */}
        <RestTimer
          initialSeconds={seconds}
          totalSeconds={totalSeconds}
          onComplete={onComplete}
          onSkip={onSkip}
          onAdjustTime={onAdjustTime}
          isPaused={isPaused}
          onTogglePause={onTogglePause}
          onReset={onReset}
          size="lg"
          autoStart
        />

        {/* Next exercise preview */}
        {nextExerciseName && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("execution.nextExercise")}
            </p>
            <p className="text-lg font-semibold">{nextExerciseName}</p>
          </div>
        )}
      </div>
    </div>
  );
}
