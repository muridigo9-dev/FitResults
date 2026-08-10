/**
 * CheckinsSummaryCard Component
 * 
 * Displays today's check-in completion status.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  CheckCircle2, 
  Circle, 
  Dumbbell, 
  Utensils, 
  Moon,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckinItem {
  id: string;
  label: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface CheckinsSummaryCardProps {
  workoutCompleted: boolean;
  mealsCompleted: number;
  mealsTotal: number;
  sleepLogged: boolean;
}

export function CheckinsSummaryCard({ 
  workoutCompleted, 
  mealsCompleted, 
  mealsTotal,
  sleepLogged 
}: CheckinsSummaryCardProps) {
  const items: CheckinItem[] = [
    { 
      id: "workout", 
      label: "Treino", 
      completed: workoutCompleted, 
      icon: Dumbbell 
    },
    { 
      id: "meals", 
      label: `Refeições (${mealsCompleted}/${mealsTotal})`, 
      completed: mealsCompleted >= mealsTotal, 
      icon: Utensils 
    },
    { 
      id: "sleep", 
      label: "Sono", 
      completed: sleepLogged, 
      icon: Moon 
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Check-ins de Hoje</p>
            <p className="text-lg font-semibold">{completedCount}/{items.length} concluídos</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/checkin">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Progress value={progress} className="h-1.5 mb-3" />

        <div className="flex gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  item.completed ? "text-success" : "text-muted-foreground"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <Icon className="h-3.5 w-3.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
