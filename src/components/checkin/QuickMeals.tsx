import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Diet } from "@/types/content";
import { MealEntry } from "@/types/checkin";
import { mealTypeLabel } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import { Check, Utensils, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface QuickMealsProps {
  diets: Diet[];
  selectedMeals: MealEntry[];
  onToggle: (dietId: string, dietName: string, mealType: MealEntry["mealType"]) => void;
  className?: string;
}

export function QuickMeals({ diets, selectedMeals, onToggle, className }: QuickMealsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
  const [initialSelections, setInitialSelections] = useState<Set<string>>(new Set());

  // Initialize pending selections when sheet opens
  useEffect(() => {
    if (open) {
      const currentSelections = new Set(
        selectedMeals.filter(m => m.completed).map(m => m.dietId)
      );
      setPendingSelections(currentSelections);
      setInitialSelections(currentSelections);
    }
  }, [open, selectedMeals]);

  const getMealType = (category: string): MealEntry["mealType"] => {
    switch (category) {
      case "breakfast": return "breakfast";
      case "lunch": return "lunch";
      case "dinner": return "dinner";
      default: return "snack";
    }
  };

  const togglePending = (dietId: string) => {
    setPendingSelections(prev => {
      const next = new Set(prev);
      if (next.has(dietId)) {
        next.delete(dietId);
      } else {
        next.add(dietId);
      }
      return next;
    });
  };

  const handleSave = () => {
    // Find what changed
    const added = [...pendingSelections].filter(id => !initialSelections.has(id));
    const removed = [...initialSelections].filter(id => !pendingSelections.has(id));

    // Apply changes
    [...added, ...removed].forEach(dietId => {
      const diet = diets.find(d => d.id === dietId);
      if (diet) {
        onToggle(dietId, diet.title, getMealType(diet.category));
      }
    });

    setOpen(false);
    
    if (added.length > 0 || removed.length > 0) {
      toast.success(t("diets.mealsUpdated"), {
        description: t("diets.mealsLogged", { count: pendingSelections.size }),
      });
    }
  };

  const handleCancel = () => {
    setPendingSelections(initialSelections);
    setOpen(false);
  };

  const completedCount = selectedMeals.filter(m => m.completed).length;
  const hasChanges = 
    pendingSelections.size !== initialSelections.size ||
    [...pendingSelections].some(id => !initialSelections.has(id));

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn(
        "text-sm",
        completedCount > 0 ? "text-success font-medium" : "text-muted-foreground"
      )}>
        {completedCount > 0
          ? t("diets.mealsLogged", { count: completedCount })
          : t("diets.noMealsLogged")}
      </span>

      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen && hasChanges) {
          handleCancel();
        } else {
          setOpen(isOpen);
        }
      }}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Registrar Refeições
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 space-y-3 overflow-y-auto">
            {diets.map((diet) => {
              const selected = pendingSelections.has(diet.id);
              
              return (
                <Card
                  key={diet.id}
                  variant="default"
                  interactive
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    selected && "ring-2 ring-success border-success/50"
                  )}
                  onClick={() => togglePending(diet.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected ? "bg-success text-success-foreground" : "bg-muted"
                      )}>
                        {selected ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Utensils className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {mealTypeLabel(t, diet.category)}
                          </span>
                        </div>
                        <p className="font-medium text-foreground truncate">{diet.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {diet.macros.calories} kcal
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <SheetFooter className="flex-row gap-2 pt-4 border-t mt-4">
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
            >
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
