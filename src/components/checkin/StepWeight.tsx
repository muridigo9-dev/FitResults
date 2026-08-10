import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeNumericInput } from "@/lib/numberUtils";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StepWeightProps {
  currentWeight?: number;
  lastWeight?: number;
  onUpdate: (weight: number | undefined) => void;
  className?: string;
}

export function StepWeight({ currentWeight, lastWeight, onUpdate, className }: StepWeightProps) {
  const [inputValue, setInputValue] = useState(currentWeight?.toString() || "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdate(numValue);
    } else if (value === "") {
      onUpdate(undefined);
    }
  };

  const handleBlur = () => {
    // Sanitize on blur to remove leading zeros
    const sanitized = sanitizeNumericInput(inputValue);
    if (sanitized !== inputValue) {
      setInputValue(sanitized);
      const numValue = parseFloat(sanitized);
      if (!isNaN(numValue) && numValue > 0) {
        onUpdate(numValue);
      } else if (sanitized === "") {
        onUpdate(undefined);
      }
    }
  };

  const weightDiff = currentWeight && lastWeight 
    ? currentWeight - lastWeight 
    : null;

  const getTrendIcon = () => {
    if (!weightDiff) return null;
    if (weightDiff > 0) return <TrendingUp className="h-4 w-4 text-warning" />;
    if (weightDiff < 0) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDiff = () => {
    if (!weightDiff) return null;
    const sign = weightDiff > 0 ? "+" : "";
    return `${sign}${weightDiff.toFixed(1)} kg`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Peso</h2>
        <p className="text-sm text-muted-foreground">
          Registro opcional do seu peso
        </p>
      </div>

      {/* Weight input */}
      <Card variant="elevated" className="animate-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="500"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="0.0"
                className="w-32 text-center text-3xl font-bold h-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <span className="text-xl text-muted-foreground">kg</span>
          </div>
        </CardContent>
      </Card>

      {/* Last weight comparison */}
      {lastWeight && (
        <Card variant="default" className="animate-in-delay-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Último registro</p>
                <p className="text-lg font-semibold text-foreground">{lastWeight} kg</p>
              </div>
              
              {weightDiff !== null && (
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <span className={cn(
                    "font-medium",
                    weightDiff > 0 && "text-warning",
                    weightDiff < 0 && "text-success",
                    weightDiff === 0 && "text-muted-foreground"
                  )}>
                    {formatDiff()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip message */}
      <p className="text-center text-sm text-muted-foreground">
        Este campo é opcional. Você pode pular se preferir.
      </p>
    </div>
  );
}
