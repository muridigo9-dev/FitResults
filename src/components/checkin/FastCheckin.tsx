import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";
import {
    Flame,
    Target,
    Dumbbell,
    Utensils,
    Droplets,
    Smile,
    Scale,
    CheckCircle2,
    ChevronRight,
    Sparkles,
    PartyPopper,
    Info,
    Trophy
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DailyCheckin, MealEntry, ChallengeTaskEntry } from "@/types/checkin";
import { Diet, Workout } from "@/types/content";
import { Challenge, ChallengeDay } from "@/types/challenges";
import { Habit } from "@/hooks/useHabits";
import { cn } from "@/lib/utils";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer";
import { QuickWater } from "./QuickWater";
import { QuickMood } from "./QuickMood";
import { QuickWeight } from "./QuickWeight";
import { QuickDietDrawer } from "@/components/nutrition/LogMealDrawer";
import { QuickWorkouts } from "./QuickWorkouts";
import { QuickChallenges } from "./QuickChallenges";
import { QuickHabits } from "./QuickHabits";

interface FastCheckinProps {
    checkin: DailyCheckin;
    availableDiets: Diet[];
    availableWorkouts: Workout[];
    availableHabits: Habit[];
    habitsEnabled: boolean;
    waterTrackingEnabled?: boolean;
    activeChallenge: Challenge | null;
    currentChallengeDay: ChallengeDay | undefined;
    gamification: {
        streak: number;
        points: number;
        level: number;
    };
    completionStats: {
        mealsCompleted: number;
        mealsTotal: number;
        workoutsCompleted: number;
        workoutsTotal: number;
        tasksCompleted: number;
        tasksTotal: number;
        habitsCompleted: number;
        habitsTotal: number;
        waterProgress: number;
        hasMood: boolean;
        hasWeight: boolean;
        allGoalsComplete: boolean;
    };
    onLogAction: (action: { type: string; value: any; id?: string }) => Promise<void>;
    onToggleMeal: (dietId: string, dietName: string, mealType: MealEntry["mealType"]) => void;
    onToggleWorkout: (workoutId: string, workoutName: string) => void;
    onToggleChallengeTask: (task: ChallengeTaskEntry) => void;
    onToggleHabit: (habit: Habit) => void;
    onUpdateHabitProgress: (habitId: string, delta: number) => void;
    onUpdateWater: (amount: number) => void;
    onUpdateMood: (mood: DailyCheckin["mood"]) => void;
    onUpdateWeight: (weight: number | undefined) => void;
    onOpenSummary: () => void;
}

export function FastCheckin({
    checkin,
    availableDiets,
    availableWorkouts,
    availableHabits,
    habitsEnabled,
    waterTrackingEnabled = true,
    activeChallenge,
    currentChallengeDay,
    gamification,
    completionStats,
    onLogAction,
    onToggleMeal,
    onToggleWorkout,
    onToggleChallengeTask,
    onToggleHabit,
    onUpdateHabitProgress,
    onUpdateWater,
    onUpdateMood,
    onUpdateWeight,
    onOpenSummary,
}: FastCheckinProps) {
    const { t, language } = useI18n();
    const [isDietDrawerOpen, setIsDietDrawerOpen] = useState(false);

    const dailyProgress = useMemo(() => {
        let completed = 0;
        let total = 0;

        // Water
        if (waterTrackingEnabled) {
            total++;
            if (completionStats.waterProgress >= 100) completed++;
        }

        // Meals
        if (completionStats.mealsTotal > 0) {
            total++;
            if (completionStats.mealsCompleted >= completionStats.mealsTotal) completed++;
        }

        // Workouts
        if (completionStats.workoutsTotal > 0) {
            total++;
            if (completionStats.workoutsCompleted >= completionStats.workoutsTotal) completed++;
        }

        // Mood
        total++;
        if (completionStats.hasMood) completed++;

        return Math.round((completed / total) * 100);
    }, [completionStats]);

    const cards = [
        {
            id: "water",
            title: t("checkin.hydration"),
            icon: Droplets,
            color: "blue",
            status: `${(checkin.water.current / 1000).toFixed(1)}L / ${(checkin.water.goal / 1000).toFixed(1)}L`,
            progress: completionStats.waterProgress,
            isCompleted: completionStats.waterProgress >= 100,
            show: waterTrackingEnabled,
            component: (
                <QuickWater
                    water={checkin.water}
                    onUpdate={(amt) => {
                        onUpdateWater(amt);
                        onLogAction({ type: "water", value: { ...checkin.water, current: checkin.water.current + amt } });
                    }}
                />
            )
        },
        {
            id: "meals",
            title: t("checkin.nutrition"),
            icon: Utensils,
            color: "orange",
            status: `${completionStats.mealsCompleted} ${t("checkin.meals").toLowerCase()}`,
            progress: (completionStats.mealsCompleted / Math.max(1, completionStats.mealsTotal)) * 100,
            isCompleted: completionStats.mealsCompleted >= completionStats.mealsTotal && completionStats.mealsTotal > 0,
            onClick: () => setIsDietDrawerOpen(true)
        },
        {
            id: "workout",
            title: t("dashboard.workout"),
            icon: Dumbbell,
            color: "purple",
            status: completionStats.workoutsCompleted > 0 ? t("common.completed") : t("common.pending"),
            progress: completionStats.workoutsCompleted > 0 ? 100 : 0,
            isCompleted: completionStats.workoutsCompleted > 0,
            component: (
                <QuickWorkouts
                    workouts={availableWorkouts}
                    selectedWorkouts={checkin.workouts}
                    onToggle={(id, name) => {
                        onToggleWorkout(id, name);
                        onLogAction({ type: "workout", value: { workout_id: id, workout_source: "system", completed: true } });
                    }}
                />
            )
        },
        {
            id: "habits",
            title: t("navigation.habits"),
            icon: Target,
            color: "indigo",
            status: `${completionStats.habitsCompleted}/${completionStats.habitsTotal}`,
            progress: (completionStats.habitsCompleted / Math.max(1, completionStats.habitsTotal)) * 100,
            isCompleted: completionStats.habitsCompleted >= completionStats.habitsTotal && completionStats.habitsTotal > 0,
            show: habitsEnabled && availableHabits.length > 0,
            component: (
                <QuickHabits
                    habits={availableHabits}
                    habitEntries={checkin.habits}
                    onToggle={(h) => {
                        onToggleHabit(h);
                        onLogAction({ type: "habit", id: h.id, value: { value: 1, goal: h.default_goal } });
                    }}
                    onUpdateProgress={(id, delta) => {
                        onUpdateHabitProgress(id, delta);
                        const existing = checkin.habits.find(e => e.habitId === id);
                        onLogAction({ type: "habit", id: id, value: { value: (existing?.current || 0) + delta, goal: existing?.goal || 1 } });
                    }}
                />
            )
        },
        {
            id: "mood",
            title: t("checkin.mood"),
            icon: Smile,
            color: "pink",
            status: checkin.mood ? t(`checkin.mood.${checkin.mood}`) : t("checkin.howAreYouFeeling"),
            progress: completionStats.hasMood ? 100 : 0,
            isCompleted: completionStats.hasMood,
            component: <QuickMood selectedMood={checkin.mood} onSelect={(m) => {
                onUpdateMood(m);
                onLogAction({ type: "mood", value: m });
            }} />
        },
        {
            id: "weight",
            title: t("checkin.weight"),
            icon: Scale,
            color: "emerald",
            status: checkin.weight ? `${checkin.weight}kg` : t("checkin.register"),
            progress: completionStats.hasWeight ? 100 : 0,
            isCompleted: completionStats.hasWeight,
            component: <QuickWeight currentWeight={checkin.weight} lastWeight={checkin.lastWeight} onUpdate={(w) => {
                onUpdateWeight(w);
                onLogAction({ type: "weight", value: w });
            }} />
        },
        {
            id: "challenges",
            title: t("navigation.challenges"),
            icon: Trophy,
            color: "amber",
            status: activeChallenge ? t("checkin.activeDay", { day: currentChallengeDay?.day_number || 1 }) : t("checkin.inactive"),
            progress: (completionStats.tasksCompleted / Math.max(1, currentChallengeDay?.tasks?.length || 0)) * 100,
            isCompleted: completionStats.tasksCompleted >= (currentChallengeDay?.tasks?.length || 0) && activeChallenge !== null,
            show: !!activeChallenge,
            component: <QuickChallenges
                challenge={activeChallenge}
                currentDay={currentChallengeDay}
                completedTasks={checkin.challengeTasks}
                onToggle={(t) => {
                    onToggleChallengeTask(t);
                    onLogAction({ type: "task", value: t });
                }}
            />
        }
    ].filter(c => c.show !== false);

    return (
        <div className="space-y-6 pb-20">
            {/* Header Dinâmico */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-foreground">{t("checkin.today")}</h1>
                        <p className="text-sm text-muted-foreground font-medium">
                            {new Date().toLocaleDateString(language, { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                            <span className="text-sm font-bold text-orange-600">{gamification.streak} {t("common.days")}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t("checkin.yourConsistency")}</p>
                    </div>
                </div>

                <Card className="bg-primary/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary/80 uppercase tracking-wider">{t("checkin.dayConclusion")}</span>
                            <span className="text-lg font-black text-primary">{dailyProgress}%</span>
                        </div>
                        <Progress value={dailyProgress} className="h-3 bg-primary/10" />
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-muted-foreground font-medium">Nível {gamification.level} • {gamification.points} XP</p>
                            <button
                                onClick={onOpenSummary}
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                                {t("checkin.viewSummary")} <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid de Cards de Ação */}
            <div className="grid grid-cols-1 gap-3">
                {cards.map((card) => {
                    const CardButton = (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => card.onClick?.()}
                            className={cn(
                                "relative flex items-center gap-4 p-4 rounded-2xl border transition-all text-left w-full overflow-hidden group",
                                card.isCompleted
                                    ? "bg-muted/30 border-success/30 shadow-sm"
                                    : "bg-card border-border/60 hover:border-primary/40 shadow-sm"
                            )}
                        >
                            {/* Visual Accent */}
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
                                card.isCompleted ? "bg-success" : `bg-${card.color}-500/20`
                            )} />

                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                card.isCompleted ? "bg-success/10" : `bg-${card.color}-500/10`
                            )}>
                                <card.icon className={cn(
                                    "h-6 w-6",
                                    card.isCompleted ? "text-success" : `text-${card.color}-500`
                                )} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <h3 className="font-bold text-foreground">{card.title}</h3>
                                    {card.isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
                                </div>
                                <p className={cn(
                                    "text-xs font-bold transition-colors",
                                    card.isCompleted ? "text-success/80" : "text-muted-foreground"
                                )}>
                                    {card.status}
                                </p>
                            </div>

                            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                        </motion.button>
                    );

                    if (card.onClick) {
                        return <React.Fragment key={card.id}>{CardButton}</React.Fragment>;
                    }

                    return (
                        <Drawer key={card.id}>
                            <DrawerTrigger asChild>
                                {CardButton}
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerHeader className="text-left border-b border-border/40 pb-4">
                                    <DrawerTitle className="flex items-center gap-2 text-xl font-black">
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", `bg-${card.color}-500/10`)}>
                                            <card.icon className={cn("h-5 w-5", `text-${card.color}-500`)} />
                                        </div>
                                        {card.title}
                                    </DrawerTitle>
                                </DrawerHeader>
                                <div className="p-6">
                                    {(card as any).component}
                                </div>
                                <DrawerFooter className="pt-0">
                                    <DrawerClose asChild>
                                        <Button variant="outline" className="w-full font-bold h-12 rounded-xl">{t("common.completed")}</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </DrawerContent>
                        </Drawer>
                    );
                })}
            </div>

            {/* Alimentação Drawer (Shared) */}
            <QuickDietDrawer
                open={isDietDrawerOpen}
                onOpenChange={setIsDietDrawerOpen}
                diets={availableDiets}
                completedMeals={checkin.meals.map(m => m.dietId)}
                onToggleMeal={onToggleMeal}
            />

            {/* Celebration overlay when 100% */}
            <AnimatePresence>
                {dailyProgress === 100 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pt-4"
                    >
                        <Card className="bg-success/10 border-success/30 border-2">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                                    <PartyPopper className="h-5 w-5 text-success" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-success">{t("checkin.dayComplete")}</p>
                                    <p className="text-xs text-success/80 font-medium">{t("checkin.allGoalsMet")}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-2 p-4 bg-muted/40 rounded-2xl border border-border/40">
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                    {t("checkin.infoText")}
                </p>
            </div>
        </div>
    );
}
