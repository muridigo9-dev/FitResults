/**
 * DailyMacrosCard Component
 * 
 * Shows macro progress for the day with simple bars.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Beef, Wheat, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MacroGrams } from "@/types/nutrition";

interface DailyMacrosCardProps {
  consumed: MacroGrams;
  target: MacroGrams;
  className?: string;
}

const MACROS = [
  { key: "protein" as const, icon: Beef, label: "Proteína", color: "text-habit-workout", bg: "bg-habit-workout" },
  { key: "carbs" as const, icon: Wheat, label: "Carbs", color: "text-habit-meals", bg: "bg-habit-meals" },
  { key: "fat" as const, icon: Droplets, label: "Gorduras", color: "text-habit-water", bg: "bg-habit-water" },
];

export function DailyMacrosCard({ consumed, target, className }: DailyMacrosCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-3">Macros de hoje</p>
        
        <div className="space-y-3">
          {MACROS.map(({ key, icon: Icon, label, color, bg }) => {
            const percentage = Math.min((consumed[key] / target[key]) * 100, 100);
            const isComplete = consumed[key] >= target[key];
            
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", color)} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {consumed[key].toFixed(0)}/{target[key].toFixed(0)}g
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className={cn("h-1.5", `${bg}/20`)}
                />
                {isComplete && (
                  <span className="text-xs text-success font-medium">✓ Atingido</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
