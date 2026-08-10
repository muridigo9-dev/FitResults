/**
 * DailyCaloriesCard Component
 * 
 * Shows consumed vs target calories for the day.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyCaloriesCardProps {
  consumed: number;
  target: number;
  className?: string;
}

export function DailyCaloriesCard({ consumed, target, className }: DailyCaloriesCardProps) {
  const percentage = Math.min((consumed / target) * 100, 100);
  const remaining = target - consumed;
  const isOver = consumed > target;
  const isNearTarget = percentage >= 90 && percentage <= 100;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            isOver ? "bg-warning/10" : "bg-primary/10"
          )}>
            <Flame className={cn(
              "h-5 w-5",
              isOver ? "text-warning" : "text-primary"
            )} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Calorias hoje</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{consumed}</span>
              <span className="text-sm text-muted-foreground">/ {target} kcal</span>
            </div>
          </div>
        </div>
        
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isOver ? "bg-warning/20" : "bg-primary/20"
          )} 
        />
        
        <p className={cn(
          "text-xs mt-2 font-medium",
          isOver ? "text-warning" : isNearTarget ? "text-success" : "text-muted-foreground"
        )}>
          {isOver 
            ? `${Math.abs(remaining)} kcal acima da meta` 
            : remaining > 0 
              ? `${remaining} kcal restantes`
              : "Meta atingida! 🎉"
          }
        </p>
      </CardContent>
    </Card>
  );
}
