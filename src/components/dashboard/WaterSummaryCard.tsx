/**
 * WaterSummaryCard Component
 * 
 * Displays today's water intake with progress.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Droplets, Plus } from "lucide-react";

interface WaterSummaryCardProps {
  current: number; // in ml
  goal: number; // in ml
  onAddWater?: (amount: number) => void;
}

export function WaterSummaryCard({ current, goal, onAddWater }: WaterSummaryCardProps) {
  const progress = Math.min(100, (current / goal) * 100);
  const isComplete = current >= goal;
  const currentLiters = (current / 1000).toFixed(1);
  const goalLiters = (goal / 1000).toFixed(1);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-habit-water/10 flex items-center justify-center">
            <Droplets className="h-6 w-6 text-habit-water" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Água Hoje</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold">{currentLiters}</p>
              <span className="text-sm text-muted-foreground">/ {goalLiters} L</span>
            </div>
          </div>
          {onAddWater && !isComplete && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onAddWater(250)}
            >
              <Plus className="h-4 w-4 mr-1" />
              250ml
            </Button>
          )}
        </div>
        <Progress 
          value={progress} 
          className="h-1.5 mt-3 bg-habit-water/20" 
        />
        {isComplete && (
          <p className="text-xs text-success mt-2 font-medium">✓ Meta atingida!</p>
        )}
      </CardContent>
    </Card>
  );
}
