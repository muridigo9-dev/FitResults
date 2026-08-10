/**
 * Health Page - Minha Saúde
 * 
 * Complete health metrics with status indicators, healthy ranges,
 * gap to healthy, and actionable guidance.
 */

import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale,
  Ruler,
  Activity,
  Target,
  Heart,
  Flame,
  AlertCircle,
  TrendingUp,
  User,
  Percent,
  Zap
} from "lucide-react";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { MetricCard } from "@/components/metrics/MetricCard";
import { BodyProfileForm } from "@/components/metrics/BodyProfileForm";
import { UserHabitsList } from "@/components/habits";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import {
  analyzeBMI,
  analyzeBodyFat,
  analyzeWHR,
  analyzeWeight,
  analyzeCalorieTarget
} from "@/lib/calculators/healthRanges";
import { useI18n } from "@/hooks/useI18n";



export default function Health() {
  const { t } = useI18n();
  const {
    profile,
    bodyComposition,
    calorieTarget,
    isProfileComplete
  } = useUserMetrics();

  const { isEnabled: isHabitsEnabled } = useFeatureFlag("enable_custom_habits");

  // Calculate BMR from TDEE and activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const estimatedBMR = calorieTarget && profile
    ? Math.round(calorieTarget.tdee / activityMultipliers[profile.activityLevel])
    : null;

  // Analyze metrics
  const bmiAnalysis = bodyComposition?.bmi
    ? analyzeBMI(bodyComposition.bmi.value)
    : null;

  const bodyFatAnalysis = bodyComposition?.bodyFat && profile
    ? analyzeBodyFat(bodyComposition.bodyFat.percentage, profile.gender)
    : null;

  const whrAnalysis = bodyComposition?.whr && profile
    ? analyzeWHR(bodyComposition.whr.ratio, profile.gender)
    : null;

  const weightAnalysis = bodyComposition?.idealWeightRange && profile
    ? analyzeWeight(profile.currentWeight, bodyComposition.idealWeightRange)
    : null;

  const calorieAnalysis = calorieTarget && profile
    ? analyzeCalorieTarget(calorieTarget.target, calorieTarget.tdee, profile.fitnessGoal)
    : null;

  return (
    <AppLayout header={{ title: t("health.title"), showBack: true }}>
      <div className="py-4 space-y-6">
        {/* Disclaimer */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t("health.disclaimer")}
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full ${isHabitsEnabled ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("health.tabProfile")}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t("health.tabMetrics")}
            </TabsTrigger>
            {isHabitsEnabled && (
              <TabsTrigger value="habits" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t("health.tabHabits")}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 animate-in">
            <BodyProfileForm />
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 animate-in">
            {!isProfileComplete ? (
              <Card variant="glass" className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("health.completeProfileMessage")}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {/* ========================================
                   COMPOSIÇÃO CORPORAL
                   ======================================== */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-2">
                  {t("health.bodyComposition")}
                </h3>

                {/* IMC */}
                {bmiAnalysis && (
                  <MetricCard
                    title={t("health.bmi")}
                    value={bmiAnalysis.currentValue.toFixed(1)}
                    unit="kg/m²"
                    status={bmiAnalysis.status}
                    statusLabel={t(bmiAnalysis.statusLabelKey)}
                    healthyRange={bmiAnalysis.healthyRange}
                    gapToHealthy={bmiAnalysis.gapToHealthy}
                    gapDirection={bmiAnalysis.gapDirection}
                    message={t(bmiAnalysis.messageKey, bmiAnalysis.messageParams)}
                    recommendation={bmiAnalysis.recommendation}
                    explanation={t("health.bmiExplanation")}
                    icon={Scale}
                  />
                )}

                {/* Body Fat */}
                {bodyFatAnalysis && bodyComposition?.bodyFat && (
                  <MetricCard
                    title={t("health.bodyFat")}
                    value={bodyFatAnalysis.currentValue.toFixed(1)}
                    unit="%"
                    status={bodyFatAnalysis.status}
                    statusLabel={t(bodyFatAnalysis.statusLabelKey)}
                    healthyRange={bodyFatAnalysis.healthyRange}
                    gapToHealthy={bodyFatAnalysis.gapToHealthy}
                    gapDirection={bodyFatAnalysis.gapDirection}
                    message={t(bodyFatAnalysis.messageKey, bodyFatAnalysis.messageParams)}
                    recommendation={bodyFatAnalysis.recommendation}
                    explanation={t("health.bodyFatExplanation")}
                    icon={Percent}
                    details={[
                      { label: t("health.fatMass"), value: `${bodyComposition.bodyFat.fatMass.toFixed(1)} kg` },
                      { label: t("health.leanMass"), value: `${bodyComposition.bodyFat.leanMass.toFixed(1)} kg` },
                    ]}
                  />
                )}

                {/* WHR */}
                {whrAnalysis && (
                  <MetricCard
                    title={t("health.whr")}
                    value={whrAnalysis.currentValue.toFixed(2)}
                    status={whrAnalysis.status}
                    statusLabel={t(whrAnalysis.statusLabelKey)}
                    healthyRange={whrAnalysis.healthyRange}
                    gapToHealthy={whrAnalysis.gapToHealthy}
                    gapDirection={whrAnalysis.gapDirection}
                    message={t(whrAnalysis.messageKey, whrAnalysis.messageParams)}
                    recommendation={whrAnalysis.recommendation}
                    explanation={t("health.whrExplanation")}
                    icon={Ruler}
                  />
                )}

                {/* Weight Analysis */}
                {weightAnalysis && (
                  <MetricCard
                    title={t("health.weightAnalysis")}
                    value={profile?.currentWeight || 0}
                    unit="kg"
                    status={weightAnalysis.status}
                    statusLabel={t(weightAnalysis.statusLabelKey)}
                    healthyRange={weightAnalysis.healthyRange}
                    gapToHealthy={weightAnalysis.gapToHealthy}
                    gapDirection={weightAnalysis.gapDirection}
                    message={t(weightAnalysis.messageKey, weightAnalysis.messageParams)}
                    recommendation={weightAnalysis.recommendation}
                    explanation={t("health.idealWeightExplanation")}
                    icon={TrendingUp}
                  />
                )}

                {/* ========================================
                   METABOLISMO & CALORIAS
                   ======================================== */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  {t("health.metabolismCalories")}
                </h3>

                {/* BMR */}
                {estimatedBMR && (
                  <MetricCard
                    title={t("health.bmr")}
                    value={estimatedBMR}
                    unit={t("health.kcalPerDay")}
                    message={t("health.bmrMessage")}
                    recommendation={t("health.bmrRecommendation")}
                    explanation={t("health.bmrExplanation")}
                    icon={Flame}
                    color="warning"
                  />
                )}

                {/* TDEE */}
                {calorieTarget && (
                  <MetricCard
                    title={t("health.tdee")}
                    value={Math.round(calorieTarget.tdee)}
                    unit={t("health.kcalPerDay")}
                    message={t("health.tdeeMessage")}
                    recommendation={t("health.tdeeRecommendation")}
                    explanation={t("health.tdeeExplanation")}
                    icon={Zap}
                    color="info"
                  />
                )}

                {/* Daily Calorie Target */}
                {calorieTarget && calorieAnalysis && (
                  <MetricCard
                    title={t("health.calorieTarget")}
                    value={Math.round(calorieTarget.target)}
                    unit={t("health.kcal")}
                    message={t(calorieAnalysis.messageKey, calorieAnalysis.messageParams)}
                    recommendation={calorieAnalysis.recommendation}
                    explanation={t("health.calorieTargetExplanation")}
                    icon={Target}
                    color="success"
                    highlight
                    details={[
                      { label: t("health.tdee"), value: `${Math.round(calorieTarget.tdee)} kcal` },
                      { label: t("health.adjustment"), value: `${calorieTarget.goalAdjustment > 0 ? '+' : ''}${calorieTarget.goalAdjustment}%` },
                    ]}
                  />
                )}

                {/* Missing measurements hint */}
                {(!bodyComposition?.bodyFat || !bodyComposition?.whr) && (
                  <Card variant="glass" className="p-4 border-dashed">
                    <div className="flex items-start gap-3">
                      <Ruler className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {t("health.wantMoreAccuracy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("health.addMeasurementsHint")}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Habits Tab */}
          {isHabitsEnabled && (
            <TabsContent value="habits" className="space-y-4 animate-in">
              <UserHabitsList />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
