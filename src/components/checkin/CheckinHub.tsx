import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DailyCheckin, MealEntry, ChallengeTaskEntry, HabitEntry } from "@/types/checkin";
import { Diet, Workout, Challenge, ChallengeDay } from "@/types/content";
import { Habit } from "@/hooks/useHabits";
import { 
  Calendar, 
  Utensils, 
  Dumbbell, 
  Droplets, 
  Trophy, 
  Smile, 
  Scale,
  Target,
  ArrowRight,
  PartyPopper
} from "lucide-react";
import { CheckinHubCard } from "./CheckinHubCard";
import { QuickWater } from "./QuickWater";
import { QuickMood } from "./QuickMood";
import { QuickMeals } from "./QuickMeals";
import { QuickWorkouts } from "./QuickWorkouts";
import { QuickChallenges } from "./QuickChallenges";
import { QuickWeight } from "./QuickWeight";
import { QuickHabits } from "./QuickHabits";
import { useConfetti } from "@/hooks/useConfetti";
import { useI18n } from "@/hooks/useI18n";

interface CheckinHubProps {
  checkin: DailyCheckin;
  availableDiets: Diet[];
  availableWorkouts: Workout[];
  availableHabits: Habit[];
  habitsEnabled: boolean;
  activeChallenge: Challenge | null;
  currentChallengeDay: ChallengeDay | undefined;
  completionStats: {
    mealsCompleted: number;
    workoutsCompleted: number;
    tasksCompleted: number;
    habitsCompleted: number;
    habitsTotal: number;
    waterProgress: number;
    hasMood: boolean;
    hasWeight: boolean;
    allGoalsComplete: boolean;
  };
  onToggleMeal: (dietId: string, dietName: string, mealType: MealEntry["mealType"]) => void;
  onToggleWorkout: (workoutId: string, workoutName: string) => void;
  onToggleChallengeTask: (task: ChallengeTaskEntry) => void;
  onToggleHabit: (habit: Habit) => void;
  onUpdateHabitProgress: (habitId: string, delta: number) => void;
  onUpdateWater: (amount: number) => void;
  onUpdateMood: (mood: DailyCheckin["mood"]) => void;
  onUpdateWeight: (weight: number | undefined) => void;
  onStartWizard: () => void;
  className?: string;
}

const MOOD_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  bad: "😞",
};

export function CheckinHub({
  checkin,
  availableDiets,
  availableWorkouts,
  availableHabits,
  habitsEnabled,
  activeChallenge,
  currentChallengeDay,
  completionStats,
  onToggleMeal,
  onToggleWorkout,
  onToggleChallengeTask,
  onToggleHabit,
  onUpdateHabitProgress,
  onUpdateWater,
  onUpdateMood,
  onUpdateWeight,
  onStartWizard,
  className,
}: CheckinHubProps) {
  const { t, language } = useI18n();
  const { fireConfetti } = useConfetti();
  const hasTriggeredConfetti = useRef(false);

  // Trigger confetti when all goals are complete
  useEffect(() => {
    if (completionStats.allGoalsComplete && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      // Small delay for better UX
      setTimeout(() => {
        fireConfetti();
      }, 300);
    }
  }, [completionStats.allGoalsComplete, fireConfetti]);

  const today = new Date().toLocaleDateString(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const statusConfig = {
    not_started: { label: t("checkin.status.notStarted"), color: "bg-muted text-muted-foreground" },
    partial: { label: t("checkin.status.inProgress"), color: "bg-warning/10 text-warning" },
    complete: { label: t("checkin.status.complete"), color: "bg-success/10 text-success" },
  };
  const status = statusConfig[checkin.status];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Celebration banner when all goals complete */}
      {completionStats.allGoalsComplete && (
        <Card className="bg-gradient-to-r from-success/20 to-primary/20 border-success/30 animate-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-success/20 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">{t("checkin.congrats")} 🎉</h2>
                <p className="text-sm text-muted-foreground">{t("checkin.allGoalsMet")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date and status */}
      <Card variant="elevated" className="animate-in">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground capitalize">{today}</h2>
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HUB Cards */}
      <div className="space-y-3">
        {/* Alimentação */}
        <CheckinHubCard
          icon={Utensils}
          title={t("checkin.meals")}
          status={`${completionStats.mealsCompleted} refeição(ões)`}
          statusColor={completionStats.mealsCompleted > 0 ? "text-success" : "text-muted-foreground"}
          completed={completionStats.mealsCompleted > 0}
          className="animate-in-delay-1"
        >
          <QuickMeals
            diets={availableDiets}
            selectedMeals={checkin.meals}
            onToggle={onToggleMeal}
          />
        </CheckinHubCard>

        {/* Treino */}
        <CheckinHubCard
          icon={Dumbbell}
          title={t("dashboard.workout")}
          status={`${completionStats.workoutsCompleted} treino(s)`}
          statusColor={completionStats.workoutsCompleted > 0 ? "text-success" : "text-muted-foreground"}
          completed={completionStats.workoutsCompleted > 0}
          className="animate-in-delay-1"
        >
          <QuickWorkouts
            workouts={availableWorkouts}
            selectedWorkouts={checkin.workouts}
            onToggle={onToggleWorkout}
          />
        </CheckinHubCard>

        {/* Água */}
        <CheckinHubCard
          icon={Droplets}
          title={t("checkin.water")}
          status={`${(checkin.water.current / 1000).toFixed(1)}L / ${(checkin.water.goal / 1000).toFixed(1)}L`}
          statusColor={completionStats.waterProgress >= 100 ? "text-success" : "text-muted-foreground"}
          completed={completionStats.waterProgress >= 100}
          className="animate-in-delay-2"
        >
          <QuickWater
            water={checkin.water}
            onUpdate={onUpdateWater}
          />
        </CheckinHubCard>

        {/* Desafios */}
        <CheckinHubCard
          icon={Trophy}
          title={t("navigation.challenges")}
          status={activeChallenge ? t("checkin.activeDay", { day: currentChallengeDay?.dayNumber || 1 }) : t("checkin.noChallenge")}
          statusColor={completionStats.tasksCompleted > 0 ? "text-success" : "text-muted-foreground"}
          completed={completionStats.tasksCompleted === (currentChallengeDay?.tasks.length || 0) && completionStats.tasksCompleted > 0}
          className="animate-in-delay-2"
        >
          <QuickChallenges
            challenge={activeChallenge}
            currentDay={currentChallengeDay}
            completedTasks={checkin.challengeTasks}
            onToggle={onToggleChallengeTask}
          />
        </CheckinHubCard>

        {/* Hábitos - só mostra se feature flag ativa */}
        {habitsEnabled && availableHabits.length > 0 && (
          <CheckinHubCard
            icon={Target}
            title={t("navigation.habits")}
            status={`${completionStats.habitsCompleted}/${completionStats.habitsTotal} hábitos`}
            statusColor={completionStats.habitsCompleted > 0 ? "text-success" : "text-muted-foreground"}
            completed={completionStats.habitsCompleted === completionStats.habitsTotal && completionStats.habitsTotal > 0}
            className="animate-in-delay-3"
          >
            <QuickHabits
              habits={availableHabits}
              habitEntries={checkin.habits}
              onToggle={onToggleHabit}
              onUpdateProgress={onUpdateHabitProgress}
            />
          </CheckinHubCard>
        )}

        {/* Mood */}
        <CheckinHubCard
          icon={Smile}
          title={t("checkin.mood")}
          status={checkin.mood ? `${MOOD_EMOJI[checkin.mood]} ${t(`checkin.moods.${checkin.mood}`)}` : t("checkin.howAreYouFeeling")}
          statusColor={completionStats.hasMood ? "text-success" : "text-muted-foreground"}
          completed={completionStats.hasMood}
          className="animate-in-delay-3"
        >
          <QuickMood
            selectedMood={checkin.mood}
            onSelect={onUpdateMood}
          />
        </CheckinHubCard>

        {/* Peso */}
        <CheckinHubCard
          icon={Scale}
          title={t("checkin.weight")}
          status={checkin.weight ? `${checkin.weight} kg` : t("checkin.notLogged")}
          statusColor={completionStats.hasWeight ? "text-success" : "text-muted-foreground"}
          completed={completionStats.hasWeight}
          className="animate-in-delay-3"
        >
          <QuickWeight
            currentWeight={checkin.weight}
            lastWeight={checkin.lastWeight}
            onUpdate={onUpdateWeight}
          />
        </CheckinHubCard>
      </div>

      {/* Wizard CTA */}
      <Card variant="glass" className="animate-in-delay-4">
        <CardContent className="p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            onClick={onStartWizard}
          >
            <span>{t("checkin.reviewFullDay")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
