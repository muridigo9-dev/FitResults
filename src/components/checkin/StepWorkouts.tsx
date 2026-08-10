import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Workout } from "@/types/content";
import { WorkoutEntry } from "@/types/checkin";
import { Check, Dumbbell, Clock, ChevronRight } from "lucide-react";

interface StepWorkoutsProps {
  workouts: Workout[];
  selectedWorkouts: WorkoutEntry[];
  onToggle: (workoutId: string, workoutName: string) => void;
  className?: string;
}

export function StepWorkouts({ workouts, selectedWorkouts, onToggle, className }: StepWorkoutsProps) {
  const isSelected = (workoutId: string) => 
    selectedWorkouts.some(w => w.workoutId === workoutId && w.completed);

  const completedCount = selectedWorkouts.filter(w => w.completed).length;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "strength": return "Força";
      case "cardio": return "Cardio";
      case "flexibility": return "Flexibilidade";
      case "hiit": return "HIIT";
      default: return category;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "Iniciante";
      case "intermediate": return "Intermediário";
      case "advanced": return "Avançado";
      default: return difficulty;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Dumbbell className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Treinos</h2>
        <p className="text-sm text-muted-foreground">
          Quais treinos você realizou hoje?
        </p>
      </div>

      {/* Summary */}
      {completedCount > 0 && (
        <Card variant="elevated" className="animate-in">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Treinos concluídos</p>
              <p className="text-lg font-semibold text-foreground">
                {completedCount} de {workouts.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-success-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout cards */}
      <div className="space-y-3">
        {workouts.map((workout, index) => {
          const selected = isSelected(workout.id);
          
          return (
            <Card
              key={workout.id}
              variant="default"
              interactive
              className={cn(
                "transition-all duration-200 cursor-pointer",
                `animate-in-delay-${index + 1}`,
                selected && "ring-2 ring-success border-success/50"
              )}
              onClick={() => onToggle(workout.id, workout.title)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    selected ? "bg-success text-success-foreground" : "bg-muted"
                  )}>
                    {selected ? (
                      <Check className="h-6 w-6 animate-scale-in" />
                    ) : (
                      <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {getCategoryLabel(workout.category)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getDifficultyLabel(workout.category)}
                      </span>
                    </div>
                    <p className="font-medium text-foreground truncate">{workout.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {workout.exercises.reduce((acc, e) => acc + (e.sets * e.reps * 3 + e.sets * e.restSeconds) / 60, 0).toFixed(0)} min
                      </span>
                      <span>{workout.exercises.length} exercícios</span>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    selected ? "text-success rotate-90" : "text-muted-foreground"
                  )} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
