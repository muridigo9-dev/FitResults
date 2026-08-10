import { Bell, BellOff, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";

export function NotificationSettings() {
  const { t } = useI18n();
  const {
    isSupported,
    isSubscribed,
    isEnabled,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t("notifications.disabled"));
      } else {
        toast.error(t("notifications.errorDisabling"));
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t("notifications.enabled"));
      } else if (permission === "denied") {
        toast.error(t("notifications.permissionDenied"));
      } else {
        toast.error(t("notifications.errorEnabling"));
      }
    }
  };

  // Feature flag disabled by admin
  if (!isEnabled && !isLoading) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            {t("notifications.title")}
          </CardTitle>
          <CardDescription>
            {t("notifications.disabledByAdmin")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            {t("notifications.title")}
          </CardTitle>
          <CardDescription>
            {t("notifications.notSupported")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          {t("notifications.title")}
        </CardTitle>
        <CardDescription>
          {t("notifications.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              {t("notifications.pushNotifications")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("notifications.pushDescription")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === "denied"}
            />
          </div>
        </div>

        {permission === "denied" && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("notifications.permissionDeniedMessage")}</span>
          </div>
        )}

        {isSubscribed && (
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-sm text-primary font-medium">
              {t("notifications.subscribedMessage")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
