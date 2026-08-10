import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChallengeDay, Challenge } from "@/types/content";
import { ChallengeTaskEntry } from "@/types/checkin";
import { TASK_TYPE_ICONS } from "@/lib/constants";
import { Check, Trophy, Target } from "lucide-react";

interface StepChallengesProps {
  challenge: Challenge | null;
  currentDay: ChallengeDay | undefined;
  completedTasks: ChallengeTaskEntry[];
  onToggle: (task: ChallengeTaskEntry) => void;
  className?: string;
}

export function StepChallenges({ 
  challenge, 
  currentDay, 
  completedTasks, 
  onToggle, 
  className 
}: StepChallengesProps) {
  if (!challenge || !currentDay) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-2">
            <Trophy className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Desafios</h2>
          <p className="text-sm text-muted-foreground">
            Você não está participando de nenhum desafio no momento.
          </p>
        </div>
      </div>
    );
  }

  const isTaskCompleted = (taskId: string) => 
    completedTasks.some(t => t.taskId === taskId && t.completed);

  const completedCount = currentDay.tasks.filter(t => isTaskCompleted(t.id)).length;
  const progress = Math.round((completedCount / currentDay.tasks.length) * 100);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Desafios</h2>
        <p className="text-sm text-muted-foreground">
          {challenge.name}
        </p>
      </div>

      {/* Day info */}
      <Card variant="elevated" className="animate-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Dia {currentDay.dayNumber} de {challenge.totalDays}</p>
              <p className="font-semibold text-foreground">{currentDay.dayNumber === 1 ? "Primeiro dia!" : `Dia ${currentDay.dayNumber}`}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{progress}%</p>
              <p className="text-xs text-muted-foreground">concluído</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <div className="space-y-3">
        {currentDay.tasks.map((task, index) => {
          const completed = isTaskCompleted(task.id);
          const taskEntry: ChallengeTaskEntry = {
            challengeId: challenge.id,
            dayNumber: currentDay.dayNumber,
            taskId: task.id,
            taskName: task.title,
            taskType: task.type,
            completed: false,
            target: task.target,
            unit: task.unit,
          };
          
          return (
            <Card
              key={task.id}
              variant="default"
              interactive
              className={cn(
                "transition-all duration-200 cursor-pointer",
                `animate-in-delay-${index + 1}`,
                completed && "ring-2 ring-success border-success/50"
              )}
              onClick={() => onToggle(taskEntry)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors text-xl",
                    completed ? "bg-success" : "bg-muted"
                  )}>
                    {completed ? (
                      <Check className="h-6 w-6 text-success-foreground animate-scale-in" />
                    ) : (
                      TASK_TYPE_ICONS[task.type] || <Target className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium transition-colors",
                      completed ? "text-success line-through" : "text-foreground"
                    )}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Meta: {task.target} {task.unit}
                    </p>
                  </div>

                  <div className={cn(
                    "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    completed 
                      ? "border-success bg-success" 
                      : "border-muted-foreground/30"
                  )}>
                    {completed && <Check className="h-4 w-4 text-success-foreground" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
