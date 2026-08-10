import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Droplets, Minus, Plus, Check, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/useI18n";

interface QuickWaterDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    current: number;
    goal: number;
    onUpdate: (amount: number) => void;
}

const QUICK_AMOUNTS = [
    { label: "+200ml", amount: 200 },
    { label: "+500ml", amount: 500 },
    { label: "+1L", amount: 1000 },
];

export function QuickWaterDrawer({ open, onOpenChange, current, goal, onUpdate }: QuickWaterDrawerProps) {
    const isMobile = useIsMobile();
    const { t } = useI18n();
    const [localCurrent, setLocalCurrent] = useState(current);
    const [savedFeedback, setSavedFeedback] = useState(false);

    useEffect(() => {
        if (open) {
            setLocalCurrent(current);
        }
    }, [open, current]);

    const progress = Math.min(100, Math.round((localCurrent / goal) * 100));
    const isComplete = localCurrent >= goal;
    const liters = (localCurrent / 1000).toFixed(1);
    const goalLiters = (goal / 1000).toFixed(1);

    const handleUpdate = (amount: number) => {
        const newVal = Math.max(0, localCurrent + amount);
        setLocalCurrent(newVal);
        onUpdate(amount);
        setSavedFeedback(true);
        toast.success(t("dashboard.waterLogged"), { duration: 1000 });
    };

    useEffect(() => {
        if (savedFeedback) {
            const timer = setTimeout(() => setSavedFeedback(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [savedFeedback]);

    const renderContent = () => (
        <div className="p-4 space-y-6">
            {/* Main Circle or Bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                    <div>
                        <span className="text-3xl font-bold">{liters}</span>
                        <span className="text-sm text-muted-foreground ml-1">/ {goalLiters} L</span>
                    </div>
                    <span className={cn("text-lg font-medium", isComplete ? "text-success" : "text-blue-500")}>
                        {progress}%
                    </span>
                </div>
                <Progress
                    value={progress}
                    className={cn("h-4 rounded-full", isComplete ? "bg-success/20" : "bg-blue-100")}
                    indicatorClassName={isComplete ? "bg-success" : "bg-blue-500"}
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
                {QUICK_AMOUNTS.map(({ label, amount }) => (
                    <Button
                        key={amount}
                        variant="outline"
                        className="h-12 border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all active:scale-95"
                        onClick={() => handleUpdate(amount)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            {/* Fine Tune */}
            <div className="flex items-center justify-center gap-6 pt-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80"
                    onClick={() => handleUpdate(-100)}
                    disabled={localCurrent <= 0}
                >
                    <Minus className="h-5 w-5" />
                </Button>
                <span className="text-sm text-muted-foreground font-medium">{t("dashboard.fineTune")} (100ml)</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80"
                    onClick={() => handleUpdate(100)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );

    const renderFooter = () => (
        <div className="flex flex-col gap-2 w-full">
            <Button size="lg" className="w-full font-bold" onClick={() => onOpenChange(false)}>
                {t("actions.complete") || "Concluir"}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-8 opacity-60 hover:opacity-100"
                onClick={() => {
                    if (confirm(t("dashboard.clearWaterConfirm"))) {
                        onUpdate(-current);
                        setLocalCurrent(0);
                        toast.info(t("dashboard.waterCleared"));
                    }
                }}
            >
                {t("dashboard.clearWater")}
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm pb-8">
                        <DrawerHeader>
                            <DrawerTitle className="flex items-center gap-2 justify-center">
                                <Droplets className="h-5 w-5 text-blue-500" />
                                {t("dashboard.waterLog")}
                            </DrawerTitle>
                        </DrawerHeader>

                        {renderContent()}

                        <DrawerFooter>
                            {renderFooter()}
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Droplets className="h-6 w-6 text-blue-500" />
                        {t("dashboard.waterLog")}
                    </DialogTitle>
                </DialogHeader>

                {renderContent()}

                <DialogFooter className="sm:justify-center border-t pt-4">
                    {renderFooter()}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
