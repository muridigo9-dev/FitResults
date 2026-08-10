import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  Download,
  AlertCircle,
  LogOut,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useLGPD } from "@/hooks/useLGPD";
import { useProfileData } from "@/hooks/useProfileData";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { PlanManagement } from "@/components/profile/PlanManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupportEnabled } from "@/hooks/useSupportEnabled";

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const { enabled: lgpdEnabled } = useLGPD();

  const {
    profile,
    userFlags,
    planComparisons,
    notifications,
    isLoading,
    updateProfile
  } = useProfileData();
  const { isSupportEnabled, supportEmail } = useSupportEnabled();

  if (isLoading) {
    return (
      <AppLayout header={{ title: t("profile.title") }}>
        <div className="py-4 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const displayName = profile?.fullName || t("profile.guest");
  const displayEmail = user?.email || "";
  const displayInitials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";

  const handleLogout = async () => {
    await signOut();
    toast.success(t("auth.logoutSuccess"));
    navigate("/auth");
  };

  const handleAvatarUpdate = (url: string) => {
    updateProfile({ avatar_url: url });
  };

  return (
    <AppLayout
      header={{
        title: t("profile.title"),
        showAvatar: false
      }}
    >
      <div className="py-4 space-y-8 pb-10">

        {/* --- IDENTITY HUB --- */}
        <section>
          <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col items-center gap-6">
                <AvatarUpload
                  currentUrl={profile?.avatarUrl || ""}
                  initials={displayInitials}
                  onUploadComplete={handleAvatarUpdate}
                  size="xl"
                />

                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">{displayName}</h2>
                  <p className="text-sm text-muted-foreground font-medium">{displayEmail}</p>

                  <div className="pt-3 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-8 px-4"
                      onClick={() => navigate("/profile/edit")}
                    >
                      {t("profile.editProfile")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 h-8 w-8 p-0"
                      onClick={() => navigate("/profile/privacy")}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* --- MAIN TABS --- */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl h-12">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:shadow-sm">{t("profile.overview")}</TabsTrigger>
            <TabsTrigger value="plan" className="rounded-lg data-[state=active]:shadow-sm">{t("profile.currentPlan")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">

            {/* Account Settings Menu */}
            <section className="space-y-4">
              <h3 className="font-bold px-1 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                {t("profile.settings")}
              </h3>
              <Card className="divide-y divide-border overflow-hidden rounded-xl border-muted/60">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate("/profile/notifications")}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{t("profile.notificationPreferences")}</p>
                    <p className="text-xs text-muted-foreground">{t("profile.emailPushAndInApp")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate("/profile/privacy")}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{t("profile.privacyAndData")}</p>
                    <p className="text-xs text-muted-foreground">{t("profile.manageVisibility")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                {lgpdEnabled && (
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => navigate("/profile/lgpd")}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{t("profile.dataProtectionLGPD")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.accessAndDeletion")}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}

                <div className="p-4 bg-muted/10">
                  <LanguageSelector variant="full" />
                </div>
              </Card>
            </section>

            {/* Support and Install */}
            <section className="grid grid-cols-1 gap-4">
              {isSupportEnabled ? (
                <Card
                  className="bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => navigate("/profile/help")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <HelpCircle className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{t("profile.helpCenter")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.support24h")}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </CardContent>
                </Card>
              ) : (
                <Card
                  className="bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <HelpCircle className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{t("profile.needHelp")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.contactUs")}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`mailto:${supportEmail}`} className="text-primary hover:underline text-xs">
                        {supportEmail}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isInstallable && (
                <Button
                  onClick={install}
                  variant="outline"
                  className="h-14 rounded-xl border-dashed border-primary/40 hover:bg-primary/5"
                >
                  <Download className="h-5 w-5 mr-3 text-primary" />
                  {t("profile.downloadPWA")}
                </Button>
              )}
            </section>
          </TabsContent>

          <TabsContent value="plan" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
            <PlanManagement
              plans={planComparisons || []}
              currentPlanId={profile?.current_plan_id || null}
              userFlags={userFlags || null}
              subscriptionId={(profile as any)?.stripe_subscription_id}
            />

            {profile?.account_status === 'active' && (
              <div className="mt-8 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive text-xs p-0 h-auto font-medium"
                  onClick={() => navigate("/profile/privacy")}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("profile.manageSubscription")}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Logout */}
        <section className="mt-4">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("actions.logout")}
          </Button>
        </section>

        {/* Version */}
        <div className="pt-4 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
            {t("app.name")} &bull; {t("common.versionLabel")} {t("app.version")}
          </p>
          <div className="h-1 w-8 bg-primary/20 mx-auto rounded-full" />
        </div>
      </div>
    </AppLayout>
  );
}
