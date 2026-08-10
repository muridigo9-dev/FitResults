import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Challenge, ChallengeDay } from "@/types/content";
import { ChallengeTaskEntry } from "@/types/checkin";
import { TASK_TYPE_ICONS } from "@/lib/constants";
import { Check, Trophy, Target, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface QuickChallengesProps {
  challenge: Challenge | null;
  currentDay: ChallengeDay | undefined;
  completedTasks: ChallengeTaskEntry[];
  onToggle: (task: ChallengeTaskEntry) => void;
  className?: string;
}

export function QuickChallenges({ 
  challenge, 
  currentDay, 
  completedTasks, 
  onToggle,
  className 
}: QuickChallengesProps) {
  const [open, setOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
  const [initialSelections, setInitialSelections] = useState<Set<string>>(new Set());

  // Initialize pending selections when sheet opens
  useEffect(() => {
    if (open && currentDay) {
      const currentSelections = new Set(
        completedTasks.filter(t => t.completed).map(t => t.taskId)
      );
      setPendingSelections(currentSelections);
      setInitialSelections(currentSelections);
    }
  }, [open, completedTasks, currentDay]);

  if (!challenge || !currentDay) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Nenhum desafio ativo
      </div>
    );
  }

  const togglePending = (taskId: string) => {
    setPendingSelections(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSave = () => {
    // Find what changed
    const added = [...pendingSelections].filter(id => !initialSelections.has(id));
    const removed = [...initialSelections].filter(id => !pendingSelections.has(id));

    // Apply changes
    [...added, ...removed].forEach(taskId => {
      const task = currentDay.tasks.find(t => t.id === taskId);
      if (task) {
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
        onToggle(taskEntry);
      }
    });

    setOpen(false);
    
    if (added.length > 0 || removed.length > 0) {
      toast.success("Tarefas atualizadas", {
        description: `${pendingSelections.size}/${currentDay.tasks.length} tarefas concluídas`,
      });
    }
  };

  const handleCancel = () => {
    setPendingSelections(initialSelections);
    setOpen(false);
  };

  const completedCount = currentDay.tasks.filter(t => 
    completedTasks.some(ct => ct.taskId === t.id && ct.completed)
  ).length;
  const totalTasks = currentDay.tasks.length;

  const hasChanges = 
    pendingSelections.size !== initialSelections.size ||
    [...pendingSelections].some(id => !initialSelections.has(id));

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn(
        "text-sm",
        completedCount === totalTasks ? "text-success font-medium" : "text-muted-foreground"
      )}>
        {completedCount}/{totalTasks} tarefas do Dia {currentDay.dayNumber}
      </span>

      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen && hasChanges) {
          handleCancel();
        } else {
          setOpen(isOpen);
        }
      }}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight className="h-4 w-4 mr-1" />
            Ver tarefas
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {challenge.name} - Dia {currentDay.dayNumber}
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 space-y-3 overflow-y-auto">
            {currentDay.tasks.map((task) => {
              const completed = pendingSelections.has(task.id);
              
              return (
                <Card
                  key={task.id}
                  variant="default"
                  interactive
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    completed && "ring-2 ring-success border-success/50"
                  )}
                  onClick={() => togglePending(task.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors text-lg",
                        completed ? "bg-success" : "bg-muted"
                      )}>
                        {completed ? (
                          <Check className="h-5 w-5 text-success-foreground" />
                        ) : (
                          TASK_TYPE_ICONS[task.type] || <Target className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium transition-colors",
                          completed ? "text-success line-through" : "text-foreground"
                        )}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Meta: {task.target} {task.unit}
                        </p>
                      </div>

                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                        completed ? "border-success bg-success" : "border-muted-foreground/30"
                      )}>
                        {completed && <Check className="h-4 w-4 text-success-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <SheetFooter className="flex-row gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
            >
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
