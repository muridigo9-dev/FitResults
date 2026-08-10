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
import { Workout } from "@/types/content";
import { WorkoutEntry } from "@/types/checkin";
import { Check, Dumbbell, Plus, Timer, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface QuickWorkoutsProps {
  workouts: Workout[];
  selectedWorkouts: WorkoutEntry[];
  onToggle: (workoutId: string, workoutName: string) => void;
  className?: string;
}

export function QuickWorkouts({ workouts, selectedWorkouts, onToggle, className }: QuickWorkoutsProps) {
  const [open, setOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
  const [initialSelections, setInitialSelections] = useState<Set<string>>(new Set());

  // Initialize pending selections when sheet opens
  useEffect(() => {
    if (open) {
      const currentSelections = new Set(
        selectedWorkouts.filter(w => w.completed).map(w => w.workoutId)
      );
      setPendingSelections(currentSelections);
      setInitialSelections(currentSelections);
    }
  }, [open, selectedWorkouts]);

  const togglePending = (workoutId: string) => {
    setPendingSelections(prev => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  };

  const handleSave = () => {
    // Find what changed
    const added = [...pendingSelections].filter(id => !initialSelections.has(id));
    const removed = [...initialSelections].filter(id => !pendingSelections.has(id));

    // Apply changes
    [...added, ...removed].forEach(workoutId => {
      const workout = workouts.find(w => w.id === workoutId);
      if (workout) {
        onToggle(workoutId, workout.title);
      }
    });

    setOpen(false);
    
    if (added.length > 0 || removed.length > 0) {
      toast.success("Treinos atualizados", {
        description: `${pendingSelections.size} treino(s) registrado(s)`,
      });
    }
  };

  const handleCancel = () => {
    setPendingSelections(initialSelections);
    setOpen(false);
  };

  const completedCount = selectedWorkouts.filter(w => w.completed).length;
  const hasChanges = 
    pendingSelections.size !== initialSelections.size ||
    [...pendingSelections].some(id => !initialSelections.has(id));

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "strength": return "Força";
      case "cardio": return "Cardio";
      case "flexibility": return "Flexibilidade";
      case "hiit": return "HIIT";
      default: return category;
    }
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn(
        "text-sm",
        completedCount > 0 ? "text-success font-medium" : "text-muted-foreground"
      )}>
        {completedCount > 0 
          ? `${completedCount} treino(s) concluído(s)` 
          : "Nenhum treino hoje"}
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
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Registrar Treino
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 space-y-3 overflow-y-auto">
            {workouts.map((workout) => {
              const selected = pendingSelections.has(workout.id);
              const estimatedTime = workout.exercises.reduce(
                (acc, ex) => acc + (ex.sets * (ex.reps * 3 + ex.restSeconds)) / 60,
                0
              );
              
              return (
                <Card
                  key={workout.id}
                  variant="default"
                  interactive
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    selected && "ring-2 ring-success border-success/50"
                  )}
                  onClick={() => togglePending(workout.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected ? "bg-success text-success-foreground" : "bg-muted"
                      )}>
                        {selected ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {getCategoryLabel(workout.category)}
                          </span>
                        </div>
                        <p className="font-medium text-foreground truncate">{workout.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            ~{Math.round(estimatedTime)} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {workout.exercises.length} exercícios
                          </span>
                        </div>
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
