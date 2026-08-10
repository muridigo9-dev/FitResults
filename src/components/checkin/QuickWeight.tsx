import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { sanitizeNumericInput } from "@/lib/numberUtils";
import { Scale, TrendingDown, TrendingUp, Minus, Check } from "lucide-react";
import { toast } from "sonner";

interface QuickWeightProps {
  currentWeight?: number;
  lastWeight?: number;
  onUpdate: (weight: number | undefined) => void;
  className?: string;
}

export function QuickWeight({ currentWeight, lastWeight, onUpdate, className }: QuickWeightProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Reset input when dialog opens
  useEffect(() => {
    if (open) {
      setInputValue(currentWeight?.toString() || "");
    }
  }, [open, currentWeight]);

  const handleBlur = () => {
    const sanitized = sanitizeNumericInput(inputValue);
    if (sanitized !== inputValue) {
      setInputValue(sanitized);
    }
  };

  const handleSave = () => {
    const weight = parseFloat(inputValue);
    if (!isNaN(weight) && weight > 0) {
      onUpdate(weight);
      setOpen(false);
      toast.success("Peso registrado", {
        description: `${weight} kg salvo com sucesso`,
      });
    }
  };

  const handleCancel = () => {
    setInputValue(currentWeight?.toString() || "");
    setOpen(false);
  };

  const weightDiff = currentWeight && lastWeight ? currentWeight - lastWeight : null;

  const getTrendIcon = () => {
    if (!weightDiff) return null;
    if (weightDiff > 0) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (weightDiff < 0) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const isValidWeight = !isNaN(parseFloat(inputValue)) && parseFloat(inputValue) > 0;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {currentWeight ? (
          <>
            <span className="text-lg font-semibold text-foreground">{currentWeight} kg</span>
            {weightDiff !== null && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={cn(
                  "text-xs",
                  weightDiff > 0 ? "text-destructive" : weightDiff < 0 ? "text-success" : "text-muted-foreground"
                )}>
                  {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg
                </span>
              </div>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            {lastWeight ? `Último: ${lastWeight} kg` : "Não registrado"}
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel();
        } else {
          setOpen(isOpen);
        }
      }}>
        <DialogTrigger asChild>
          <Button
            variant={currentWeight ? "ghost" : "outline"}
            size="sm"
            className="h-8"
            onClick={(e) => e.stopPropagation()}
          >
            {currentWeight ? <Check className="h-4 w-4 text-success" /> : <Scale className="h-4 w-4 mr-1" />}
            {currentWeight ? "" : "Registrar"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Registrar Peso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                placeholder={lastWeight?.toString() || "70.0"}
                className="text-center text-xl font-semibold pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                kg
              </span>
            </div>
            {lastWeight && (
              <p className="text-sm text-center text-muted-foreground">
                Último peso registrado: {lastWeight} kg
              </p>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!isValidWeight}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
