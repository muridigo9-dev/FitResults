import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Mail,
  Clock,
  ExternalLink
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { CancellationRequestForm } from "@/components/cancellation/CancellationRequestForm";
import { LegalDocumentSheet } from "@/components/profile/LegalDocumentSheet";

export default function Privacy() {
  const { t, language } = useI18n();
  const { user } = useAuth();

  const locales: Record<string, any> = {
    'pt-BR': ptBR,
    'en-US': enUS,
    'es-ES': es
  };

  const currentLocale = locales[language] || ptBR;

  const lastSignIn = user?.last_sign_in_at
    ? format(new Date(user.last_sign_in_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`, { locale: currentLocale })
    : t("profile.notAvailable");

  return (
    <AppLayout
      header={{
        title: t("profile.privacy"),
        showBack: true
      }}
    >
      <div className="py-4 space-y-6">

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("profile.yourData")}
            </CardTitle>
            <CardDescription>
              {t("profile.accountInfo")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("profile.registeredEmail")}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("profile.lastAccess")}</p>
                  <p className="text-sm text-muted-foreground">{lastSignIn}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Documents */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <LegalDocumentSheet type="privacy" />
            <LegalDocumentSheet type="terms" />
          </CardContent>
        </Card>

        <Separator />

        {/* Cancellation Request Form */}
        <CancellationRequestForm />
      </div>
    </AppLayout>
  );
}