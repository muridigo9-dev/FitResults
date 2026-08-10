import { Smartphone, CheckCircle2, Zap, Wifi, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { usePWA } from "@/hooks/usePWA";
import { useI18n } from "@/hooks/useI18n";

const benefits = [
  {
    icon: Zap,
    titleKey: "pwa.benefits.fast.title",
    descKey: "pwa.benefits.fast.description",
  },
  {
    icon: Wifi,
    titleKey: "pwa.benefits.offline.title",
    descKey: "pwa.benefits.offline.description",
  },
  {
    icon: Bell,
    titleKey: "pwa.benefits.notifications.title",
    descKey: "pwa.benefits.notifications.description",
  },
  {
    icon: Smartphone,
    titleKey: "pwa.benefits.native.title",
    descKey: "pwa.benefits.native.description",
  },
];

export default function Install() {
  const { t } = useI18n();
  const { isInstalled } = usePWA();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("pwa.pageTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("pwa.pageDescription")}
          </p>
        </div>

        {/* Installed State */}
        {isInstalled ? (
          <Card className="border-green-500/30 bg-green-500/5 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t("pwa.alreadyInstalled")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("pwa.alreadyInstalledDescription")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8">
            <InstallPrompt variant="inline" />
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("pwa.benefitsTitle")}
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <Card key={benefit.titleKey} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <benefit.icon className="h-5 w-5 text-primary" />
                    {t(benefit.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(benefit.descKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Compatibility Info */}
        <Card className="mt-8 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {t("pwa.compatibilityTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Chrome (Android)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Safari (iOS 11.3+)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Edge (Windows)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Firefox (Android)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
