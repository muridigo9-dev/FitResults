import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquareWarning,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useCancellationRequests } from "@/hooks/useCancellationRequests";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/hooks/useI18n";

export function CancellationRequestForm() {
  const { t, language } = useI18n();
  const { userRequest, userRequestLoading, createRequest, isCreating } = useCancellationRequests();

  const CANCELLATION_REASONS = [
    { value: "price", label: t("cancellation.reasonPrice") },
    { value: "missing_features", label: t("cancellation.reasonMissingFeatures") },
    { value: "technical_issues", label: t("cancellation.reasonTechnicalIssues") },
    { value: "not_using", label: t("cancellation.reasonNotUsing") },
    { value: "other", label: t("cancellation.reasonOther") },
  ];

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = () => {
    if (!reason || !acknowledged) return;

    createRequest({
      reason,
      details: details.trim() || undefined,
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          label: t("cancellation.statusPending"),
          variant: "outline" as const,
          color: "text-yellow-500"
        };
      case "in_review":
        return {
          icon: MessageSquareWarning,
          label: t("cancellation.statusInReview"),
          variant: "default" as const,
          color: "text-blue-500"
        };
      case "completed":
        return {
          icon: CheckCircle2,
          label: t("cancellation.statusCompleted"),
          variant: "secondary" as const,
          color: "text-green-500"
        };
      case "rejected":
        return {
          icon: XCircle,
          label: t("cancellation.statusRejected"),
          variant: "destructive" as const,
          color: "text-red-500"
        };
      default:
        return {
          icon: Clock,
          label: status,
          variant: "outline" as const,
          color: "text-muted-foreground"
        };
    }
  };

  const locales: Record<string, any> = {
    'pt-BR': ptBR,
    'en-US': enUS,
    'es-ES': es
  };

  const currentLocale = locales[language] || ptBR;

  if (userRequestLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show existing request status
  if (userRequest) {
    const statusInfo = getStatusInfo(userRequest.status);
    const StatusIcon = statusInfo.icon;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5" />
            {t("cancellation.requestTitle")}
          </CardTitle>
          <CardDescription>
            {t("cancellation.statusTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              <div>
                <p className="font-medium">{t("cancellation.status")}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(userRequest.created_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`, { locale: currentLocale })}
                </p>
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium">{t("cancellation.reasonProvided")}</p>
            <p className="text-sm text-muted-foreground">
              {CANCELLATION_REASONS.find(r => r.value === userRequest.reason)?.label || userRequest.reason}
            </p>
            {userRequest.details && (
              <>
                <p className="text-sm font-medium mt-3">{t("cancellation.additionalDetails")}</p>
                <p className="text-sm text-muted-foreground">{userRequest.details}</p>
              </>
            )}
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t("cancellation.supportContact")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show cancellation form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareWarning className="h-5 w-5" />
          {t("cancellation.title")}
        </CardTitle>
        <CardDescription>
          {t("cancellation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <MessageSquareWarning className="h-4 w-4" />
          <AlertDescription>
            {t("cancellation.mediationAlert")}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reason">{t("cancellation.mainReason")}</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="reason">
              <SelectValue placeholder={t("cancellation.selectReason")} />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">{t("cancellation.additionalComments")}</Label>
          <Textarea
            id="details"
            placeholder={t("cancellation.commentPlaceholder")}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="acknowledged"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
          />
          <Label htmlFor="acknowledged" className="text-sm leading-relaxed cursor-pointer">
            {t("cancellation.acknowledgment")}
          </Label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!reason || !acknowledged || isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("cancellation.sending")}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t("cancellation.sendRequest")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
