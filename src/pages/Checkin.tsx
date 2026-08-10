import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useCheckin } from "@/hooks/useCheckin";
import { FastCheckin } from "@/components/checkin/FastCheckin";
import { CheckinWizard } from "@/components/checkin/CheckinWizard";
import { SuccessState } from "@/components/states";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useI18n } from "@/hooks/useI18n";

export default function Checkin() {
  const { t } = useI18n();
  const location = useLocation();
  const {
    checkin,
    currentStep,
    currentStepIndex,
    isSaving,
    isComplete,
    completionStats,
    availableDiets,
    availableWorkouts,
    availableHabits,
    habitsEnabled,
    waterTrackingEnabled,
    activeChallenge,
    currentChallengeDay,
    mode,
    availableSteps,
    startWizard,
    exitWizard,
    nextStep,
    prevStep,
    toggleMeal,
    toggleWorkout,
    toggleChallengeTask,
    toggleHabit,
    updateHabitProgress,
    updateWater,
    setWater,
    updateMood,
    updateWeight,
    logAction,
    saveCheckin,
    resetCheckin,
  } = useCheckin();

  const navigate = useNavigate();
  const { gamification } = useDashboardData();

  useEffect(() => {
    if (location.state?.action === "water") {
      // Find index of water step (4)
      startWizard(4);
    }
  }, [location.state, startWizard]);

  const handleSave = async () => {
    const success = await saveCheckin();
    if (success) {
      toast.success(t("checkin.savedSuccess"), {
        description: t("checkin.pointsAdded"),
        icon: <Sparkles className="h-4 w-4 text-accent" />,
      });
    }
  };

  // Success screen after completion
  if (isComplete) {
    return (
      <AppLayout header={{ title: t("checkin.complete"), showBack: true, backTo: "/dashboard" }}>
        <div className="py-8 px-4">
          <SuccessState
            type="complete"
            title={t("checkin.completed")}
            description={t("checkin.congratsConsistency")}
          />
          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={() => window.location.href = "/dashboard"}>
              {t("checkin.backToDashboard")}
            </Button>
            <Button variant="outline" className="w-full" onClick={resetCheckin}>
              {t("checkin.newCheckin")}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Wizard mode
  if (mode === "wizard") {
    return (
      <AppLayout header={{ title: t("checkin.title"), showBack: false }}>
        <CheckinWizard
          checkin={checkin}
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          availableDiets={availableDiets}
          availableWorkouts={availableWorkouts}
          availableHabits={availableHabits}
          habitsEnabled={habitsEnabled}
          activeChallenge={activeChallenge}
          currentChallengeDay={currentChallengeDay}
          completionStats={completionStats}
          isSaving={isSaving}
          onToggleMeal={toggleMeal}
          onToggleWorkout={toggleWorkout}
          onToggleChallengeTask={toggleChallengeTask}
          onToggleHabit={toggleHabit}
          onUpdateHabitProgress={updateHabitProgress}
          onUpdateWater={updateWater}
          onSetWater={setWater}
          onUpdateMood={updateMood}
          onUpdateWeight={updateWeight}
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onSave={handleSave}
          onClose={exitWizard}
          availableSteps={availableSteps}
        />
      </AppLayout>
    );
  }

  // HUB mode (default)
  return (
    <AppLayout header={{ title: t("checkin.title"), showBack: true, backTo: "/dashboard" }}>
      <div className="py-4 px-4 overflow-x-hidden">
        <FastCheckin
          checkin={checkin}
          availableDiets={availableDiets}
          availableWorkouts={availableWorkouts}
          availableHabits={availableHabits}
          habitsEnabled={habitsEnabled}
          activeChallenge={activeChallenge}
          currentChallengeDay={currentChallengeDay}
          completionStats={completionStats}
          gamification={gamification}
          onLogAction={logAction}
          onToggleMeal={toggleMeal}
          onToggleWorkout={toggleWorkout}
          onToggleChallengeTask={toggleChallengeTask}
          onToggleHabit={toggleHabit}
          onUpdateHabitProgress={updateHabitProgress}
          onUpdateWater={updateWater}
          onUpdateMood={updateMood}
          onUpdateWeight={updateWeight}
          onOpenSummary={() => navigate("/daily-summary")}
          waterTrackingEnabled={waterTrackingEnabled}
        />
      </div>
    </AppLayout>
  );
}
