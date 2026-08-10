import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { RotateCcw, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/useI18n";

interface GoalsConfigDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GoalsConfigDrawer({ open, onOpenChange }: GoalsConfigDrawerProps) {
    const isMobile = useIsMobile();
    const { t } = useI18n();
    const {
        waterGoal,
        mealsGoal,
        calorieGoal,
        macroDistribution,
        setWaterGoal,
        setMealsGoal,
        setCalorieGoal,
        setMacroDistribution,
        workoutsGoal,
        setWorkoutsGoal
    } = useDashboardPreferences();

    // Using context just to get suggestions
    const { calorieTarget } = useUserMetrics();

    const [localWater, setLocalWater] = useState(waterGoal / 1000);
    const [localMeals, setLocalMeals] = useState(mealsGoal);
    const [localWorkouts, setLocalWorkouts] = useState(workoutsGoal);
    const [localCalories, setLocalCalories] = useState(calorieGoal || 2000);

    // Macro Distribution: [proteinPct, proteinPct + carbsPct]
    const [macroValues, setMacroValues] = useState([macroDistribution.protein, macroDistribution.protein + macroDistribution.carbs]);

    useEffect(() => {
        if (open) {
            setLocalWater(waterGoal / 1000);
            setLocalMeals(mealsGoal);
            setLocalWorkouts(workoutsGoal);
            setLocalCalories(Math.round(calorieGoal || calorieTarget?.tdee || 2000));
            setMacroValues([macroDistribution.protein, macroDistribution.protein + macroDistribution.carbs]);
        }
    }, [open, waterGoal, mealsGoal, workoutsGoal, calorieGoal, calorieTarget, macroDistribution]);

    const protein = macroValues[0];
    const carbs = macroValues[1] - macroValues[0];
    const fat = 100 - macroValues[1];

    const handleSave = () => {
        setWaterGoal(localWater * 1000);
        setMealsGoal(localMeals);
        setWorkoutsGoal(localWorkouts);
        setCalorieGoal(localCalories);
        setMacroDistribution({
            protein,
            carbs,
            fat
        });
        onOpenChange(false);
    };

    const handleRestoreSuggestions = () => {
        if (calorieTarget?.tdee) setLocalCalories(Math.round(calorieTarget.tdee));
        setMacroValues([30, 70]); // Reset to 30/40/30
    };

    const renderContent = () => (
        <div className="p-4 space-y-8">
            {/* Water Section */}
            <div className="space-y-3">
                <Label className="text-base">{t("goals.waterMeta")}</Label>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalWater(Math.max(0.5, Number((localWater - 0.1).toFixed(1))))}
                    >-</Button>
                    <div className="flex-1 text-center font-bold text-2xl">
                        {localWater.toFixed(1)} L
                    </div>
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalWater(Number((localWater + 0.1).toFixed(1)))}
                    >+</Button>
                </div>
            </div>

            {/* Meals Section */}
            <div className="space-y-3">
                <Label className="text-base">{t("goals.mealsPerDay")}</Label>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalMeals(Math.max(1, localMeals - 1))}
                    >-</Button>
                    <div className="flex-1 text-center font-bold text-2xl">
                        {localMeals}
                    </div>
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalMeals(localMeals + 1)}
                    >+</Button>
                </div>
            </div>

            {/* Workouts Section */}
            <div className="space-y-3">
                <Label className="text-base">{t("goals.workoutsPerWeek")}</Label>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalWorkouts(Math.max(1, localWorkouts - 1))}
                    >-</Button>
                    <div className="flex-1 text-center font-bold text-2xl">
                        {localWorkouts}
                    </div>
                    <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                        onClick={() => setLocalWorkouts(Math.min(7, localWorkouts + 1))}
                    >+</Button>
                </div>
            </div>

            {/* Calories Section */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <Label className="text-base">{t("goals.calorieGoal")}</Label>
                    <Button variant="ghost" size="sm" onClick={handleRestoreSuggestions} className="h-6 text-xs text-primary">
                        <RotateCcw className="w-3 h-3 mr-1" /> {t("goals.suggestion")}
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("goals.daily")}</span>
                        <span className="font-black text-lg">{localCalories} kcal</span>
                    </div>
                    <Slider
                        value={[localCalories]}
                        min={1200}
                        max={4500}
                        step={50}
                        onValueChange={(val) => setLocalCalories(val[0])}
                        className="py-4"
                    />
                </div>

                {/* Macro Balancer Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-sm">{t("goals.macroDistribution")}</Label>
                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t("goals.dragToBalance")}</span>
                    </div>

                    <div className="space-y-6">
                        <div className="relative h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-muted">
                            <div style={{ width: `${protein}%` }} className="h-full bg-red-500 transition-all duration-300" />
                            <div style={{ width: `${carbs}%` }} className="h-full bg-green-500 transition-all duration-300" />
                            <div style={{ width: `${fat}%` }} className="h-full bg-yellow-500 transition-all duration-300" />
                        </div>

                        <Slider
                            value={macroValues}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={setMacroValues}
                            className="py-2"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-center relative">
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            </span>
                            <span className="block font-black text-red-500 text-sm">{Math.round(localCalories * protein / 100 / 4)}g</span>
                            <span className="text-[10px] text-red-600/70 font-bold uppercase">{protein}% {t("nutrition.protein")}</span>
                        </div>
                        <div className="bg-green-500/10 p-2.5 rounded-xl border border-green-500/20 text-center relative">
                            <span className="block font-black text-green-500 text-sm">{Math.round(localCalories * carbs / 100 / 4)}g</span>
                            <span className="text-[10px] text-green-600/70 font-bold uppercase">{carbs}% {t("nutrition.carbs")}</span>
                        </div>
                        <div className="bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20 text-center relative">
                            <span className="block font-black text-yellow-500 text-sm">{Math.round(localCalories * fat / 100 / 9)}g</span>
                            <span className="text-[10px] text-yellow-600/70 font-bold uppercase">{fat}% {t("nutrition.fat")}</span>
                        </div>
                    </div>

                    {protein < 15 && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-amber-600 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" />
                            {t("goals.lowProteinWarning")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <DrawerHeader>
                            <DrawerTitle>{t("goals.configTitle")}</DrawerTitle>
                            <DrawerDescription>{t("goals.configDescription")}</DrawerDescription>
                        </DrawerHeader>

                        {renderContent()}

                        <DrawerFooter className="pb-8">
                            <Button onClick={handleSave} className="h-14 rounded-2xl text-base font-black shadow-lg bg-primary hover:bg-primary/90">
                                {t("goals.saveChanges")}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="ghost" className="h-10 font-bold">{t("actions.cancel")}</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none bg-background/60 backdrop-blur-xl shadow-2xl">
                <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl font-black">{t("goals.configTitle")}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">{t("goals.configDescription")}</DialogDescription>
                    </DialogHeader>

                    {renderContent()}

                    <DialogFooter className="p-6 bg-muted/30 flex flex-row gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 font-bold">
                            {t("actions.cancel")}
                        </Button>
                        <Button onClick={handleSave} className="flex-[2] h-12 rounded-xl text-base font-black shadow-lg bg-primary hover:bg-primary/90 shadow-primary/20">
                            {t("goals.saveChanges")}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
