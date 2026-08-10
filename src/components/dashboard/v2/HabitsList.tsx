import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface HabitItemProps {
    label: string;
    count: number;
    total: number;
    unit?: string;
    color: string;
}

function HabitItem({ label, count, total, unit, color }: HabitItemProps) {
    const isComplete = count >= total;
    const progress = Math.min(100, (count / total) * 100);

    return (
        <div className="flex items-center gap-4 py-4 border-b last:border-0 border-border/50">
            {/* Left: Icon */}
            <div className={cn("h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors shadow-sm",
                isComplete ? `${color} text-white shadow-lg shadow-black/10` : "bg-muted/50 text-muted-foreground"
            )}>
                {isComplete ? <Check className="w-5 h-5 stroke-[3px]" /> : <Circle className="w-5 h-5" />}
            </div>

            {/* Middle: Content & Progress */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-foreground/90 tracking-tight">{label}</p>
                    <div className="flex items-baseline gap-0.5">
                        <span className={cn("font-black text-base", isComplete ? "text-primary" : "text-foreground")}>
                            {count}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-tighter">/ {total} {unit}</span>
                    </div>
                </div>

                <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/5 relative">
                    {/* Shadow for depth */}
                    <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] rounded-full pb-safe" />
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full transition-all duration-700 rounded-full shadow-sm", isComplete ? "bg-primary" : color)}
                    />
                </div>
            </div>
        </div>
    );
}

interface HabitsListProps {
    water: { current: number; total: number }; // L
    meals: { current: number; total: number };
    workouts: { current: number; total: number };
    showWater?: boolean;
    showMeals?: boolean;
    showWorkouts?: boolean;
}

export function HabitsList({
    water,
    meals,
    workouts,
    showWater = true,
    showMeals = true,
    showWorkouts = true
}: HabitsListProps) {
    const { t } = useI18n();
    const visibleCount = [showWater, showMeals, showWorkouts].filter(Boolean).length;

    if (visibleCount === 0) return null;

    return (
        <div className="bg-card rounded-2xl border p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("dashboard.todaysHabits")}</h3>
            <div>
                {showWater && (
                    <HabitItem
                        label={t("dashboard.water")}
                        count={Number(water.current.toFixed(1))}
                        total={water.total}
                        unit="L"
                        color="bg-blue-500"
                    />
                )}
                {showMeals && (
                    <HabitItem
                        label={t("dashboard.meals")}
                        count={meals.current}
                        total={meals.total}
                        color="bg-green-500"
                    />
                )}
                {showWorkouts && (
                    <HabitItem
                        label={t("dashboard.workout")}
                        count={workouts.current}
                        total={workouts.total}
                        color="bg-red-500"
                    />
                )}
            </div>
        </div>
    );
}
