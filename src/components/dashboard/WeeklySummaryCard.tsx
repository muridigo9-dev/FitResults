/**
 * WeeklySummaryCard Component
 * 
 * Displays weekly averages for weight, water, and calories.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyData {
  avgWeight?: number;
  weightChange?: number;
  avgWater?: number;
  waterGoal?: number;
  avgCalories?: number;
  calorieTarget?: number;
}

interface WeeklySummaryCardProps {
  data: WeeklyData;
}

export function WeeklySummaryCard({ data }: WeeklySummaryCardProps) {
  const { avgWeight, weightChange, avgWater, waterGoal, avgCalories, calorieTarget } = data;

  const getTrendIcon = (change?: number) => {
    if (!change || Math.abs(change) < 0.1) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-success" />;
  };

  const getCalorieAdherence = () => {
    if (!avgCalories || !calorieTarget) return null;
    const adherence = (avgCalories / calorieTarget) * 100;
    return adherence;
  };

  const adherence = getCalorieAdherence();

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Resumo Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {/* Weight */}
        {avgWeight && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {getTrendIcon(weightChange)}
            </div>
            <p className="text-lg font-bold">{avgWeight.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg (média)</p>
            {weightChange && (
              <p className={cn(
                "text-xs font-medium",
                weightChange > 0 ? "text-warning" : "text-success"
              )}>
                {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
              </p>
            )}
          </div>
        )}

        {/* Water */}
        {avgWater && waterGoal && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                (avgWater / waterGoal) >= 0.8 ? "bg-success" : "bg-warning"
              )} />
            </div>
            <p className="text-lg font-bold">{(avgWater / 1000).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">L/dia</p>
            <p className="text-xs font-medium text-muted-foreground">
              {((avgWater / waterGoal) * 100).toFixed(0)}% da meta
            </p>
          </div>
        )}

        {/* Calories */}
        {adherence && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                adherence >= 90 && adherence <= 110 ? "bg-success" : "bg-warning"
              )} />
            </div>
            <p className="text-lg font-bold">{avgCalories?.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">kcal/dia</p>
            <p className={cn(
              "text-xs font-medium",
              adherence >= 90 && adherence <= 110 ? "text-success" : "text-warning"
            )}>
              {adherence.toFixed(0)}% da meta
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
