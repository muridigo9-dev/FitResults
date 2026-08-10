import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaterEntry } from "@/types/checkin";
import { Droplets, Plus, Minus } from "lucide-react";

interface StepWaterProps {
  water: WaterEntry;
  onUpdate: (amount: number) => void;
  onSet: (current: number) => void;
  className?: string;
}

const WATER_PRESETS = [
  { label: "+200ml", value: 200 },
  { label: "+500ml", value: 500 },
  { label: "+1L", value: 1000 },
];

export function StepWater({ water, onUpdate, onSet, className }: StepWaterProps) {
  const progress = Math.min(100, Math.round((water.current / water.goal) * 100));
  const isGoalMet = water.current >= water.goal;
  const liters = (water.current / 1000).toFixed(1);
  const goalLiters = (water.goal / 1000).toFixed(1);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Droplets className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Água</h2>
        <p className="text-sm text-muted-foreground">
          Quanto você bebeu hoje?
        </p>
      </div>

      {/* Progress circle */}
      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={isGoalMet ? "hsl(var(--success))" : "hsl(var(--primary))"}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets className={cn(
              "h-6 w-6 mb-1",
              isGoalMet ? "text-success" : "text-primary"
            )} />
            <span className="text-3xl font-bold text-foreground">{liters}L</span>
            <span className="text-sm text-muted-foreground">de {goalLiters}L</span>
          </div>
        </div>
      </div>

      {/* Progress text */}
      <Card variant={isGoalMet ? "default" : "elevated"} className={cn(
        "animate-in",
        isGoalMet && "ring-2 ring-success"
      )}>
        <CardContent className="p-4 text-center">
          {isGoalMet ? (
            <p className="font-medium text-success">
              🎉 Meta atingida! Continue se hidratando.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Faltam <span className="font-semibold text-foreground">{((water.goal - water.current) / 1000).toFixed(1)}L</span> para atingir sua meta
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick add buttons */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Adicionar rapidamente</p>
        <div className="flex justify-center gap-3">
          {WATER_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="lg"
              className="flex-1 max-w-24"
              onClick={() => onUpdate(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Fine controls */}
      <Card variant="default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onUpdate(-100)}
              disabled={water.current <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{water.current}ml</p>
              <p className="text-xs text-muted-foreground">ajuste fino ±100ml</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onUpdate(100)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
