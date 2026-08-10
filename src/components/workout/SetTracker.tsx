import { useState, useEffect, useRef } from "react";
import { Check, Plus, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SessionSet } from "@/types/workout";

// Interface for SetTracker props

interface SetTrackerProps {
  sets: SessionSet[];
  plannedSets: number;
  plannedReps: string;
  plannedRepsList?: (number | string)[];
  defaultWeight?: number;
  defaultRestSeconds?: number;
  executionType?: 'reps' | 'time';
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
  defaultWeight = 0,
  defaultRestSeconds = 60,
  executionType = 'reps',
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

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
        <div className="w-8">#</div>
        <div>Kg</div>
        <div>{executionType === 'time' ? 'Tempo (s)' : 'Reps'}</div>
        <div className="w-10">Ok</div>
      </div>

      {rows.map((row, i) => (
        <SetRow
          key={row.setNumber}
          setNumber={row.setNumber}
          existingSet={row.existingSet}
          plannedReps={plannedRepsList?.[i] ? plannedRepsList[i].toString() : plannedReps}
          defaultWeight={defaultWeight}
          executionType={executionType}
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
  defaultWeight,
  executionType,
  suggestedValues,
  lastSet,
  onComplete
}: {
  setNumber: number;
  existingSet?: SessionSet;
  plannedReps: string;
  defaultWeight: number;
  executionType: 'reps' | 'time';
  suggestedValues?: { weight?: number; reps?: number } | null;
  lastSet?: { actualWeightKg?: number; actualReps?: number };
  onComplete: (data: { actualReps: number; actualWeightKg: number }) => void;
}) {
  // Initialize with existing data OR defaults
  // Parse planned reps to get a number (e.g. "12-15" -> 12)
  const targetValue = executionType === 'time'
    ? parseInt(plannedReps) || 0
    : parseInt(plannedReps) || 12;

  const [weight, setWeight] = useState<string>(
    existingSet?.actualWeightKg?.toString() || (defaultWeight > 0 ? defaultWeight.toString() : "")
  );
  const [value, setValue] = useState<string>(
    existingSet?.actualReps?.toString() || targetValue.toString()
  );

  const isCompleted = existingSet?.isCompleted;

  // Timer State for 'time' execution
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // React to suggested values
  useEffect(() => {
    if (suggestedValues && !isCompleted) {
      if (suggestedValues.weight !== undefined) setWeight(suggestedValues.weight.toString());
      if (suggestedValues.reps !== undefined && executionType !== 'time') setValue(suggestedValues.reps.toString());
    }
  }, [suggestedValues, isCompleted, executionType]);

  // Autofill from Last Set if empty? Optional. For now just display.
  // Display last log below inputs

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      // Stop
      setIsTimerRunning(false);
      setValue(timerSeconds.toString());
    } else {
      // Start
      setTimerSeconds(0);
      setIsTimerRunning(true);
    }
  };

  const handleCheck = () => {
    if (isTimerRunning) toggleTimer(); // Stop timer if running

    const w = parseFloat(weight) || 0;
    const v = parseFloat(value) || 0;
    onComplete({ actualWeightKg: w, actualReps: v });
  };

  return (
    <div className="mb-2">
      <div className={cn(
        "grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center",
        isCompleted ? "opacity-50" : "opacity-100"
      )}>
        {/* Set Number */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold">
          {setNumber}
        </div>

        {/* Weight Input */}
        <Input
          type="number"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="text-center h-10 font-bold bg-muted/30"
          disabled={!!isCompleted}
        />

        {/* Reps/Time Input with Timer Toggle */}
        <div className="relative">
          <Input
            type="number"
            placeholder={executionType === 'time' ? "seg" : "reps"}
            value={isTimerRunning ? timerSeconds : value}
            onChange={(e) => !isTimerRunning && setValue(e.target.value)}
            className={cn(
              "text-center h-10 font-bold bg-muted/30",
              isTimerRunning && "text-primary border-primary bg-primary/10"
            )}
            disabled={!!isCompleted || isTimerRunning}
          />

          {/* Play Button for Time execution */}
          {executionType === 'time' && !isCompleted && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "absolute right-0 top-0 h-10 w-8 text-muted-foreground hover:text-primary",
                isTimerRunning && "text-red-500 hover:text-red-600 animate-pulse"
              )}
              onClick={toggleTimer}
            >
              {isTimerRunning ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
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
          disabled={isTimerRunning}
        >
          <Check className={cn("w-5 h-5", isCompleted ? "text-white" : "text-muted-foreground")} />
        </Button>
      </div>

      {/* History Last Log Display */}
      {lastSet && !isCompleted && (
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 px-1 mt-1 text-[10px] text-muted-foreground/70">
          <div className="w-8"></div>
          <div className="text-center">Ant: {lastSet.actualWeightKg}</div>
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
