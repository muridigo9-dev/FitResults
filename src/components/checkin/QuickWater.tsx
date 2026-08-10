import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WaterEntry } from "@/types/checkin";
import { Droplets, Minus, Plus, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface QuickWaterProps {
  water: WaterEntry;
  onUpdate: (amount: number) => void;
  className?: string;
}

const QUICK_AMOUNTS = [
  { label: "+200ml", amount: 200 },
  { label: "+500ml", amount: 500 },
  { label: "+1L", amount: 1000 },
];

export function QuickWater({ water, onUpdate, className }: QuickWaterProps) {
  const [savedFeedback, setSavedFeedback] = useState(false);
  
  const progress = Math.min(100, Math.round((water.current / water.goal) * 100));
  const isComplete = water.current >= water.goal;
  const liters = (water.current / 1000).toFixed(1);
  const goalLiters = (water.goal / 1000).toFixed(1);

  const handleUpdate = (amount: number) => {
    onUpdate(amount);
    setSavedFeedback(true);
  };

  // Clear feedback after animation
  useEffect(() => {
    if (savedFeedback) {
      const timer = setTimeout(() => setSavedFeedback(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [savedFeedback]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress display */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Droplets className={cn("h-4 w-4", isComplete ? "text-success" : "text-primary")} />
          <span className={cn("text-sm font-medium", isComplete ? "text-success" : "text-foreground")}>
            {liters}L / {goalLiters}L
          </span>
        </div>
        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="text-xs text-success flex items-center gap-1 animate-fade-in">
              <Check className="h-3 w-3" />
              Salvo
            </span>
          )}
          <span className={cn("text-xs font-medium", isComplete ? "text-success" : "text-muted-foreground")}>
            {progress}%
          </span>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        className={cn("h-2", isComplete ? "bg-success/20" : "bg-primary/20")}
      />

      {/* Quick add buttons */}
      <div className="flex gap-2">
        {QUICK_AMOUNTS.map(({ label, amount }) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleUpdate(amount);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Fine tuning */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            handleUpdate(-100);
          }}
          disabled={water.current <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">±100ml</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            handleUpdate(100);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
