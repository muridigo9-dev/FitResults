import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Mail,
  Shield,
  Database,
  Download,
  Trash2,
  Save,
  Globe,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TermsPrivacyEditor } from "@/components/admin/TermsPrivacyEditor";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const { t } = useI18n();

  const [settings, setSettings] = useState({
    notifications: {
      emailNewUsers: true,
      emailWeeklyReport: true,
      pushEnabled: false,
    },
    security: {
      twoFactorRequired: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
    },
    data: {
      autoBackup: true,
      backupFrequency: "daily",
      retentionDays: 90,
    },
  });

  // Support email from database
  const queryClient = useQueryClient();

  const { data: supportEmail, isLoading: isLoadingSupportEmail } = useQuery({
    queryKey: ["app-settings", "support_email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "support_email")
        .single();

      if (error) {
        console.error("Error fetching support email:", error);
        return "support@example.com";
      }

      return data?.value || "support@example.com";
    },
  });

  const [supportEmailInput, setSupportEmailInput] = useState("");

  // Update input when data loads
  useEffect(() => {
    if (supportEmail) {
      setSupportEmailInput(supportEmail);
    }
  }, [supportEmail]);

  const updateSupportEmailMutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: newEmail })
        .eq("key", "support_email");

      if (error) throw error;
      return newEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings", "support_email"] });
      toast.success("Email de suporte atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating support email:", error);
      toast.error("Erro ao atualizar email de suporte");
    },
  });

  const handleSaveSupportEmail = () => {
    if (!supportEmailInput || !supportEmailInput.trim()) {
      toast.error("Digite um email válido");
      return;
    }
    updateSupportEmailMutation.mutate(supportEmailInput);
  };

  const handleSave = () => {
    toast.success(t("admin.settingsSaved"));
  };

  return (
    <AdminLayout title={t("admin.settings")}>
      <div className="max-w-3xl space-y-6">

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("profile.language")}
            </CardTitle>
            <CardDescription>
              {t("profile.selectLanguage")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector variant="full" />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("admin.notifications")}
            </CardTitle>
            <CardDescription>
              Configure como você recebe alertas e atualizações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.emailNewUsers")}</Label>
                <p className="text-sm text-muted-foreground">
                  Receber email quando um novo usuário se cadastrar
                </p>
              </div>
              <Switch
                checked={settings.notifications.emailNewUsers}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, emailNewUsers: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.weeklyReport")}</Label>
                <p className="text-sm text-muted-foreground">
                  Receber resumo semanal por email
                </p>
              </div>
              <Switch
                checked={settings.notifications.emailWeeklyReport}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, emailWeeklyReport: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.pushNotifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar notificações push no navegador
                </p>
              </div>
              <Switch
                checked={settings.notifications.pushEnabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, pushEnabled: checked }
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("admin.security")}
            </CardTitle>
            <CardDescription>
              Configurações de segurança e autenticação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.twoFactorAuth")}</Label>
                <p className="text-sm text-muted-foreground">
                  Exigir 2FA para todos os administradores
                </p>
              </div>
              <Switch
                checked={settings.security.twoFactorRequired}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, twoFactorRequired: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.sessionTimeout")}</Label>
                <Input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 30 }
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.minPasswordLength")}</Label>
                <Input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, passwordMinLength: parseInt(e.target.value) || 8 }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("admin.dataBackup")}
            </CardTitle>
            <CardDescription>
              Gerenciamento de dados e backups automáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.autoBackup")}</Label>
                <p className="text-sm text-muted-foreground">
                  Realizar backup automático dos dados
                </p>
              </div>
              <Switch
                checked={settings.data.autoBackup}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    data: { ...prev.data, autoBackup: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("admin.dataRetention")}</Label>
              <Input
                type="number"
                value={settings.data.retentionDays}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    data: { ...prev.data, retentionDays: parseInt(e.target.value) || 90 }
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Tempo que os backups são mantidos antes de serem excluídos
              </p>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t("actions.exportData")}
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("actions.clearTestData")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("admin.systemEmail")}
            </CardTitle>
            <CardDescription>
              Configurações de email para notificações automáticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email de envio</Label>
              <Input
                type="email"
                placeholder="noreply@seuapp.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do remetente</Label>
              <Input
                placeholder="FitLife App"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Requer configuração de SMTP no Supabase para funcionar
            </p>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Contato de Suporte
            </CardTitle>
            <CardDescription>
              Email exibido para usuários quando o sistema de suporte está desabilitado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email de Suporte</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="support@example.com"
                  value={supportEmailInput}
                  onChange={(e) => setSupportEmailInput(e.target.value)}
                  disabled={isLoadingSupportEmail}
                />
                <Button
                  onClick={handleSaveSupportEmail}
                  disabled={isLoadingSupportEmail || updateSupportEmailMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este email será mostrado em cards de contato quando a feature flag <code className="bg-muted px-1 rounded">support_enabled</code> estiver desabilitada
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CMS: Terms & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Documentos Legais
            </CardTitle>
            <CardDescription>
              Gerencie o conteúdo das páginas públicas de privacidade e termos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TermsPrivacyEditor />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {t("admin.saveAllSettings")}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
