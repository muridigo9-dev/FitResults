import { TrendingUp, TrendingDown, Zap, Droplets, Utensils, Scale, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatItemProps {
    label: string;
    value: string | number;
    target: number;
    unit?: string;
    icon: any;
    color: string;
    comparison?: {
        value: number;
        label: string;
        isGood: boolean;
    };
    weightData?: {
        goal: number | null;
        initial: number | null;
        current: number | null;
    };
}

function StatItem({ label, value, target, unit, icon: Icon, color, comparison, weightData }: StatItemProps) {
    const isWeight = label === "Peso";

    const progress = !target || target === 0
        ? 0
        : isWeight && weightData?.goal && weightData?.initial
            ? Math.min(100, Math.max(0,
                ((weightData.initial - (weightData.current || weightData.initial)) /
                    (weightData.initial - weightData.goal)) * 100
            ))
            : Math.min(100, (Number(value) / target) * 100);

    const isComplete = progress >= 100;

    const renderComparison = () => {
        if (!comparison || comparison.value === 0) return null;

        const isPositive = comparison.value > 0;
        const IconComp = isPositive ? TrendingUp : TrendingDown;
        const colorClass = comparison.isGood ? (isPositive ? "text-green-500" : "text-orange-500") : (isPositive ? "text-orange-500" : "text-green-500");

        return (
            <div className={cn("flex items-center gap-0.5 text-[9px] font-black shrink-0", colorClass)}>
                <IconComp className="h-2.5 w-2.5" />
                {Math.abs(Math.round(comparison.value))}%
            </div>
        );
    };

    return (
        <div className="bg-muted/20 p-3 sm:p-4 rounded-2xl border border-border/50 flex flex-col gap-2 sm:gap-3 relative overflow-hidden group min-w-0">
            {isComplete && !isWeight && (
                <div className="absolute -top-1 -right-1 p-2 bg-primary/20 rounded-bl-2xl">
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-bounce" />
                </div>
            )}

            <div className="flex items-center justify-between gap-1">
                <div className={cn("p-1.5 sm:p-2 rounded-xl border shrink-0", color)}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="text-right overflow-hidden">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block leading-none mb-1 truncate">{label}</span>
                    {renderComparison()}
                </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-baseline justify-between gap-1 overflow-hidden">
                    <div className="flex items-baseline gap-1 min-w-0">
                        <span className="text-lg sm:text-xl font-black truncate">{value}</span>
                        {unit && <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase shrink-0">{unit}</span>}
                    </div>
                    {!isWeight && (
                        <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground truncate opacity-70">
                            / {Math.round(target)}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="h-1 sm:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-1000 ease-out rounded-full",
                                isComplete ? "bg-primary" : (color.split(' ').find(c => c.startsWith('text-'))?.replace('text-', 'bg-') || "bg-primary")
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-black uppercase tracking-tighter">
                        <span className={cn(isComplete ? "text-primary" : "text-muted-foreground", "truncate")}>
                            {Math.round(progress)}% DA META
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PeriodicReportCardProps {
    current: any;
    previous: any;
    targets: any;
    period: "week" | "month" | "year";
}

export function PeriodicReportCard({ current, previous, targets, period }: PeriodicReportCardProps) {
    const isMonthly = period === "month";
    const isYearly = period === "year";

    const calcDiff = (curr: number, prev: number) => {
        if (!prev || prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const proteinTarget = Math.round(((targets?.calories || 0) * (targets?.macro_protein_pct || 30) / 100) / 4) || 1;
    const carbsTarget = Math.round(((targets?.calories || 0) * (targets?.macro_carbs_pct || 40) / 100) / 4) || 1;
    const fatTarget = Math.round(((targets?.calories || 0) * (targets?.macro_fat_pct || 30) / 100) / 9) || 1;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <StatItem
                    label="Calorias"
                    value={Math.round(current.calories)}
                    target={targets?.calories || 0}
                    unit="kcal"
                    icon={Utensils}
                    color="bg-orange-500/10 border-orange-500/20 text-orange-600"
                    comparison={{
                        value: calcDiff(current.calories, previous.calories),
                        label: "vs anterior",
                        isGood: false
                    }}
                />

                <StatItem
                    label="Treinos"
                    value={current.workouts}
                    target={Math.round(targets?.workouts || 0)}
                    unit="sessões"
                    icon={Zap}
                    color="bg-primary/10 border-primary/20 text-primary"
                    comparison={{
                        value: calcDiff(current.workouts, previous.workouts),
                        label: "vs anterior",
                        isGood: true
                    }}
                />

                <StatItem
                    label="Água"
                    value={(current.water_ml / 1000).toFixed(1)}
                    target={(targets?.water_ml || 0) / 1000}
                    unit="litros"
                    icon={Droplets}
                    color="bg-blue-500/10 border-blue-500/20 text-blue-600"
                    comparison={{
                        value: calcDiff(current.water_ml, previous.water_ml),
                        label: "vs anterior",
                        isGood: true
                    }}
                />

                <StatItem
                    label="Peso"
                    value={current.current_weight ? current.current_weight.toFixed(1) : (current.avg_weight ? current.avg_weight.toFixed(1) : "-")}
                    target={targets?.weight_goal || 0}
                    unit="kg"
                    icon={Scale}
                    color="bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    weightData={{
                        goal: targets?.weight_goal,
                        initial: current.initial_weight,
                        current: current.current_weight || current.avg_weight
                    }}
                    comparison={{
                        value: calcDiff(current.avg_weight || 0, previous.avg_weight || 0),
                        label: "vs anterior",
                        isGood: (current.avg_weight || 0) < (previous.avg_weight || 0)
                    }}
                />
            </div>

            <Card className="border-border/50 bg-muted/5 shadow-none overflow-hidden">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Target className="h-3 w-3" />
                        Macros ({isYearly ? "Anual" : (isMonthly ? "Mensal" : "Semanal")})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                    <MacroBar
                        label="Proteína"
                        current={current.protein}
                        target={proteinTarget}
                        color="bg-red-500"
                        cals={current.protein * 4}
                    />
                    <MacroBar
                        label="Carboidratos"
                        current={current.carbs}
                        target={carbsTarget}
                        color="bg-emerald-500"
                        cals={current.carbs * 4}
                    />
                    <MacroBar
                        label="Gorduras"
                        current={current.fat}
                        target={fatTarget}
                        color="bg-orange-500"
                        cals={current.fat * 9}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function MacroBar({ label, current, target, color, cals }: { label: string, current: number, target: number, color: string, cals: number }) {
    const progress = Math.min(100, (current / target) * 100);
    return (
        <div className="space-y-1.5 min-w-0">
            <div className="flex justify-between items-end gap-2 overflow-hidden">
                <div className="min-w-0">
                    <p className="text-base font-black truncate">{Math.round(current)}g</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Meta: {target}g</p>
                    <p className={cn("text-[9px] font-black", color.replace('bg-', 'text-'))}>{Math.round(cals)} kcal</p>
                </div>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/5 shadow-inner">
                <Progress
                    value={progress}
                    className={cn("h-full bg-muted", color.replace('bg-', 'bg-opacity-10 bg-'))}
                    indicatorClassName={color}
                />
            </div>
        </div>
    );
}
