import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDailySummary } from "@/hooks/useDailySummary";
import { DateNavigator } from "@/components/daily-summary/DateNavigator";
import { GamificationCard } from "@/components/daily-summary/GamificationCard";
import { WorkoutsCard } from "@/components/daily-summary/WorkoutsCard";
import { NutritionCard } from "@/components/daily-summary/NutritionCard";

import { WaterCard } from "@/components/daily-summary/WaterCard";
import { QuickWaterDrawer } from "@/components/dashboard/v2/QuickWaterDrawer";
import { useCheckin } from "@/hooks/useCheckin";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Quote, Heart, Scale, Calendar, TrendingUp, Filter } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMoodEmoji } from "@/lib/moodHelpers";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
    WaterChart,
    WorkoutsChart,
    WeightChart,
    CaloriesChart,
} from "@/components/progress";
import { useProgress } from "@/hooks/useProgress";
import { useWeeklySummary } from "@/hooks/useWeeklySummary";
import { useMonthlySummary } from "@/hooks/useMonthlySummary";
import { useYearlySummary } from "@/hooks/useYearlySummary";
import { PeriodicReportCard as WeeklyReportCard } from "@/components/daily-summary/WeeklyReportCard";

type Period = "day" | "week" | "month" | "year";

export default function DailySummary() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [period, setPeriod] = useState<Period>("day");

    const { data: dailyData, isLoading: isLoadingDaily, error: dailyError, isRefetching } = useDailySummary(selectedDate);
    const {
        weeklyWater,
        weeklyWorkouts,
        weeklyWeight,
        isLoading: isLoadingWeekly
    } = useProgress(period !== "day");

    const {
        data: weeklySummary,
        isLoading: isLoadingWeeklySummary
    } = useWeeklySummary(selectedDate);

    const {
        data: monthlySummary,
        isLoading: isLoadingMonthlySummary
    } = useMonthlySummary(selectedDate);

    const {
        data: yearlySummary,
        isLoading: isLoadingYearlySummary
    } = useYearlySummary(selectedDate);

    const [isWaterDrawerOpen, setIsWaterDrawerOpen] = useState(false);
    const { updateWater, logAction } = useCheckin();
    const { isEnabled: waterTrackingEnabled } = useFeatureFlag("water_tracking");

    const handleDragEnd = (_: any, info: any) => {
        if (period !== "day") return;
        const swipeThreshold = 50;
        if (info.offset.x > swipeThreshold) {
            setSelectedDate(prev => subDays(prev, 1));
        } else if (info.offset.x < -swipeThreshold) {
            setSelectedDate(prev => addDays(prev, 1));
        }
    };

    const renderDailyContent = () => {
        if (isLoadingDaily) {
            return (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            );
        }

        if (dailyError) {
            return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>
                        Não foi possível carregar o resumo desse dia. Tente novamente mais tarde.
                    </AlertDescription>
                </Alert>
            );
        }

        if (!dailyData) return null;

        const { visibility, checkin } = dailyData;

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedDate.toISOString()}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={isRefetching ? "opacity-60 space-y-4" : "space-y-4"}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                >
                    {/* Note/Mood Card from Checkin */}
                    {checkin && (checkin.notes || checkin.mood) && (
                        <Card className="border-primary/10 bg-muted/20">
                            <CardContent className="p-4 py-3 flex items-start gap-4">
                                <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Quote className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    {checkin.mood && (
                                        <div className="mb-2">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sentimento do dia</span>
                                            </div>
                                            <p className="text-2xl">{getMoodEmoji(checkin.mood)}</p>
                                        </div>
                                    )}
                                    {checkin.notes && <p className="text-sm italic text-foreground/80">"{checkin.notes}"</p>}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Weight Card */}
                    {checkin && checkin.weight && (
                        <Card className="border-emerald-500/10 bg-emerald-500/5">
                            <CardContent className="p-4 py-3 flex items-start gap-4">
                                <div className="mt-1 h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <Scale className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Scale className="h-3 w-3 text-emerald-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso registrado</span>
                                    </div>
                                    <p className="text-lg font-bold text-foreground">{checkin.weight} kg</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Health Metrics (Always visible if data exists) */}
                    {dailyData.bodyProfile && (
                        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
                            <div className="bg-primary/10 px-4 py-2 border-b border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Perfil de Saúde</h3>
                                </div>
                                <Link to="/profile" className="text-[10px] font-bold text-primary hover:underline">Editar</Link>
                            </div>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Altura</p>
                                        <p className="text-sm font-black">{dailyData.bodyProfile.height} cm</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Nível de Atividade</p>
                                        <p className="text-sm font-black capitalize">
                                            {dailyData.bodyProfile.activity_level === 'moderate' ? 'Moderado' :
                                                dailyData.bodyProfile.activity_level === 'active' ? 'Ativo' :
                                                    dailyData.bodyProfile.activity_level === 'sedentary' ? 'Sedentário' :
                                                        dailyData.bodyProfile.activity_level === 'light' ? 'Leve' : 'Muito Ativo'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Objetivo</p>
                                        <p className="text-sm font-black capitalize">
                                            {dailyData.bodyProfile.fitness_goal === 'maintain' ? 'Manter' :
                                                dailyData.bodyProfile.fitness_goal === 'lose_weight' ? 'Emagrecer' :
                                                    dailyData.bodyProfile.fitness_goal === 'gain_muscle' ? 'Hipertrofia' : 'Saúde'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Peso Objetivo</p>
                                        <p className="text-sm font-black">{dailyData.bodyProfile.goal_weight} kg</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Gamification Section */}
                    {visibility.showGamification && (
                        <GamificationCard data={dailyData.gamification} />
                    )}

                    {/* Training Section */}
                    {visibility.showWorkouts && (
                        <WorkoutsCard data={dailyData.workouts} />
                    )}

                    {/* Water Section */}
                    {checkin && waterTrackingEnabled && (
                        <>
                            <WaterCard
                                current={checkin.water_current || 0}
                                goal={checkin.water_goal || 2000}
                                onAddClick={() => setIsWaterDrawerOpen(true)}
                            />

                            <QuickWaterDrawer
                                open={isWaterDrawerOpen}
                                onOpenChange={setIsWaterDrawerOpen}
                                current={checkin?.water_current || 0}
                                goal={checkin?.water_goal || 2000}
                                onUpdate={(amount) => {
                                    updateWater(amount);
                                    logAction({
                                        type: "water",
                                        value: {
                                            current: (checkin?.water_current || 0) + amount,
                                            goal: checkin?.water_goal || 2000
                                        }
                                    });
                                }}
                            />
                        </>
                    )}

                    {/* Nutrition Section */}
                    {visibility.showNutrition && (
                        <NutritionCard data={dailyData.nutrition} />
                    )}




                    {/* Challenges Section */}
                    {visibility.showChallenges && dailyData.challenges.length > 0 && (
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Desafios Ativos</h3>
                                <div className="space-y-3">
                                    {dailyData.challenges.map((challenge: any) => (
                                        <div key={challenge.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/20 border border-border/50">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold">{challenge.name}</span>
                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                                    Dia {challenge.currentDay}/{challenge.totalDays}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${(challenge.currentDay / challenge.totalDays) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State Footer */}
                    {!visibility.showWorkouts && !visibility.showNutrition && (
                        <div className="py-12 text-center flex flex-col items-center">
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-muted-foreground font-medium">Nenhum dado visível para este dia.</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        );
    };

    const renderPeriodicContent = () => {
        const isLoading = period === "week"
            ? (isLoadingWeekly || isLoadingWeeklySummary)
            : period === "month"
                ? (isLoadingMonthlySummary)
                : (isLoadingYearlySummary);

        if (isLoading) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            );
        }

        const currentData = period === "week"
            ? weeklySummary?.current_week
            : period === "month"
                ? monthlySummary?.current_month
                : yearlySummary?.current_year;

        const currentTargets = period === "week"
            ? weeklySummary?.targets
            : period === "month"
                ? monthlySummary?.targets
                : yearlySummary?.targets;

        const previousTotals = period === "week"
            ? weeklySummary?.previous_week.totals
            : period === "month"
                ? monthlySummary?.previous_month.totals
                : yearlySummary?.previous_year.totals;

        const isYearly = period === "year";
        const breakdownData = isYearly ? yearlySummary?.current_year.monthly_breakdown : (currentData as any)?.daily;

        const mappedWaterData = breakdownData?.map((d: any) => ({
            day: format(new Date(d.date), isYearly ? "MMM" : (period === "month" ? "dd" : "EEE"), { locale: ptBR }),
            consumed: isYearly ? d.water / (1000 * 30) : d.water / 1000,
            goal: ((currentTargets as any).water_ml / (period === "week" ? 7 : (breakdownData?.length || 30))) / 1000
        })) || [];

        const mappedWorkoutsData = breakdownData?.map((d: any) => ({
            day: format(new Date(d.date), isYearly ? "MMM" : "EEE", { locale: ptBR }),
            sessions: d.workouts
        })) || [];

        const mappedCaloriesData = breakdownData?.map((d: any) => ({
            day: format(new Date(d.date), isYearly ? "MMM" : "EEE", { locale: ptBR }),
            value: isYearly ? d.calories / 30 : d.calories,
            goal: (currentTargets as any).calories / (period === "week" ? 7 : (breakdownData?.length || 30))
        })) || [];

        const mappedWeightData = breakdownData?.map((d: any) => ({
            day: format(new Date(d.date), isYearly ? "MMM" : (period === "month" ? "dd" : "EEE"), { locale: ptBR }),
            date: d.date,
            weight: d.weight
        })) || [];

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {(period === "week" || period === "month" || period === "year") && currentData && (
                    <WeeklyReportCard
                        current={(currentData as any).totals}
                        previous={previousTotals}
                        targets={currentTargets}
                        period={period}
                    />
                )}

                <div className="space-y-4">
                    {(period === "week" || period === "month" || period === "year") ? (
                        <div className="grid gap-4">
                            {/* Calories Chart */}
                            <CaloriesChart data={mappedCaloriesData} isLoading={false} period={period} />

                            {/* Water Chart */}
                            {waterTrackingEnabled && (
                                <WaterChart data={mappedWaterData} isLoading={false} period={period} />
                            )}

                            {/* Workouts Chart */}
                            <WorkoutsChart data={mappedWorkoutsData} isLoading={false} period={period} />

                            {/* Weight Chart */}
                            {mappedWeightData.some((w: any) => w.weight !== null) && (
                                <WeightChart data={mappedWeightData} isLoading={false} period={period} />
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center">
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Calendar className="h-8 w-8 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-muted-foreground font-medium">Dados de dia em breve.</p>
                            <p className="text-xs text-muted-foreground mt-1">Estamos preparando visualizações incríveis para você!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppLayout
            header={{
                title: "Evolução",
                showBack: true,
            }}
        >
            <div className="pb-24 overflow-hidden min-h-screen">
                <div className="px-4 sticky top-0 z-10 bg-background/95 backdrop-blur-md pt-3 pb-4 border-b border-border/10">
                    <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-2xl h-12">
                            <TabsTrigger value="day" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Dia</TabsTrigger>
                            <TabsTrigger value="week" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Semana</TabsTrigger>
                            <TabsTrigger value="month" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Mês</TabsTrigger>
                            <TabsTrigger value="year" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Ano</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="px-4">
                    <DateNavigator
                        date={selectedDate}
                        onChange={setSelectedDate}
                        period={period}
                    />
                </div>

                <div className="px-3 sm:px-4">
                    {period === "day" ? renderDailyContent() : renderPeriodicContent()}
                </div>
            </div>
        </AppLayout>
    );
}
