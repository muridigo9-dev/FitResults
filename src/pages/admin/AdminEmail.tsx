import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Key,
  Settings,
  FileText,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  Check,
  X,
  AlertCircle,
  History,
  RefreshCw,
  Loader2,
  BarChart3,
  ShieldAlert,
  Zap,
  ToggleLeft,
  CloudCog,
  ArrowRightLeft,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEmailSettings, useEmailTemplates, useEmailLogs, EmailTemplate } from "@/hooks/useEmailSettings";
import { useEmailProvider, EmailProvider } from "@/hooks/useEmailProvider";
import { useBrandSettings, applyBrandingToTemplate } from "@/hooks/useBrandSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { sanitizeEmailHtml, hasDangerousContent } from "@/lib/sanitize";

const TEMPLATE_TYPES = [
  { value: "welcome", label: "Boas-vindas (Definir Senha)" },
  { value: "payment_failed", label: "Pagamento Falhou" },
  { value: "subscription_reactivated", label: "Assinatura Reativada" },
  { value: "general_notification", label: "Notificação Geral" },
  { value: "cancellation_request_received", label: "Cancelamento Recebido" },
  { value: "cancellation_processed", label: "Cancelamento Processado" },
  { value: "support_reply", label: "Resposta do Suporte" },
  { value: "password_reset", label: "Reset de Senha" },
  { value: "auth_confirmation", label: "Confirmação de E-mail" },
  { value: "subscription_renewal", label: "Renovação de Assinatura" },
  { value: "trial_expiring", label: "Trial Expirando" },
  { value: "custom", label: "Customizado" },
];

const AVAILABLE_VARIABLES = [
  { key: "user_name", description: "Nome do usuário" },
  { key: "user_email", description: "Email do usuário" },
  { key: "app_name", description: "Nome do aplicativo (legado)" },
  { key: "brand_name", description: "Nome da marca (whitelabel)" },
  { key: "brand_logo_url", description: "URL do logo da marca" },
  { key: "brand_primary_color", description: "Cor primária da marca" },
  { key: "brand_secondary_color", description: "Cor secundária da marca" },
  { key: "support_email", description: "Email de suporte" },
  { key: "app_url", description: "URL do app" },
  { key: "reset_password_url", description: "Link de reset de senha" },
  { key: "password_reset_link", description: "Link de definir senha (welcome)" },
  { key: "confirmation_url", description: "Link de confirmação de email" },
  { key: "billing_url", description: "URL para atualizar pagamento" },
  { key: "dashboard_url", description: "URL do dashboard" },
  { key: "cancellation_date", description: "Data do cancelamento" },
  { key: "support_reply", description: "Resposta do suporte" },
  { key: "ticket_subject", description: "Assunto do ticket" },
  { key: "subject", description: "Assunto customizado" },
  { key: "content", description: "Conteúdo customizado" },
];

// ==========================================
// COMPONENTE: EMAIL PROVIDER CARD
// ==========================================
function EmailProviderCard() {
  const {
    activeProvider,
    systemStatus,
    isLoading,
    hasResendConfigured,
    isFallbackEnabled,
    connectionStatus,
    switchProvider,
    isSwitching,
    updateFallbackSettings,
    isUpdatingFallback,
    testConnection,
    isTestingConnection,
  } = useEmailProvider();

  const [replyTo, setReplyTo] = useState(systemStatus?.reply_to || "");
  const [localFallback, setLocalFallback] = useState(isFallbackEnabled);

  useEffect(() => {
    if (systemStatus) {
      setReplyTo(systemStatus.reply_to || "");
      setLocalFallback(systemStatus.enable_fallback);
    }
  }, [systemStatus]);

  const handleProviderChange = (provider: EmailProvider) => {
    switchProvider(provider);
  };

  const handleSaveFallback = () => {
    updateFallbackSettings({
      enable_fallback: localFallback,
      reply_to: replyTo || undefined,
    });
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-500">
            <Wifi className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Desconhecido
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudCog className="h-5 w-5 text-primary" />
            <CardTitle>Provedor de E-mail</CardTitle>
          </div>
          {getConnectionBadge()}
        </div>
        <CardDescription>
          Alterne entre provedores sem redeploy. A alteração é instantânea.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleProviderChange("supabase")}
            disabled={isSwitching}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeProvider === "supabase"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Supabase SMTP</span>
              {activeProvider === "supabase" && (
                <Badge className="bg-primary">Ativo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-left">
              SMTP nativo do Supabase. Emails de auth gerenciados automaticamente.
            </p>
          </button>

          <button
            onClick={() => handleProviderChange("resend")}
            disabled={isSwitching || !hasResendConfigured}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeProvider === "resend"
                ? "border-primary bg-primary/5"
                : hasResendConfigured
                ? "border-muted hover:border-muted-foreground/30"
                : "border-muted opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Resend</span>
              {activeProvider === "resend" && (
                <Badge className="bg-primary">Ativo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-left">
              {hasResendConfigured
                ? "Templates whitelabel personalizados via Resend API."
                : "Configure a API Key abaixo para ativar."}
            </p>
          </button>
        </div>

        {isSwitching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Alternando provedor...
          </div>
        )}

        <Separator />

        {/* Fallback Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Fallback Automático</Label>
              <p className="text-xs text-muted-foreground">
                Se Resend falhar, usar Supabase automaticamente
              </p>
            </div>
            <Switch
              checked={localFallback}
              onCheckedChange={setLocalFallback}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Reply-To (opcional)</Label>
            <Input
              placeholder="respostas@suaempresa.com"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => testConnection()}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            <Button
              onClick={handleSaveFallback}
              disabled={isUpdatingFallback}
            >
              {isUpdatingFallback ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="space-y-1">
                <li>• <strong>Supabase:</strong> Emails de auth (login, confirmação) são automáticos</li>
                <li>• <strong>Resend:</strong> Todos os emails usam templates whitelabel personalizados</li>
                <li>• A feature flag <code className="px-1 bg-background rounded">email_provider</code> controla a escolha</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AdminEmail() {
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating, testEmail, isTesting } = useEmailSettings();
  const { templates, isLoading: isLoadingTemplates, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating: isUpdatingTemplate } = useEmailTemplates();
  const { logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useEmailLogs();
  const { emailBranding, isLoading: isLoadingBrand } = useBrandSettings();
  const { activeProvider, hasResendConfigured } = useEmailProvider();

  const [apiKey, setApiKey] = useState("");
  const [senderName, setSenderName] = useState(settings?.sender_name || "");
  const [senderEmail, setSenderEmail] = useState(settings?.sender_email || "");
  const [testEmailAddress, setTestEmailAddress] = useState(settings?.test_email_address || "");
  const [isEnabled, setIsEnabled] = useState(settings?.is_enabled || false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "custom",
    subject: "",
    body_html: "",
    body_text: "",
    is_active: true,
    variables: [] as string[],
  });

  // Sync form with settings when loaded
  useEffect(() => {
    if (settings) {
      setSenderName(settings.sender_name);
      setSenderEmail(settings.sender_email);
      setTestEmailAddress(settings.test_email_address || "");
      setIsEnabled(settings.is_enabled);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      sender_name: senderName,
      sender_email: senderEmail,
      test_email_address: testEmailAddress,
      is_enabled: isEnabled,
      ...(apiKey ? { api_key: apiKey } : {}),
    });
    setApiKey("");
  };

  const handleTestEmail = () => {
    if (!testEmailAddress) return;
    testEmail(testEmailAddress);
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
      is_active: template.is_active,
      variables: template.variables || [],
    });
    setIsEditingTemplate(true);
  };

  const openCreateTemplate = () => {
    setTemplateForm({
      name: "",
      type: "custom",
      subject: "",
      body_html: "",
      body_text: "",
      is_active: true,
      variables: [],
    });
    setIsCreatingTemplate(true);
  };

  const handleSaveTemplate = () => {
    if (isEditingTemplate && selectedTemplate) {
      updateTemplate({
        id: selectedTemplate.id,
        ...templateForm,
      });
      setIsEditingTemplate(false);
    } else if (isCreatingTemplate) {
      createTemplate(templateForm as any);
      setIsCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteTemplate(id);
    }
  };

  const handlePreview = (html: string) => {
    if (hasDangerousContent(html)) {
      console.warn("Dangerous content detected in email template");
    }

    const sampleData: Record<string, string> = {
      ...emailBranding,
      app_name: emailBranding.brand_name,
      user_name: "João Silva",
      user_email: "joao@exemplo.com",
      reset_password_url: `${emailBranding.app_url}/reset-password?token=sample`,
      password_reset_link: `${emailBranding.app_url}/reset-password?token=sample`,
      confirmation_url: `${emailBranding.app_url}/confirm?token=sample`,
      billing_url: `${emailBranding.app_url}/reactivate`,
      dashboard_url: `${emailBranding.app_url}/dashboard`,
      cancellation_date: format(new Date(), "dd/MM/yyyy"),
      support_reply: "Obrigado por entrar em contato. Sua dúvida foi respondida.",
      ticket_subject: "Dúvida sobre assinatura",
      subject: "Notificação Importante",
      content: "Este é o conteúdo do e-mail.",
    };

    const preview = applyBrandingToTemplate(html, sampleData);
    const sanitizedPreview = sanitizeEmailHtml(preview);
    setPreviewHtml(sanitizedPreview);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />Enviado</Badge>;
      case "failed":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Determine integration status
  const apiConfigured = !!settings?.api_key_hint;
  const integrationActive = settings?.is_enabled && apiConfigured;

  return (
    <AdminLayout title="Configuração de E-mails">
      <div className="space-y-6">
        {/* Status Banner */}
        <Card variant={integrationActive ? "elevated" : "default"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-medium">Sistema de E-mail</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline">
                  <ToggleLeft className="h-3 w-3 mr-1" />
                  Provedor: {activeProvider === "resend" ? "Resend" : "Supabase"}
                </Badge>
                <Badge variant={integrationActive ? "default" : apiConfigured ? "secondary" : "destructive"}>
                  {integrationActive ? (
                    <><Check className="h-3 w-3 mr-1" /> Resend Ativo</>
                  ) : apiConfigured ? (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Resend Desativado</>
                  ) : (
                    <><X className="h-3 w-3 mr-1" /> Resend Não Configurado</>
                  )}
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href="https://resend.com/overview" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs"
                  >
                    Resend Dashboard →
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Configure o envio de e-mails com alternância dinâmica entre provedores
            </p>
          </div>
          <Link to="/admin/email/metrics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Métricas
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="provider" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <CloudCog className="h-4 w-4" />
              Provedor
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Resend
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Provider Tab (NEW) */}
          <TabsContent value="provider" className="space-y-6">
            <EmailProviderCard />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* API Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Resend API
                  </CardTitle>
                  <CardDescription>
                    Configure sua chave de API do Resend para envio de e-mails
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <div className="flex gap-2">
                          <Input
                            id="apiKey"
                            type="password"
                            placeholder={settings?.api_key_hint ? `Atual: ${settings.api_key_hint}` : "re_xxxx..."}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Obtenha sua chave em{" "}
                          <a 
                            href="https://resend.com/api-keys" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            resend.com/api-keys
                          </a>
                        </p>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Integração Habilitada</Label>
                          <p className="text-xs text-muted-foreground">
                            Permite uso do Resend quando selecionado como provedor
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={setIsEnabled}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Sender Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Remetente
                  </CardTitle>
                  <CardDescription>
                    Configure o nome e e-mail do remetente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="senderName">Nome do Remetente</Label>
                        <Input
                          id="senderName"
                          placeholder="Sua Marca"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="senderEmail">E-mail do Remetente</Label>
                        <Input
                          id="senderEmail"
                          type="email"
                          placeholder="no-reply@seudominio.com"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Verifique seu domínio em{" "}
                          <a 
                            href="https://resend.com/domains" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            resend.com/domains
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Test Email */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Testar Envio
                  </CardTitle>
                  <CardDescription>
                    Envie um e-mail de teste para verificar a configuração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="seu-email@exemplo.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleTestEmail}
                      disabled={!testEmailAddress || isTesting || !isEnabled}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Teste
                    </Button>
                  </div>

                  {!isEnabled && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Ative a integração Resend para testar o envio
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Templates de E-mail</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie os modelos de e-mail whitelabel do sistema
                </p>
              </div>
              <Button onClick={openCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {isLoadingTemplates ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates?.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">
                              {template.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {TEMPLATE_TYPES.find((t) => t.value === template.type)?.label || template.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {template.subject}
                            </TableCell>
                            <TableCell>
                              {template.is_active ? (
                                <Badge className="bg-green-500">Ativo</Badge>
                              ) : (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell>v{template.version}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreview(template.body_html)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditTemplate(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Histórico de Envios</h3>
                <p className="text-sm text-muted-foreground">
                  Últimos 100 e-mails enviados pelo sistema
                </p>
              </div>
              <Button variant="outline" onClick={() => refetchLogs()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {isLoadingLogs ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : logs?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum e-mail enviado ainda</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs?.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {log.user_email}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {log.subject}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {TEMPLATE_TYPES.find((t) => t.value === log.template_type)?.label || log.template_type || "Manual"}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(log.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit/Create Template Dialog */}
        <Dialog 
          open={isEditingTemplate || isCreatingTemplate} 
          onOpenChange={(open) => {
            if (!open) {
              setIsEditingTemplate(false);
              setIsCreatingTemplate(false);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditingTemplate ? "Editar Template" : "Novo Template"}
              </DialogTitle>
              <DialogDescription>
                Use variáveis como {"{{user_name}}"} ou {"{{brand_name}}"} no conteúdo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Nome do template"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={templateForm.type}
                    onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Assunto do e-mail"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo HTML</Label>
                <Textarea
                  value={templateForm.body_html}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
                  placeholder="<div>Olá {{user_name}}...</div>"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Texto Alternativo (opcional)</Label>
                <Textarea
                  value={templateForm.body_text}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_text: e.target.value })}
                  placeholder="Olá {{user_name}}..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={templateForm.is_active}
                    onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
                  />
                  <Label>Template Ativo</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(templateForm.body_html)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-2">Variáveis whitelabel disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <Badge key={v.key} variant="outline" className="text-xs">
                      {`{{${v.key}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditingTemplate(false);
                setIsCreatingTemplate(false);
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate} disabled={isCreating || isUpdatingTemplate}>
                {(isCreating || isUpdatingTemplate) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview do E-mail
              </DialogTitle>
              <DialogDescription>
                Visualização com dados de exemplo (HTML sanitizado para segurança)
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg text-green-600 text-xs mb-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Este preview foi sanitizado. Scripts e event handlers foram removidos.</span>
            </div>
            <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
