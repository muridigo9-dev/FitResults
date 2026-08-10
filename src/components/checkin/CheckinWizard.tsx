import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DailyCheckin, CheckinStep, MealEntry, ChallengeTaskEntry, MoodType } from "@/types/checkin";
import { Diet, Workout } from "@/types/content";
import { Challenge, ChallengeDay } from "@/types/challenges";
import { Habit } from "@/hooks/useHabits";
import { useI18n } from "@/hooks/useI18n";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X
} from "lucide-react";
import {
  CheckinProgress,
  StepMeals,
  StepWorkouts,
  StepChallenges,
  StepHabits,
  StepWater,
  StepMood,
  StepWeight,
  CheckinSummary
} from "./index";

interface CheckinWizardProps {
  checkin: DailyCheckin;
  currentStep: CheckinStep;
  currentStepIndex: number;
  availableDiets: Diet[];
  availableWorkouts: Workout[];
  availableHabits: Habit[];
  habitsEnabled: boolean;
  activeChallenge: Challenge | null;
  currentChallengeDay: ChallengeDay | undefined;
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
  };
  isSaving: boolean;
  onToggleMeal: (dietId: string, dietName: string, mealType: MealEntry["mealType"], consumedMacros?: MealEntry["consumedMacros"]) => void;
  onToggleWorkout: (workoutId: string, workoutName: string) => void;
  onToggleChallengeTask: (task: ChallengeTaskEntry) => void;
  onToggleHabit: (habit: Habit) => void;
  onUpdateHabitProgress: (habitId: string, delta: number) => void;
  onUpdateWater: (amount: number) => void;
  onSetWater: (current: number) => void;
  onUpdateMood: (mood: MoodType) => void;
  onUpdateWeight: (weight: number | undefined) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSave: () => void;
  onClose: () => void;
  availableSteps: CheckinStep[];
  className?: string;
}

export function CheckinWizard({
  checkin,
  currentStep,
  currentStepIndex,
  availableDiets,
  availableWorkouts,
  availableHabits,
  habitsEnabled,
  activeChallenge,
  currentChallengeDay,
  completionStats,
  isSaving,
  onToggleMeal,
  onToggleWorkout,
  onToggleChallengeTask,
  onToggleHabit,
  onUpdateHabitProgress,
  onUpdateWater,
  onSetWater,
  onUpdateMood,
  onUpdateWeight,
  onNextStep,
  onPrevStep,
  onSave,
  onClose,
  availableSteps,
  className,
}: CheckinWizardProps) {
  const { t } = useI18n();

  return (
    <div className={cn("flex flex-col min-h-[calc(100vh-120px)]", className)}>
      {/* Header with close */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{t("checkin.dailyReview")}</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-border/50">
        <CheckinProgress
          currentStepIndex={currentStepIndex}
          availableSteps={availableSteps}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {currentStep === "meals" && (
          <StepMeals
            diets={availableDiets}
            selectedMeals={checkin.meals}
            onToggle={onToggleMeal}
          />
        )}
        {currentStep === "workouts" && (
          <StepWorkouts
            workouts={availableWorkouts}
            selectedWorkouts={checkin.workouts}
            onToggle={onToggleWorkout}
          />
        )}
        {currentStep === "challenges" && (
          <StepChallenges
            challenge={activeChallenge}
            currentDay={currentChallengeDay}
            completedTasks={checkin.challengeTasks}
            onToggle={onToggleChallengeTask}
          />
        )}
        {currentStep === "habits" && habitsEnabled && (
          <StepHabits
            habits={availableHabits}
            habitEntries={checkin.habits}
            onToggle={onToggleHabit}
            onUpdateProgress={onUpdateHabitProgress}
          />
        )}
        {currentStep === "water" && (
          <StepWater
            water={checkin.water}
            onUpdate={onUpdateWater}
            onSet={onSetWater}
          />
        )}
        {currentStep === "mood" && (
          <StepMood
            selectedMood={checkin.mood}
            onSelect={onUpdateMood}
          />
        )}
        {currentStep === "weight" && (
          <StepWeight
            currentWeight={checkin.weight}
            lastWeight={checkin.lastWeight}
            onUpdate={onUpdateWeight}
          />
        )}
        {currentStep === "summary" && (
          <CheckinSummary
            checkin={checkin}
            stats={completionStats}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 px-4 py-4 bg-background border-t border-border/50">
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={onPrevStep}>
            <ChevronLeft className="h-4 w-4" />
            {t("checkin.previous")}
          </Button>

          {currentStep === "summary" ? (
            <Button size="lg" className="flex-1" onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t("checkin.finish")}
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={onNextStep}>
              {t("checkin.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
