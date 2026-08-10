import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HabitEntry } from "@/types/checkin";
import { Habit } from "@/hooks/useHabits";
import { Progress } from "@/components/ui/progress";
import { Check, Minus, Plus } from "lucide-react";

const HABIT_ICONS: Record<string, string> = {
  dumbbell: "💪",
  apple: "🍎",
  droplet: "💧",
  bed: "🛏️",
  brain: "🧠",
  heart: "❤️",
  book: "📚",
  run: "🏃",
  meditation: "🧘",
  pill: "💊",
  target: "🎯",
};

interface QuickHabitsProps {
  habits: Habit[];
  habitEntries: HabitEntry[];
  onToggle: (habit: Habit) => void;
  onUpdateProgress: (habitId: string, delta: number) => void;
}

export function QuickHabits({
  habits,
  habitEntries,
  onToggle,
  onUpdateProgress,
}: QuickHabitsProps) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Nenhum hábito configurado.
      </div>
    );
  }

  const getEntry = (habitId: string): HabitEntry | undefined => {
    return habitEntries.find((e) => e.habitId === habitId);
  };

  return (
    <div className="space-y-2">
      {habits.map((habit) => {
        const entry = getEntry(habit.id);
        const current = entry?.current || 0;
        const goal = entry?.goal || habit.default_goal;
        const isCompleted = entry?.completed || current >= goal;
        const progressPercent = Math.min(100, (current / goal) * 100);

        return (
          <div
            key={habit.id}
            className={cn(
              "p-3 rounded-xl border transition-all",
              isCompleted
                ? "bg-success/5 border-success/30"
                : "bg-card border-border hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <button
                onClick={() => onToggle(habit)}
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xl transition-all",
                  isCompleted
                    ? "bg-success/20"
                    : "bg-muted hover:scale-105"
                )}
                style={{ backgroundColor: isCompleted ? undefined : `${habit.color}20` }}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  HABIT_ICONS[habit.icon] || "🎯"
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={cn(
                    "font-medium text-sm truncate",
                    isCompleted && "text-success"
                  )}>
                    {habit.name}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {current}/{goal} {habit.unit}
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className="h-1.5"
                  style={{
                    ["--progress-background" as string]: `${habit.color}30`,
                    ["--progress-foreground" as string]: isCompleted ? "hsl(var(--success))" : habit.color,
                  }}
                />
              </div>

              {/* Quick actions */}
              {goal > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onUpdateProgress(habit.id, -1)}
                    disabled={current <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onUpdateProgress(habit.id, 1)}
                    disabled={isCompleted}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
