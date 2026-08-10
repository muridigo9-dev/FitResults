import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCheckin } from "@/hooks/useCheckin";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useI18n } from "@/hooks/useI18n";
import { useDiary } from "@/contexts/DiaryContext";
import { calculateMacroGrams } from "@/lib/calculators/macros";

// V2 Components
import { DashboardHeader } from "@/components/dashboard/v2/DashboardHeader";
import { QuickActionsGrid } from "@/components/dashboard/v2/QuickActionsGrid";
import { MacroSummary } from "@/components/dashboard/v2/MacroSummary";
import { HabitsList } from "@/components/dashboard/v2/HabitsList";
import { GoalsConfigDrawer } from "@/components/dashboard/v2/GoalsConfigDrawer";
import { QuickDietDrawer } from "@/components/nutrition/LogMealDrawer";
import { QuickWorkoutDrawer } from "@/components/dashboard/v2/QuickWorkoutDrawer";
import { QuickWaterDrawer } from "@/components/dashboard/v2/QuickWaterDrawer";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

export default function Dashboard() {
  const { t } = useI18n();
  const { getTodaySummary } = useDiary();

  const {
    checkin,
    completionStats,
    availableDiets,
    availableWorkouts,
    updateWater,
    toggleMeal,
    toggleWorkout,
    startCheckin,
    logAction
  } = useCheckin();

  const {
    profile,
    gamification,
  } = useDashboardData();

  const {
    calorieGoal,
    waterGoal,
    mealsGoal,
    macroDistribution,
  } = useDashboardPreferences();

  const { isEnabled: waterTrackingEnabled } = useFeatureFlag("water_tracking");
  const { isEnabled: dietsEnabled } = useFeatureFlag("diets_enabled");
  const { isEnabled: trainingEnabled } = useFeatureFlag("training_mode_enabled");

  const macroTargets = useMemo(() => {
    return calculateMacroGrams(calorieGoal, macroDistribution);
  }, [calorieGoal, macroDistribution]);


  // Dialog State
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isDietDrawerOpen, setIsDietDrawerOpen] = useState(false);
  const [isWorkoutDrawerOpen, setIsWorkoutDrawerOpen] = useState(false);
  const [isWaterDrawerOpen, setIsWaterDrawerOpen] = useState(false);

  // -- Quick Actions --
  const handleLogWater = () => {
    setIsWaterDrawerOpen(true);
  };

  const handleLogMeal = () => {
    setIsDietDrawerOpen(true);
  };

  const handleLogWorkout = () => {
    setIsWorkoutDrawerOpen(true);
  };

  // Replace old calculation. Use live summary from Diary (Source of Truth)
  // This fixes the sync issue where Dashboard shows "Checkin Status" but user wants "Total Consumed"
  const todaySummary = getTodaySummary();

  const dailyMacros = useMemo(() => {
    return {
      proto: todaySummary.totalProtein,
      carbs: todaySummary.totalCarbs,
      fat: todaySummary.totalFat,
      cals: todaySummary.totalCalories,
    };
  }, [todaySummary]);

  return (
    <AppLayout>
      <div className="pb-24 pt-2">

        {/* 1. Header & Context */}
        <DashboardHeader
          userName={profile?.fullName?.split(" ")[0] || "Aluno"}
          streak={gamification.streak}
          onOpenGoals={() => setIsGoalsOpen(true)}
        />

        {/* 2. Quick Actions (Core) */}
        <QuickActionsGrid
          onLogWater={handleLogWater}
          onLogMeal={handleLogMeal}
          onLogWorkout={handleLogWorkout}
          showWater={waterTrackingEnabled}
          showDiets={dietsEnabled}
          showTraining={trainingEnabled}
        />

        {/* 3. Daily Progress Ring & Macros */}
        <MacroSummary
          protein={{ current: dailyMacros.proto, max: macroTargets.protein }}
          carbs={{ current: dailyMacros.carbs, max: macroTargets.carbs }}
          fats={{ current: dailyMacros.fat, max: macroTargets.fat }}
          calories={{ current: dailyMacros.cals, max: calorieGoal }}
        />

        {/* 4. Habits List */}
        <HabitsList
          water={{
            current: (checkin.water?.current || 0) / 1000,
            total: (waterGoal || 2000) / 1000
          }}
          meals={{
            current: todaySummary.mealsCount,
            total: mealsGoal
          }}
          workouts={{
            current: todaySummary.workoutsCount,
            total: 1
          }}
          showWater={waterTrackingEnabled}
          showMeals={dietsEnabled}
          showWorkouts={trainingEnabled}
        />

        {/* --- Drawers --- */}
        <GoalsConfigDrawer
          open={isGoalsOpen}
          onOpenChange={setIsGoalsOpen}
        />

        {waterTrackingEnabled && (
          <QuickWaterDrawer
            open={isWaterDrawerOpen}
            onOpenChange={setIsWaterDrawerOpen}
            current={checkin.water.current}
            goal={waterGoal}
            onUpdate={(amount) => {
              updateWater(amount);
              logAction({
                type: "water",
                value: {
                  current: checkin.water.current + amount,
                  goal: waterGoal
                }
              });
            }}
          />
        )}

        <QuickDietDrawer
          open={isDietDrawerOpen}
          onOpenChange={setIsDietDrawerOpen}
          diets={availableDiets}
          completedMeals={checkin.meals.filter(m => m.completed).map(m => m.dietId)}
          onToggleMeal={(id, name) => toggleMeal(id, name, 'lunch')}
        />

        <QuickWorkoutDrawer
          open={isWorkoutDrawerOpen}
          onOpenChange={setIsWorkoutDrawerOpen}
          workouts={availableWorkouts}
          completedWorkouts={checkin.workouts.filter(w => w.completed).map(w => w.workoutId)}
          onToggleWorkout={toggleWorkout}
        />

      </div>
    </AppLayout>
  );
}
