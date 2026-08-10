import { AppLayout } from "@/components/layout/AppLayout";
import { useI18n } from "@/hooks/useI18n";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

export default function Notifications() {
  const { t } = useI18n();

  return (
    <AppLayout 
      header={{ 
        title: t("profile.notifications"),
        showBack: true
      }}
    >
      <div className="py-4">
        <NotificationSettings />
      </div>
    </AppLayout>
  );
}
