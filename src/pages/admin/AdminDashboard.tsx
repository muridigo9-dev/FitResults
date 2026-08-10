import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Target,
  Trophy,
  TrendingUp,
  Activity,
  Calendar,
  Zap,
  Plus,
  UtensilsCrossed,
  Dumbbell,
  Calculator,
  ChevronRight,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { ADMIN_ROUTES } from "@/config/routes";
import { useI18n } from "@/hooks/useI18n";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickActionFAB } from "@/components/admin/QuickActionFAB";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { stats, recentActivity, isLoading } = useAdminStats();

  const totalContent = stats ?
    stats.system.totalDiets + stats.system.totalWorkouts + stats.system.totalChallenges : 0;
  const activeContent = stats ?
    stats.system.activeDiets + stats.system.activeWorkouts + stats.system.activeChallenges : 0;

  return (
    <AdminLayout title={t("admin.dashboard")}>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dashboard.overview")}</h2>
        </div>

        {/* System Stats */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("admin.system")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.activeContent")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{activeContent}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          de {totalContent} cadastrados
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-tertiary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-tertiary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.activeChallenges")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{stats?.system.activeChallenges || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin.inProgress")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.achievements")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{stats?.system.activeAchievements || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin.actives")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-level-gold/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-level-gold" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Behavior Stats */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("admin.behavior")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.totalUsers")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{stats?.behavior.totalUsers || 0}</p>
                        <p className="text-xs text-success mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +{stats?.behavior.newUsersThisWeek || 0} {t("admin.thisWeek")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.activeUsers")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{stats?.behavior.activeUsers || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats?.behavior.totalUsers
                            ? Math.round((stats.behavior.activeUsers / stats.behavior.totalUsers) * 100)
                            : 0}% {t("admin.ofTotal")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.totalCheckins")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">{stats?.behavior.totalCheckins || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats?.behavior.totalUsers && stats.behavior.totalUsers > 0
                            ? (stats.behavior.totalCheckins / stats.behavior.totalUsers).toFixed(1)
                            : 0} {t("admin.perUser")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-quaternary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-quaternary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.engagement")}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold mt-1">
                          {stats?.behavior.totalUsers
                            ? Math.round((stats.behavior.activeUsers / stats.behavior.totalUsers) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Usuários ativos na semana
                        </p>
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t("dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t("dashboard.quickAccess")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3"
                onClick={() => navigate(ADMIN_ROUTES.CONTENT)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-tertiary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{t("admin.manageContent")}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.dietsWorkoutsChallenges")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3"
                onClick={() => navigate(ADMIN_ROUTES.USERS)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{t("admin.users")}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.viewUserBase")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3"
                onClick={() => navigate(ADMIN_ROUTES.BRANDING)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{t("admin.whiteLabel")}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.customizeBrand")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <QuickActionFAB />
    </AdminLayout>
  );
}
