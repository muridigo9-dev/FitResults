import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Key
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StripeConfigCardProps {
  isConnected: boolean;
  stripeMode: "test" | "live";
  lastSync: string | null;
  existingSecretKey?: string | null;
  existingWebhookSecret?: string | null;
  onModeChange: (mode: "test" | "live") => void;
  onConnectionUpdate: () => void;
}

export function StripeConfigCard({
  isConnected,
  stripeMode,
  lastSync,
  existingSecretKey,
  existingWebhookSecret,
  onModeChange,
  onConnectionUpdate,
}: StripeConfigCardProps) {
  const { t } = useI18n();
  const [showSecretKey, setShowSecretKey] = React.useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = React.useState(false);
  const [secretKey, setSecretKey] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Initialize with existing keys if available
  React.useEffect(() => {
    if (existingSecretKey) setSecretKey(existingSecretKey);
    if (existingWebhookSecret) setWebhookSecret(existingWebhookSecret);
  }, [existingSecretKey, existingWebhookSecret]);

  const handleValidateConnection = async () => {
    if (!secretKey.trim()) {
      toast.error(t("admin.stripeSecretKeyRequired"));
      return;
    }

    if (!secretKey.startsWith("sk_")) {
      toast.error(t("admin.stripeInvalidKeyFormat"));
      return;
    }

    setIsValidating(true);
    try {
      // Call edge function to validate the key
      const { data, error } = await supabase.functions.invoke("stripe-admin", {
        body: {
          action: "validate_key",
          secret_key: secretKey,
        },
      });

      console.log("Stripe validation response:", { data, error });

      if (error) throw error;

      let responseData = data;
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data:", e);
        }
      }

      if (responseData?.valid) {
        toast.success(t("admin.stripeConnectionValid"));
      } else {
        console.error("Stripe validation failed:", responseData);
        toast.error(responseData?.error || t("admin.stripeConnectionInvalid"));
      }
    } catch (error: any) {
      console.error("Error validating Stripe key:", error);
      toast.error(error.message || t("admin.stripeValidationError"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!secretKey.trim() || !webhookSecret.trim()) {
      toast.error(t("admin.stripeBothKeysRequired"));
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-admin", {
        body: {
          action: "save_keys",
          secret_key: secretKey,
          webhook_secret: webhookSecret,
          mode: stripeMode,
        },
      });

      console.log("[save_keys] Response:", data);

      if (error) throw error;

      let responseData = data;
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse save_keys response:", e);
        }
      }

      if (!responseData?.success) {
        console.error("[save_keys] Failed:", responseData);
        throw new Error(responseData?.error || t("admin.stripeSaveError"));
      }

      toast.success(t("admin.stripeKeysSaved"));
      onConnectionUpdate();
    } catch (error: any) {
      console.error("Error saving Stripe keys:", error);
      toast.error(error.message || t("admin.stripeSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t("admin.stripeApiKeys")}
            </CardTitle>
            <CardDescription>
              {t("admin.stripeApiKeysDesc")}
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "success" : "destructive"}>
            {isConnected ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> {t(`admin.stripeConnected_${stripeMode}`)}</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> {t("admin.stripeNotConnected")}</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label>{t("admin.stripeMode")}</Label>
          <Select value={stripeMode} onValueChange={(v) => onModeChange(v as "test" | "live")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-500" />
                  {t("admin.stripeModeTest")}
                </div>
              </SelectItem>
              <SelectItem value="live">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  {t("admin.stripeModeLive")}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {stripeMode === "test"
              ? t("admin.stripeModeTestDesc")
              : t("admin.stripeModeLiveDesc")}
          </p>
        </div>



        {/* Secret Key Input */}
        <div className="space-y-2">
          <Label htmlFor="secretKey">{t("admin.stripeSecretKey")}</Label>
          <div className="relative">
            <Input
              id="secretKey"
              type={showSecretKey ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={stripeMode === "test" ? "sk_test_..." : "sk_live_..."}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("admin.stripeSecretKeyHint")}
          </p>
        </div>

        {/* Webhook Secret Input */}
        <div className="space-y-2">
          <Label htmlFor="webhookSecret">{t("admin.stripeWebhookSecret")}</Label>
          <div className="relative">
            <Input
              id="webhookSecret"
              type={showWebhookSecret ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("admin.stripeWebhookSecretHint")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleValidateConnection}
            disabled={isValidating || !secretKey}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t("admin.stripeValidate")}
          </Button>
          <Button
            onClick={handleSaveKeys}
            disabled={isSaving || !secretKey || !webhookSecret}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {t("admin.stripeSaveKeys")}
          </Button>
        </div>

        {/* Last Sync Info */}
        {lastSync && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t("admin.stripeLastSync")}: {new Date(lastSync).toLocaleString()}
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("admin.stripeSecurityTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("admin.stripeSecurityDesc")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
