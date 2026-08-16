import { useState } from "react";
import { QuickDietDrawer } from "@/components/nutrition/LogMealDrawer";
import { Search, Plus, Check, Utensils, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Diet } from "@/types/content";
import { MealEntry } from "@/types/checkin";
import { mealTypeLabel } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import { ConsumptionModal } from "./ConsumptionModal";

interface StepMealsProps {
  diets: Diet[];
  selectedMeals: MealEntry[];
  onToggle: (dietId: string, dietName: string, mealType: MealEntry["mealType"], consumedMacros?: MealEntry["consumedMacros"]) => void;
  className?: string;
}

export function StepMeals({ diets, selectedMeals, onToggle, className }: StepMealsProps) {
  const { t } = useI18n();
  const [modalDish, setModalDish] = useState<Diet | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getMealType = (category: string): MealEntry["mealType"] => {
    switch (category) {
      case "breakfast": return "breakfast";
      case "lunch": return "lunch";
      case "dinner": return "dinner";
      default: return "snack";
    }
  };

  const hasMeal = (dietId: string) =>
    selectedMeals.some(m => m.dietId === dietId && m.completed);

  const completedCount = selectedMeals.filter(m => m.completed).length;

  const totalCalories = selectedMeals
    .filter(m => m.completed)
    .reduce((acc, m) => {
      if (m.consumedMacros) return acc + m.consumedMacros.calories;
      const diet = diets.find(d => d.id === m.dietId);
      return acc + (diet?.macros.calories || 0);
    }, 0);

  const filteredDiets = diets.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.ingredients || []).some(ing => ing.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCardClick = (diet: Diet) => {
    if (hasMeal(diet.id)) {
      const mealType = getMealType(diet.category);
      onToggle(diet.id, diet.title, mealType);
    } else {
      setModalDish(diet);
    }
  };

  const handleModalConfirm = (macros: any) => {
    if (modalDish) {
      const mealType = getMealType(modalDish.category);
      onToggle(modalDish.id, modalDish.title, mealType, macros);
      setModalDish(null);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Utensils className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">{t("checkin.nutrition")}</h2>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          {t("diets.whatDidYouEatToday")}
        </p>
      </div>

      {/* Quick Action Button */}
      <Button
        onClick={() => setIsDrawerOpen(true)}
        className="w-full h-14 rounded-2xl gap-3 font-black text-base uppercase shadow-lg shadow-primary/10 border-2 border-primary/20 hover:scale-[1.02] transition-all"
        variant="outline"
      >
        <Plus className="h-5 w-5" />
        {t("diets.logNewMeal")}
      </Button>

      {/* Summary card */}
      {completedCount > 0 && (
        <Card className="bg-primary/5 border-primary/10 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest">{t("diets.logged")}</p>
              <p className="text-2xl font-black text-foreground leading-none">
                {completedCount} <span className="text-sm font-medium text-muted-foreground italic">{t("diets.mealsUnit")}</span>
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest">{t("diets.dayTotal")}</p>
              <p className="text-2xl font-black text-primary leading-none">{totalCalories} <span className="text-sm font-medium italic">kcal</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={t("diets.filterDishes")}
          className="pl-9 h-11 bg-muted/30 border-border/50 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Meal cards */}
      <div className="space-y-3">
        {filteredDiets.map((diet, index) => {
          const selected = hasMeal(diet.id);
          const mealEntry = selectedMeals.find(m => m.dietId === diet.id);
          const displayMacros = mealEntry?.consumedMacros || diet.macros;
          const isAdjusted = !!mealEntry?.consumedMacros;

          return (
            <Card
              key={diet.id}
              className={cn(
                "transition-all duration-300 cursor-pointer overflow-hidden border-border/60",
                selected ? "bg-success/5 border-success/30 ring-1 ring-success/20" : "hover:border-primary/30"
              )}
              onClick={() => handleCardClick(diet)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
                    selected ? "bg-success text-success-foreground scale-110" : "bg-muted/50 text-muted-foreground"
                  )}>
                    {selected ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Utensils className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-tighter">
                        {mealTypeLabel(t, diet.category)}
                      </span>
                      {isAdjusted && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-success/10 text-success uppercase tracking-tighter">
                          Ajustado
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground truncate text-sm">{diet.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                      {displayMacros.calories} kcal • P: {displayMacros.protein}g • C: {displayMacros.carbs}g • G: {displayMacros.fat}g
                    </p>
                  </div>

                  <ChevronRight className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-300",
                    selected ? "text-success rotate-90" : "text-muted-foreground opacity-50"
                  )} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modalDish && (
        <ConsumptionModal
          isOpen={!!modalDish}
          onClose={() => setModalDish(null)}
          onConfirm={handleModalConfirm}
          dish={modalDish}
        />
      )}

      {/* Shared Diet Drawer */}
      <QuickDietDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        diets={diets}
      />
    </div>
  );
}
