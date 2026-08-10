/**
 * WeightSummaryCard Component
 * 
 * Displays current weight with trend indicator.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightSummaryCardProps {
  currentWeight: number;
  previousWeight?: number;
  goalWeight?: number;
}

export function WeightSummaryCard({ 
  currentWeight, 
  previousWeight,
  goalWeight 
}: WeightSummaryCardProps) {
  const diff = previousWeight ? currentWeight - previousWeight : 0;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-habit-workout" : trend === "down" ? "text-success" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Peso Atual</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{currentWeight.toFixed(1)}</p>
              <span className="text-sm text-muted-foreground">kg</span>
              {diff !== 0 && (
                <span className={cn("flex items-center text-xs font-medium", trendColor)}>
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(diff).toFixed(1)} kg
                </span>
              )}
            </div>
            {goalWeight && (
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {goalWeight} kg ({goalWeight > currentWeight ? "+" : ""}{(goalWeight - currentWeight).toFixed(1)} kg)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
