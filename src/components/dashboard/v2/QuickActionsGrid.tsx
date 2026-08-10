import { Droplets, Utensils, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
    onClick: () => void;
    delay: number;
}

interface QuickActionsGridProps {
    onLogWater: () => void;
    onLogMeal: () => void;
    onLogWorkout: () => void;
    showWater?: boolean;
    showDiets?: boolean;
    showTraining?: boolean;
}

export function QuickActionsGrid({
    onLogWater,
    onLogMeal,
    onLogWorkout,
    showWater = true,
    showDiets = true,
    showTraining = true
}: QuickActionsGridProps) {
    const { t } = useI18n();

    const visibleCount = [showWater, showDiets, showTraining].filter(Boolean).length;

    if (visibleCount === 0) return null;

    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3"
    }[visibleCount as 1 | 2 | 3] || "grid-cols-3";

    return (
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">{t("dashboard.quickActions")}</h3>
            <div className={`grid ${gridCols} gap-2`}>
                {showWater && (
                    <QuickActionButton
                        icon={Droplets}
                        label={t("dashboard.water")}
                        color="bg-blue-500"
                        onClick={onLogWater}
                        delay={0.1}
                    />
                )}
                {showDiets && (
                    <QuickActionButton
                        icon={Utensils}
                        label={t("dashboard.meal")}
                        color="bg-green-500"
                        onClick={onLogMeal}
                        delay={0.2}
                    />
                )}
                {showTraining && (
                    <QuickActionButton
                        icon={Dumbbell}
                        label={t("dashboard.workout")}
                        color="bg-red-500"
                        onClick={onLogWorkout}
                        delay={0.3}
                    />
                )}
            </div>
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, color, onClick, delay }: QuickActionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileTap={{ scale: 0.95 }}
            className="h-full"
        >
            <button
                onClick={onClick}
                className={`w-full h-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all shadow-sm group active:scale-95`}
            >
                <div className={`p-3 rounded-full ${color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-xs text-foreground/90 text-center leading-tight line-clamp-1">
                    {label}
                </span>
            </button>
        </motion.div>
    );
}
