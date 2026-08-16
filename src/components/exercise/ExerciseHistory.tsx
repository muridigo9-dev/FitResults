"use client";

import { format } from "date-fns";
import { Calendar, TrendingUp, RotateCcw, Dumbbell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from "recharts";
import { useDateLocale } from "@/lib/dateLocale";
import { useI18n } from "@/hooks/useI18n";

interface ExerciseHistoryProps {
    exerciseId?: string;
    exerciseName?: string;
    className?: string;
    trigger?: React.ReactNode;
}

export function ExerciseHistory({
    exerciseId,
    exerciseName,
    className,
    trigger
}: ExerciseHistoryProps) {
    const dateLocale = useDateLocale();
    const { t } = useI18n();
    const { data: history, isLoading } = useExerciseHistory(exerciseId);

    // Prepare chart data
    const chartData = (history || [])
        .slice()
        .reverse()
        .map((session: any) => {
            const date = session.completedAt || session.session?.startedAt;
            // Get max weight for this session
            const maxWeight = Math.max(...(session.sets?.map((s: any) => s.actualWeightKg || 0) || [0]));
            return {
                date: date ? format(new Date(date), "dd/MM") : "",
                weight: maxWeight,
                fullDate: date // for tooltip
            };
        })
        .filter((d: any) => d.weight > 0); // Only chart sessions with weight

    return (
        <Sheet>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className={className}>
                        <RotateCcw className="h-5 w-5" />
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-xl sm:h-full sm:rounded-none sm:max-w-md z-[155] flex flex-col">
                <SheetHeader className="mb-2 text-left shrink-0">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Evolução
                    </SheetTitle>
                    {exerciseName && (
                        <p className="text-sm text-muted-foreground">{exerciseName}</p>
                    )}
                </SheetHeader>

                {/* Chart */}
                {chartData.length > 1 && (
                    <div className="h-[150px] w-full mb-4 px-1 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    cursor={false}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2 shadow-sm">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[0.60rem] uppercase text-muted-foreground mb-1">
                                                            {payload[0].payload.date}
                                                        </span>
                                                        <span className="font-bold text-xl text-primary">
                                                            {payload[0].value}kg
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="hsl(var(--primary))"
                                    fillOpacity={1}
                                    fill="url(#colorWeight)"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <ScrollArea className="flex-1 -mr-4 pr-4">
                    <div className="space-y-6">
                        {(!history || history.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <RotateCcw className="h-12 w-12 mb-4 opacity-20" />
                                <p>{t("exercises.history.empty")}</p>
                                <p className="text-xs mt-2">{t("exercises.history.emptyHint")}</p>
                            </div>
                        )}
                        {history && history.map((session: any) => {
                            // Calculate summary stats for the session
                            const totalReps = session.sets?.reduce((acc: number, s: any) => acc + (s.actualReps || 0), 0) || 0;
                            const maxWeight = Math.max(...(session.sets?.map((s: any) => s.actualWeightKg || 0) || [0]));
                            const firstWeight = session.sets?.[0]?.actualWeightKg || 0;
                            const isBodyweightSession = maxWeight === 0;

                            // Title Logic
                            const workoutTitle = session.session?.workout?.title ||
                                (session.session?.metadata?.exercise_name
                                    ? t("exercises.history.individualExecution")
                                    : t("exercises.history.freeWorkout"));

                            return (
                                <div key={session.id} className="relative pl-6 pb-2 border-l border-border last:border-0 opacity-0 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationFillMode: 'forwards' }}>
                                    {/* Timeline dot */}
                                    <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />

                                    <div className="space-y-3 mb-6">
                                        {/* Header */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-foreground">
                                                    {workoutTitle}
                                                </span>
                                                {/* Weight Summary (Last recorded or Max) */}
                                                {!isBodyweightSession && (
                                                    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px] h-5 gap-1">
                                                        <Dumbbell className="h-3 w-3" />
                                                        <span>Máx: {maxWeight}kg</span>
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {(session.completedAt || session.session?.startedAt)
                                                    ? format(new Date(session.completedAt || session.session?.startedAt), "PPP", { locale: dateLocale })
                                                    : t("exercises.history.unknownDate")
                                                }
                                            </span>
                                        </div>

                                        {/* Sets Grid */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {session.sets
                                                ?.sort((a: any, b: any) => a.setNumber - b.setNumber)
                                                .map((set: any) => (
                                                    <div
                                                        key={set.id}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-2 rounded-md border bg-card text-center transition-colors hover:border-primary/50",
                                                            set.isCompleted ? "border-border" : "border-destructive/30 bg-destructive/5 opacity-60"
                                                        )}
                                                    >
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                                            Set {set.setNumber}
                                                        </span>

                                                        <div className="flex flex-col leading-tight">
                                                            <div className="font-bold text-sm text-foreground">
                                                                {set.actualReps !== null && set.actualReps !== undefined ? set.actualReps : "-"}
                                                            </div>
                                                            {set.actualWeightKg > 0 && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {set.actualWeightKg}kg
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
