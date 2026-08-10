import { cn } from "@/lib/utils";
import { CHECKIN_STEPS, STEP_LABELS, CheckinStep } from "@/types/checkin";
import { Check } from "lucide-react";

interface CheckinProgressProps {
  currentStepIndex: number;
  availableSteps: CheckinStep[];
  className?: string;
}

export function CheckinProgress({ currentStepIndex, availableSteps, className }: CheckinProgressProps) {
  const totalSteps = availableSteps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Etapa {currentStepIndex + 1} de {totalSteps}
        </span>
        <span className="font-medium text-foreground">
          {STEP_LABELS[availableSteps[currentStepIndex]]}
        </span>
      </div>
    </div>
  );
}

interface CheckinStepDotsProps {
  currentStepIndex: number;
  completedSteps: number[];
  onStepClick?: (step: CheckinStep) => void;
  className?: string;
}

export function CheckinStepDots({
  currentStepIndex,
  completedSteps,
  onStepClick,
  className
}: CheckinStepDotsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {CHECKIN_STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStepIndex;
        const isPast = index < currentStepIndex;

        return (
          <button
            key={step}
            onClick={() => onStepClick?.(step)}
            disabled={!onStepClick}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-200",
              isCurrent && "w-6 bg-primary",
              isPast && !isCompleted && "bg-primary/40",
              isCompleted && "bg-success",
              !isCurrent && !isPast && !isCompleted && "bg-muted",
              onStepClick && "cursor-pointer hover:scale-110"
            )}
            title={STEP_LABELS[step]}
          >
            {isCompleted && (
              <Check className="h-2 w-2 text-success-foreground mx-auto" />
            )}
          </button>
        );
      })}
    </div>
  );
}
