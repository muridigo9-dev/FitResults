/**
 * CustomMacroEditor Component
 * 
 * Advanced mode for custom macro percentage editing.
 * Uses numeric inputs with slider for fine-tuning.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Beef, 
  Wheat, 
  Droplets,
  AlertCircle,
  Check,
  RotateCcw,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MacroDistribution } from "@/types/nutrition";

interface CustomMacroEditorProps {
  distribution: MacroDistribution;
  onChange: (distribution: MacroDistribution) => void;
  onSave: () => void;
  onCancel: () => void;
  dailyCalories?: number;
}

const MACRO_CONFIG = {
  protein: { 
    icon: Beef, 
    label: "Proteína", 
    color: "text-habit-workout",
    bg: "bg-habit-workout/10",
    borderActive: "border-habit-workout",
    min: 15,
    max: 50,
    kcalPerGram: 4,
  },
  carbs: { 
    icon: Wheat, 
    label: "Carboidratos", 
    color: "text-habit-meals",
    bg: "bg-habit-meals/10",
    borderActive: "border-habit-meals",
    min: 20,
    max: 60,
    kcalPerGram: 4,
  },
  fat: { 
    icon: Droplets, 
    label: "Gorduras", 
    color: "text-habit-water",
    bg: "bg-habit-water/10",
    borderActive: "border-habit-water",
    min: 15,
    max: 45,
    kcalPerGram: 9,
  },
};

export function CustomMacroEditor({ 
  distribution, 
  onChange, 
  onSave, 
  onCancel,
  dailyCalories = 2000,
}: CustomMacroEditorProps) {
  const [localDist, setLocalDist] = useState<MacroDistribution>(distribution);
  const total = localDist.protein + localDist.carbs + localDist.fat;
  const isValid = Math.abs(total - 100) < 1;

  useEffect(() => {
    setLocalDist(distribution);
  }, [distribution]);

  const handleInputChange = (key: keyof MacroDistribution, inputValue: string) => {
    const value = Math.min(MACRO_CONFIG[key].max, Math.max(MACRO_CONFIG[key].min, Number(inputValue) || 0));
    const newDist = { ...localDist, [key]: value };
    setLocalDist(newDist);
    onChange(newDist);
  };

  const handleSliderChange = (key: keyof MacroDistribution, value: number) => {
    const newDist = { ...localDist, [key]: value };
    setLocalDist(newDist);
    onChange(newDist);
  };

  const handleReset = () => {
    const balanced: MacroDistribution = { protein: 30, carbs: 40, fat: 30 };
    setLocalDist(balanced);
    onChange(balanced);
  };

  // Calculate grams and calories for each macro
  const getGramsAndCals = (key: keyof MacroDistribution) => {
    const config = MACRO_CONFIG[key];
    const kcalFromMacro = (localDist[key] / 100) * dailyCalories;
    const grams = kcalFromMacro / config.kcalPerGram;
    return { grams: Math.round(grams), kcal: Math.round(kcalFromMacro) };
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Modo Avançado</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ajuste as porcentagens usando os campos ou sliders
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Validation Warning */}
        {!isValid && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>A soma deve ser 100%. Atual: {total.toFixed(0)}%</span>
          </div>
        )}

        {/* Macro Editors */}
        {(Object.keys(MACRO_CONFIG) as Array<keyof MacroDistribution>).map((key) => {
          const config = MACRO_CONFIG[key];
          const Icon = config.icon;
          const value = localDist[key];
          const { grams, kcal } = getGramsAndCals(key);

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.bg)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {grams}g • {kcal} kcal
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className={cn(
                      "w-16 h-9 text-center font-bold text-lg",
                      "focus:ring-2",
                      value >= config.min && value <= config.max 
                        ? config.borderActive 
                        : "border-warning"
                    )}
                    min={config.min}
                    max={config.max}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <Slider
                value={[value]}
                onValueChange={([v]) => handleSliderChange(key, v)}
                min={config.min}
                max={config.max}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                <span>Mín: {config.min}%</span>
                <span>Máx: {config.max}%</span>
              </div>
            </div>
          );
        })}

        {/* Total Summary */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          isValid ? "bg-success/10" : "bg-warning/10"
        )}>
          <div className="flex items-center gap-2">
            <Flame className={cn("h-4 w-4", isValid ? "text-success" : "text-warning")} />
            <span className="font-medium text-sm">Total</span>
          </div>
          <div className="text-right">
            <span className={cn(
              "font-bold text-lg",
              isValid ? "text-success" : "text-warning"
            )}>
              {total.toFixed(0)}%
            </span>
            {isValid && (
              <p className="text-[10px] text-muted-foreground">
                = {dailyCalories} kcal/dia
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            className="flex-1" 
            onClick={onSave}
            disabled={!isValid}
          >
            <Check className="h-4 w-4 mr-2" />
            Salvar Ajustes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
