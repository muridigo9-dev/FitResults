import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { Diet } from "@/types/content";
import { useSmartPortions } from "@/hooks/useSmartPortions";
import { useI18n } from "@/hooks/useI18n";

interface ConsumptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (consumedMacros: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    }) => void;
    dish: Diet;
}

export function ConsumptionModal({ isOpen, onClose, onConfirm, dish }: ConsumptionModalProps) {
    const { t } = useI18n();
    const { suggestedMacros, multiplier: smartMultiplier, isSmart } = useSmartPortions(dish);

    // Local state for adjustment (percentage of the reference portion)
    // If smart portions is active, 100% means the SUGGESTED portion.
    // We allow user to go from 0% to 200%.
    const [percentage, setPercentage] = useState(100);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setPercentage(100);
        }
    }, [isOpen]);

    // Base macros to work from (smart or original)
    const baseMacros = isSmart ? suggestedMacros : dish.macros;

    // Calculate final numbers based on slider
    const finalMacros = {
        calories: Math.round(baseMacros.calories * (percentage / 100)),
        protein: Math.round(baseMacros.protein * (percentage / 100)),
        carbs: Math.round(baseMacros.carbs * (percentage / 100)),
        fat: Math.round(baseMacros.fat * (percentage / 100)),
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("nutrition.consumption.title")}</DialogTitle>
                    <DialogDescription>
                        {t("nutrition.consumption.question")} <span className="font-semibold text-foreground">{dish.title}</span>?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Status Badge */}
                    <div className="flex justify-center">
                        <Badge variant={isSmart ? "default" : "secondary"} className="text-sm px-3 py-1">
                            {isSmart ? t("nutrition.consumption.smartPortion") : t("nutrition.consumption.standardPortion")}
                        </Badge>
                    </div>

                    {/* Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm text-muted-foreground">{t("nutrition.consumption.less")}</span>
                            <span className="font-bold text-2xl text-primary">{percentage}%</span>
                            <span className="text-sm text-muted-foreground">{t("nutrition.consumption.more")}</span>
                        </div>
                        <Slider
                            value={[percentage]}
                            min={0}
                            max={200}
                            step={10}
                            onValueChange={(val) => setPercentage(val[0])}
                            className="py-2"
                        />
                        <p className="text-center text-xs text-muted-foreground">
                            {t("nutrition.consumption.adjustHint")}
                        </p>
                    </div>

                    {/* Macros Preview */}
                    <div className="grid grid-cols-4 gap-2 bg-muted/30 p-4 rounded-lg">
                        <MacroDisplay icon={Flame} value={finalMacros.calories} label="kcal" color="text-orange-500" />
                        <MacroDisplay icon={Beef} value={finalMacros.protein} label="P" color="text-red-500" />
                        <MacroDisplay icon={Wheat} value={finalMacros.carbs} label="C" color="text-amber-500" />
                        <MacroDisplay icon={Droplets} value={finalMacros.fat} label="G" color="text-blue-500" />
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                        {t("actions.cancel")}
                    </Button>
                    <Button onClick={() => onConfirm(finalMacros)} className="flex-1 sm:flex-none">
                        {t("nutrition.consumption.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MacroDisplay({ icon: Icon, value, label, color }: any) {
    return (
        <div className="flex flex-col items-center">
            <Icon className={`h-4 w-4 mb-1 ${color}`} />
            <span className="font-bold text-sm">{value}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
        </div>
    );
}
