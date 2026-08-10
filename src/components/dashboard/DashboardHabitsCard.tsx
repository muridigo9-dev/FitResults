import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Target, Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserHabits } from "@/hooks/useHabits";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18n } from "@/hooks/useI18n";

const HABIT_ICONS: Record<string, string> = {
  dumbbell: "💪",
  apple: "🍎",
  droplet: "💧",
  bed: "🛏️",
  brain: "🧠",
  heart: "❤️",
  book: "📚",
  run: "🏃",
  meditation: "🧘",
  pill: "💊",
};

interface DailyHabitProgress {
  habitId: string;
  current: number;
  completed: boolean;
}

interface DashboardHabitsCardProps {
  /** Optional: Pass in today's habit progress from checkin data */
  habitProgress?: DailyHabitProgress[];
}

export function DashboardHabitsCard({ habitProgress = [] }: DashboardHabitsCardProps) {
  const { t } = useI18n();
  const { isEnabled, isLoading: isFlagLoading } = useFeatureFlag("enable_custom_habits");
  const { habits, isLoading } = useUserHabits();

  // Don't show if feature flag is disabled
  if (!isEnabled && !isFlagLoading) {
    return null;
  }

  if (isLoading || isFlagLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{t("habits.myHabits")}</p>
              <p className="text-xs text-muted-foreground">
                {t("habits.createFirstHabit")}
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/health?tab=habits">
                <Plus className="h-4 w-4 mr-1" />
                {t("actions.add")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get progress for each habit
  const getHabitProgress = (habitId: string) => {
    const progress = habitProgress.find(p => p.habitId === habitId);
    return progress || { current: 0, completed: false };
  };

  // Show max 4 habits on dashboard
  const displayHabits = habits.slice(0, 4);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {t("habits.myHabits")}
          </h3>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link to="/health">
              {t("actions.seeDetails")}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          {displayHabits.map(habit => {
            const progress = getHabitProgress(habit.id);
            const progressPercent = Math.min(100, (progress.current / habit.default_goal) * 100);
            const isComplete = progress.completed || progress.current >= habit.default_goal;

            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span
                  className="text-xl p-1.5 rounded-lg shrink-0"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {HABIT_ICONS[habit.icon] || "🎯"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{habit.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {progress.current}/{habit.default_goal} {habit.unit}
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-1.5"
                    style={{
                      ['--progress-background' as any]: `${habit.color}30`,
                      ['--progress-foreground' as any]: habit.color,
                    }}
                  />
                </div>
                {isComplete && (
                  <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {habits.length > 4 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            +{habits.length - 4} {t("common.more")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
