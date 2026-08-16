import { useState, useEffect, useRef } from "react";
import { Check, Plus, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { playCompletionSound, playTickSound, vibrate } from "@/lib/timerSounds";
import type { SessionSet } from "@/types/workout";

/** Used when a timed exercise reaches the tracker without a duration of its own. */
const FALLBACK_DURATION_SECONDS = 30;

// Interface for SetTracker props

interface SetTrackerProps {
  sets: SessionSet[];
  plannedSets: number;
  plannedReps: string;
  plannedRepsList?: (number | string)[];
  /**
   * The hold prescribed by the workout, in seconds. Separate from
   * `plannedReps` on purpose: a Tai Chi row carries `reps = NULL` and
   * `duration_seconds = 120`, and reading the target off the reps field is
   * what used to show "12" under a 120s posture.
   */
  plannedDurationSeconds?: number;
  defaultWeight?: number;
  defaultRestSeconds?: number;
  executionType?: 'reps' | 'time';
  /** Off for exercises where a load makes no sense, such as a timed hold. */
  showWeight?: boolean;
  onCompleteSet: (setData: {
    setNumber: number;
    actualReps?: number;
    actualWeightKg?: number;
    rpe?: number;
  }) => void;
  onStartRest?: (seconds: number) => void;
  suggestedValues?: {
    weight?: number;
    reps?: number;
  } | null;
  lastSessionSets?: { actualWeightKg?: number; actualReps?: number; setNumber: number }[];
  className?: string;
}

export function SetTracker({
  sets,
  plannedSets,
  plannedReps,
  plannedRepsList,
  plannedDurationSeconds,
  defaultWeight = 0,
  defaultRestSeconds = 60,
  executionType = 'reps',
  showWeight = true,
  onCompleteSet,
  onStartRest,
  suggestedValues,
  lastSessionSets,
  className,
}: SetTrackerProps) {
  // Generate rows: existing sets + potential empty sets up to plannedSets
  const rows = Array.from({ length: Math.max(sets.length, plannedSets) }).map((_, i) => {
    const setNumber = i + 1;
    const existingSet = sets.find(s => s.setNumber === setNumber);
    return {
      setNumber,
      existingSet,
      isCompleted: existingSet?.isCompleted || false
    };
  });

  const columns = showWeight
    ? "grid-cols-[auto_1fr_1fr_auto]"
    : "grid-cols-[auto_1fr_auto]";

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "grid gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center",
        columns
      )}>
        <div className="w-8">#</div>
        {showWeight && <div>Kg</div>}
        <div>{executionType === 'time' ? 'Tempo (s)' : 'Reps'}</div>
        <div className="w-10">Ok</div>
      </div>

      {rows.map((row, i) => (
        <SetRow
          key={row.setNumber}
          setNumber={row.setNumber}
          existingSet={row.existingSet}
          plannedReps={plannedRepsList?.[i] ? plannedRepsList[i].toString() : plannedReps}
          plannedDurationSeconds={plannedDurationSeconds}
          defaultWeight={defaultWeight}
          executionType={executionType}
          showWeight={showWeight}
          columns={columns}
          suggestedValues={suggestedValues}
          lastSet={lastSessionSets?.find(s => s.setNumber === row.setNumber)}
          onComplete={(data) => {
            onCompleteSet({ ...data, setNumber: row.setNumber });
            // If passing 'onStartRest', we might want to check if it's not the last set
            if (onStartRest && row.setNumber < plannedSets) {
              // Only start rest if completing a NEW set, not editing
              if (!row.existingSet?.isCompleted) {
                onStartRest(defaultRestSeconds);
              }
            }
          }}
        />
      ))}
    </div>
  );
}

function SetRow({
  setNumber,
  existingSet,
  plannedReps,
  plannedDurationSeconds,
  defaultWeight,
  executionType,
  showWeight,
  columns,
  suggestedValues,
  lastSet,
  onComplete
}: {
  setNumber: number;
  existingSet?: SessionSet;
  plannedReps: string;
  plannedDurationSeconds?: number;
  defaultWeight: number;
  executionType: 'reps' | 'time';
  showWeight: boolean;
  columns: string;
  suggestedValues?: { weight?: number; reps?: number } | null;
  lastSet?: { actualWeightKg?: number; actualReps?: number };
  onComplete: (data: { actualReps: number; actualWeightKg: number }) => void;
}) {
  const isTimed = executionType === 'time';

  // A timed set takes its target from the workout's own duration. Parsing it
  // out of `plannedReps` is what produced a 12 second Tai Chi posture, since
  // the library default for reps is the string "12".
  const targetSeconds = plannedDurationSeconds && plannedDurationSeconds > 0
    ? plannedDurationSeconds
    : FALLBACK_DURATION_SECONDS;

  // Parse planned reps to get a number (e.g. "12-15" -> 12)
  const targetValue = isTimed ? targetSeconds : parseInt(plannedReps) || 12;

  const [weight, setWeight] = useState<string>(
    existingSet?.actualWeightKg?.toString() || (defaultWeight > 0 ? defaultWeight.toString() : "")
  );
  const [value, setValue] = useState<string>(
    existingSet?.actualReps?.toString() || targetValue.toString()
  );

  const isCompleted = existingSet?.isCompleted;

  // Countdown state for 'time' execution. It runs *down* from the prescribed
  // hold rather than up from zero: someone holding a 120s posture should be
  // told when it is over, not asked to time themselves.
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(targetSeconds);

  // React to suggested values
  useEffect(() => {
    if (suggestedValues && !isCompleted) {
      if (suggestedValues.weight !== undefined) setWeight(suggestedValues.weight.toString());
      if (suggestedValues.reps !== undefined && executionType !== 'time') setValue(suggestedValues.reps.toString());
    }
  }, [suggestedValues, isCompleted, executionType]);

  // Keep the countdown in step with the plan while it is not running
  useEffect(() => {
    if (!isRunning) setRemaining(targetSeconds);
  }, [targetSeconds, isRunning]);

  // Tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // The finishing move is kept on a ref so the effect below can depend only on
  // the clock, and not re-fire every time a parent re-renders.
  const finishRef = useRef<(seconds: number) => void>(() => undefined);
  finishRef.current = (seconds: number) => {
    setValue(seconds.toString());
    onComplete({ actualWeightKg: parseFloat(weight) || 0, actualReps: seconds });
  };

  // React to the clock outside the state updater, so React stays free to
  // re-run it without double-firing the sound or logging the set twice.
  useEffect(() => {
    if (!isRunning) return;

    if (remaining === 0) {
      setIsRunning(false);
      playCompletionSound();
      vibrate([200, 100, 200]);
      finishRef.current(targetSeconds);
      return;
    }

    if (remaining <= 3) playTickSound();
  }, [isRunning, remaining, targetSeconds]);

  const startTimer = () => {
    setRemaining(targetSeconds);
    setIsRunning(true);
  };

  /** Stops without logging, leaving the elapsed time for the reader to confirm. */
  const stopTimer = () => {
    setValue(Math.max(0, targetSeconds - remaining).toString());
    setIsRunning(false);
    setRemaining(targetSeconds);
  };

  const handleCheck = () => {
    // Tapping the check mid-countdown means "I stopped here" - log what was
    // actually held rather than the target.
    const logged = isRunning
      ? Math.max(0, targetSeconds - remaining)
      : parseFloat(value) || 0;

    if (isRunning) {
      setIsRunning(false);
      setRemaining(targetSeconds);
      setValue(logged.toString());
    }

    onComplete({ actualWeightKg: parseFloat(weight) || 0, actualReps: logged });
  };

  return (
    <div className="mb-2">
      <div className={cn(
        "grid gap-3 items-center",
        columns,
        isCompleted ? "opacity-50" : "opacity-100"
      )}>
        {/* Set Number */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold">
          {setNumber}
        </div>

        {/* Weight Input */}
        {showWeight && (
          <Input
            type="number"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-center h-10 font-bold bg-muted/30"
            disabled={!!isCompleted}
          />
        )}

        {/* Reps/Time Input with Timer Toggle */}
        <div className="relative">
          <Input
            type="number"
            placeholder={isTimed ? "seg" : "reps"}
            value={isRunning ? remaining : value}
            onChange={(e) => !isRunning && setValue(e.target.value)}
            className={cn(
              "text-center h-10 font-bold bg-muted/30",
              isRunning && "text-primary border-primary bg-primary/10",
              isRunning && remaining <= 3 && "text-red-500 border-red-500 bg-red-500/10 animate-pulse"
            )}
            disabled={!!isCompleted || isRunning}
          />

          {/* Play Button for Time execution */}
          {isTimed && !isCompleted && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "absolute right-0 top-0 h-10 w-8 text-muted-foreground hover:text-primary",
                isRunning && "text-red-500 hover:text-red-600"
              )}
              onClick={isRunning ? stopTimer : startTimer}
            >
              {isRunning ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>
          )}
        </div>

        {/* Check Button */}
        <Button
          size="icon"
          variant={isCompleted ? "default" : "outline"}
          className={cn(
            "w-10 h-10 rounded-full transition-all",
            isCompleted ? "bg-green-500 hover:bg-green-600 border-green-500" : "border-muted-foreground/30 hover:border-primary"
          )}
          onClick={() => {
            if (!isCompleted) {
              handleCheck();
            }
          }}
        >
          <Check className={cn("w-5 h-5", isCompleted ? "text-white" : "text-muted-foreground")} />
        </Button>
      </div>

      {/* History Last Log Display */}
      {lastSet && !isCompleted && (
        <div className={cn("grid gap-3 px-1 mt-1 text-[10px] text-muted-foreground/70", columns)}>
          <div className="w-8"></div>
          {showWeight && <div className="text-center">Ant: {lastSet.actualWeightKg}</div>}
          <div className="text-center">{lastSet.actualReps}</div>
          <div className="w-10"></div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPACT SET TRACKER (For list view)
// ============================================

interface CompactSetTrackerProps {
  completedSets: number;
  totalSets: number;
  onAddSet?: () => void;
  className?: string;
}

export function CompactSetTracker({
  completedSets,
  totalSets,
  onAddSet,
  className,
}: CompactSetTrackerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        {Array.from({ length: totalSets }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              index < completedSets
                ? "bg-green-500"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      <span className="text-sm font-medium">
        {completedSets}/{totalSets}
      </span>

      {onAddSet && completedSets < totalSets && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAddSet}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
