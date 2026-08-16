import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Diet } from "@/types/content";
import { mealTypeLabel } from "@/lib/constants";
import { Search, Utensils, Plus, ChefHat, Flame, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { LogMealDialog } from "@/components/nutrition/LogMealDialog";
import { useI18n } from "@/hooks/useI18n";

interface QuickDietDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    diets: Diet[];
    completedMeals?: string[];
    onToggleMeal?: (dietId: string, dietName: string, mealType?: any) => void;
}

export function QuickDietDrawer({ open, onOpenChange, diets }: QuickDietDrawerProps) {
    const { t } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDietForLog, setSelectedDietForLog] = useState<Diet | null>(null);

    // Filter Logic: Name OR Ingredients
    const filteredDiets = useMemo(() => {
        if (!searchQuery) return diets;
        const lowerQ = searchQuery.toLowerCase();
        return diets.filter(d =>
            d.title.toLowerCase().includes(lowerQ) ||
            (d.ingredients || []).some(ing => ing.name?.toLowerCase().includes(lowerQ))
        );
    }, [diets, searchQuery]);

    const handleDietClick = (diet: Diet) => {
        setSelectedDietForLog(diet);
    };

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="bg-background outline-none ring-0 border-none rounded-t-[32px]">
                    <div className="sr-only">
                        <DrawerTitle>{t("nutrition.logMeal.srTitle")}</DrawerTitle>
                        <DrawerDescription>{t("nutrition.logMeal.srDescription")}</DrawerDescription>
                    </div>
                    <div className="mx-auto w-full max-w-md h-[85vh] flex flex-col">
                        <DrawerHeader className="mb-2 pb-2">
                            <div className="flex items-center justify-center gap-2 mb-6 text-xl font-black uppercase tracking-tight">
                                <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                                    <Utensils className="h-5 w-5" />
                                </div>
                                {t("nutrition.logMeal.title")}
                            </div>

                            {/* Search Bar - More Modern */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder={t("nutrition.logMeal.searchPlaceholder")}
                                    className="h-12 pl-10 bg-muted/30 border-none rounded-xl focus:bg-muted/50 transition-all font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </DrawerHeader>

                        <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 no-scrollbar">
                            {filteredDiets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground opacity-50">
                                    <ChefHat className="h-16 w-16 mb-4 stroke-[1.5]" />
                                    <p className="font-bold">{t("nutrition.logMeal.noSuggestions")}</p>
                                </div>
                            ) : (
                                filteredDiets.map((diet) => (
                                    <Card
                                        key={diet.id}
                                        className="cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] active:scale-[0.98] transition-all group overflow-hidden border-border/50 bg-card/40 rounded-2xl shadow-sm"
                                        onClick={() => handleDietClick(diet)}
                                    >
                                        <div className="flex h-24">
                                            {/* Left Image Section - Larger and better shadow */}
                                            <div className="w-24 bg-muted shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                                {diet.imageUrl ? (
                                                    <img
                                                        src={diet.imageUrl}
                                                        alt={diet.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                                                        <Utensils className="h-8 w-8 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                                            </div>

                                            {/* Content Section */}
                                            <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-between">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                                                                {mealTypeLabel(t, diet.category)}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-black text-sm leading-tight text-foreground truncate max-w-[190px]">
                                                            {diet.title}
                                                        </h4>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 -mr-1 -mt-1 text-primary rounded-xl bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all">
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-black">
                                                    <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                                                        <Flame className="h-3 w-3 fill-orange-500" />
                                                        <span>{diet.macros.calories} <span className="text-[8px] font-normal uppercase opacity-70">kcal</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-80">
                                                        <div className="w-1 h-1 rounded-full bg-border" />
                                                        <span className="truncate">
                                                            {t("nutrition.logMeal.itemCount", { count: diet.ingredients?.length || 0 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>

                        <DrawerFooter className="pt-4 border-t border-border/40 bg-background/95 backdrop-blur-xl pb-10 px-4">
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs border-2 hover:bg-muted/50 transition-all">
                                    {t("nutrition.logMeal.closeList")}
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Log Dialog Integration */}
            {selectedDietForLog && (
                <LogMealDialog
                    isOpen={!!selectedDietForLog}
                    onClose={() => setSelectedDietForLog(null)}
                    recipe={{
                        ...selectedDietForLog,
                        calories: selectedDietForLog.macros.calories,
                        protein: selectedDietForLog.macros.protein,
                        carbs: selectedDietForLog.macros.carbs,
                        fat: selectedDietForLog.macros.fat,
                    } as any}
                    initialPortion={1}
                />
            )}
        </>
    );
}
