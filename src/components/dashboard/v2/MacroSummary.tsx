import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";

interface MacroSummaryProps {
    protein: { current: number; max: number };
    carbs: { current: number; max: number };
    fats: { current: number; max: number };
    calories: { current: number; max: number };
}

export function MacroSummary({ protein, carbs, fats, calories }: MacroSummaryProps) {
    const { t } = useI18n();
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
        >
            <Card className="p-4 border-none bg-gradient-to-br from-muted/50 to-muted/10">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("dashboard.caloricSummary")}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">{Math.round(calories.current)}</span>
                            <span className="text-xs text-muted-foreground delay-100">/ {Math.round(calories.max)} kcal</span>
                        </div>
                    </div>
                    <div className="h-10 w-10">
                        {/* Mini Pie Chart placeholder or simple circle */}
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <path
                                className="text-muted"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeOpacity="0.2"
                            />
                            <path
                                className="text-primary"
                                strokeDasharray={`${Math.min(100, (calories.current / calories.max) * 100)}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                        </svg>
                    </div>
                </div>

                <div className="space-y-3">
                    <MacroBar label={t("common.protein")} color="bg-red-500" current={protein.current} max={protein.max} unit="g" />
                    <MacroBar label={t("common.carbs")} color="bg-green-500" current={carbs.current} max={carbs.max} unit="g" />
                    <MacroBar label={t("common.fats")} color="bg-yellow-500" current={fats.current} max={fats.max} unit="g" />
                </div>
            </Card>
        </motion.div>
    );
}

function MacroBar({ label, color, current, max, unit }: { label: string, color: string, current: number, max: number, unit: string }) {
    const percent = Math.min(100, (current / max) * 100);

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
                <span>{label}</span>
                <span>{Math.round(current)} / {max}{unit}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color}`}
                />
            </div>
        </div>
    );
}
