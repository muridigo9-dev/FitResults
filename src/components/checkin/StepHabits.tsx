import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HabitEntry } from "@/types/checkin";
import { Habit } from "@/hooks/useHabits";
import { Check, Minus, Plus, Target } from "lucide-react";
import { EmptyState } from "@/components/states";

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

interface StepHabitsProps {
  habits: Habit[];
  habitEntries: HabitEntry[];
  onToggle: (habit: Habit) => void;
  onUpdateProgress: (habitId: string, delta: number) => void;
}

export function StepHabits({
  habits,
  habitEntries,
  onToggle,
  onUpdateProgress,
}: StepHabitsProps) {
  const getEntry = (habitId: string): HabitEntry | undefined => {
    return habitEntries.find((e) => e.habitId === habitId);
  };

  const completedCount = habitEntries.filter((e) => e.completed).length;

  if (habits.length === 0) {
    return (
      <EmptyState
        type="habits"
        title="Nenhum hábito configurado"
        description="Configure seus hábitos personalizados na área de Saúde para acompanhá-los aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Seus Hábitos</h2>
        <p className="text-sm text-muted-foreground">
          {completedCount > 0
            ? `${completedCount} de ${habits.length} hábitos concluídos hoje`
            : "Registre o progresso dos seus hábitos"}
        </p>
      </div>

      {/* Habits list */}
      <div className="space-y-3">
        {habits.map((habit, index) => {
          const entry = getEntry(habit.id);
          const current = entry?.current || 0;
          const goal = entry?.goal || habit.default_goal;
          const isCompleted = entry?.completed || current >= goal;
          const progressPercent = Math.min(100, (current / goal) * 100);

          return (
            <Card
              key={habit.id}
              variant="default"
              className={cn(
                `animate-in-delay-${index + 1}`,
                isCompleted && "border-success/30 bg-success/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon / Check button */}
                  <button
                    onClick={() => onToggle(habit)}
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-2xl transition-all",
                      isCompleted
                        ? "bg-success/20"
                        : "bg-muted hover:scale-105 active:scale-95"
                    )}
                    style={{ backgroundColor: isCompleted ? undefined : `${habit.color}20` }}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6 text-success" />
                    ) : (
                      HABIT_ICONS[habit.icon] || "🎯"
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className={cn(
                        "font-semibold truncate",
                        isCompleted && "text-success"
                      )}>
                        {habit.name}
                      </p>
                      <span className={cn(
                        "text-sm font-medium shrink-0 ml-2",
                        isCompleted ? "text-success" : "text-muted-foreground"
                      )}>
                        {current}/{goal} {habit.unit}
                      </span>
                    </div>
                    <Progress
                      value={progressPercent}
                      className="h-2"
                      style={{
                        ["--progress-background" as string]: `${habit.color}30`,
                        ["--progress-foreground" as string]: isCompleted 
                          ? "hsl(var(--success))" 
                          : habit.color,
                      }}
                    />
                    {habit.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions for habits with goal > 1 */}
                {goal > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateProgress(habit.id, -1)}
                      disabled={current <= 0}
                      className="w-20"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      1
                    </Button>
                    <span className="text-lg font-bold text-foreground min-w-[3rem] text-center">
                      {current}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateProgress(habit.id, 1)}
                      disabled={isCompleted}
                      className="w-20"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      1
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
