import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Gamepad2, Star, Zap } from "lucide-react";
import {
  XPBar,
  AchievementCard,
  StreakCounter,
} from "@/components/gamification";
import { useProgress } from "@/hooks/useProgress";
import { AnimatedLoader } from "@/components/loaders";
import { motion } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

export default function ProgressPage() {
  const { t } = useI18n();
  const {
    userStats,
    badges,
    isLoading
  } = useProgress();

  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader
          type="progress"
          message="Carregando sua jornada..."
          fullScreen
        />
      </AppLayout>
    );
  }

  // Sort badges: unlocked first, then locked
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.unlocked === b.unlocked) return 0;
    return a.unlocked ? -1 : 1;
  });

  return (
    <AppLayout
      header={{
        title: "Sua Jornada",
        showBack: true,
        backTo: "/dashboard"
      }}
    >
      <div className="py-4 space-y-8 pb-20">
        {/* Hero Section - XP & Level */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-secondary/5 border border-border/50 p-6 shadow-xl">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-heading">{t("dashboard.levelAndExperience")}</h2>
            </div>

            <XPBar
              currentXP={userStats.currentXP}
              requiredXP={userStats.nextLevelXP}
              level={userStats.level}
              levelName={userStats.levelName || `Nível ${userStats.level}`}
              showDetails
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 backdrop-blur-sm p-3 rounded-2xl border border-border/40 shadow-sm text-center">
                <div className="flex items-center justify-center mb-1 text-yellow-500">
                  <Star className="w-4 h-4 mr-1 fill-yellow-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">{t("dashboard.totalXP")}</span>
                </div>
                <p className="text-2xl font-black text-foreground">{userStats.totalPoints.toLocaleString()}</p>
              </div>
              <div className="bg-background/50 backdrop-blur-sm p-3 rounded-2xl border border-border/40 shadow-sm text-center">
                <div className="flex items-center justify-center mb-1 text-orange-500">
                  <Zap className="w-4 h-4 mr-1 fill-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">{t("dashboard.activeDays")}</span>
                </div>
                <p className="text-2xl font-black text-foreground">{userStats.completedDays}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Streak & Consistency */}
        <section className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <StreakCounter
            currentStreak={userStats.streak}
            longestStreak={userStats.bestStreak}
          />
        </section>

        {/* Achievements Section */}
        <section className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
          <Tabs defaultValue="all" className="w-full">
            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-black font-heading uppercase tracking-tight">Conquistas</h3>
              </div>

              <TabsList className="bg-muted/50 p-1 rounded-xl w-full grid grid-cols-3">
                <TabsTrigger value="all" className="rounded-lg text-xs font-bold font-heading">{t("dashboard.all")}</TabsTrigger>
                <TabsTrigger value="earned" className="rounded-lg text-xs font-bold font-heading">{t("dashboard.earned")}</TabsTrigger>
                <TabsTrigger value="locked" className="rounded-lg text-xs font-bold font-heading">{t("dashboard.locked")}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <div className="grid gap-4">
                {sortedBadges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AchievementCard
                      name={badge.name}
                      description={badge.description}
                      icon={badge.icon}
                      color={badge.color}
                      xpReward={badge.xpReward || 0}
                      isUnlocked={badge.unlocked}
                      unlockedAt={badge.unlockedAt || badge.earnedAt}
                      progress={
                        !badge.unlocked && badge.currentProgress !== undefined
                          ? {
                            current: badge.currentProgress,
                            required: badge.requiredProgress || 1,
                          }
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="earned" className="mt-0">
              <div className="grid gap-4">
                {badges.filter(b => b.unlocked).map((badge) => (
                  <AchievementCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    color={badge.color}
                    xpReward={badge.xpReward || 0}
                    isUnlocked={true}
                    unlockedAt={badge.unlockedAt || badge.earnedAt}
                  />
                ))}
                {badges.filter(b => b.unlocked).length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Você ainda não desbloqueou nenhuma conquista.</p>
                      <p className="text-xs mt-1">{t("dashboard.keepTrainingMessage")}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="locked" className="mt-0">
              <div className="grid gap-4">
                {badges.filter(b => !b.unlocked).map((badge) => (
                  <AchievementCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    color={badge.color}
                    xpReward={badge.xpReward || 0}
                    isUnlocked={false}
                    progress={
                      badge.currentProgress !== undefined
                        ? {
                          current: badge.currentProgress,
                          required: badge.requiredProgress || 1,
                        }
                        : undefined
                    }
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </AppLayout>
  );
}
