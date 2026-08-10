import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseStatus } from "@/hooks/useSupabaseStatus";
import { useI18n } from "@/hooks/useI18n";
import { Webhook, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function WebhookUrlCard() {
  const { t } = useI18n();
  const { webhookUrl, isConnected } = useSupabaseStatus();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!webhookUrl) return;
    
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success(t("admin.webhookCopied") || "URL copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t("admin.webhookCopyError") || "Erro ao copiar");
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          {t("admin.webhookEndpoint") || "Webhook Endpoint"}
        </CardTitle>
        <CardDescription>
          {t("admin.webhookDescription") || "Configure esta URL no Stripe Dashboard para receber eventos de pagamento."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("admin.webhookUrl") || "URL do Webhook"}</Label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl || ""}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!webhookUrl}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">
            {t("admin.webhookInstructions") || "Instruções de configuração:"}
          </p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>{t("admin.webhookStep1") || "Acesse o Stripe Dashboard → Developers → Webhooks"}</li>
            <li>{t("admin.webhookStep2") || "Clique em 'Add endpoint'"}</li>
            <li>{t("admin.webhookStep3") || "Cole a URL acima e selecione os eventos desejados"}</li>
            <li>{t("admin.webhookStep4") || "Copie o Signing Secret gerado para o campo 'Webhook Secret'"}</li>
          </ol>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open("https://dashboard.stripe.com/webhooks", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t("admin.openStripeDashboard") || "Abrir Stripe Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
