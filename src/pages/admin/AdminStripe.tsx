import * as React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStripeSettings, useStripeEvents } from "@/hooks/useStripeSettings";
import { useI18n } from "@/hooks/useI18n";
import { WebhookUrlCard } from "@/components/admin/WebhookUrlCard";
import { StripeConfigCard } from "@/components/admin/StripeConfigCard";
import {
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity,
  Clock,
  FileJson,
  RefreshCw,
  Gift
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";

export default function AdminStripe() {
  const { t, language } = useI18n();
  const { settings, isLoading, updateSettings, isUpdating } = useStripeSettings();
  const { data: events, isLoading: isLoadingEvents, refetch: refetchEvents } = useStripeEvents(20);

  // Local state for form
  const [stripeMode, setStripeMode] = React.useState<"test" | "live">("test");
  const [trialDays, setTrialDays] = React.useState(7);
  const [trialEnabled, setTrialEnabled] = React.useState(true);
  const [trialMessage, setTrialMessage] = React.useState("");

  // Event detail modal
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null);

  const dateLocale = language === "pt-BR" ? ptBR : language === "es-ES" ? es : enUS;

  // Load settings when data is available
  React.useEffect(() => {
    if (settings) {
      setStripeMode(settings.stripe_mode);
      setTrialDays(settings.trial_days);
      setTrialEnabled(settings.trial_enabled);
      setTrialMessage(settings.trial_message || t("admin.trialDefaultMessage"));
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      stripe_mode: stripeMode,
      is_connected: settings?.is_connected || false,
      trial_days: trialDays,
      trial_enabled: trialEnabled,
      trial_message: trialMessage,
    });
  };

  const handleModeChange = (mode: "test" | "live") => {
    setStripeMode(mode);
  };

  const handleConnectionUpdate = () => {
    // Refetch settings after connection update
    window.location.reload();
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes("succeeded") || eventType.includes("completed")) {
      return <Badge variant="success">{eventType}</Badge>;
    }
    if (eventType.includes("failed")) {
      return <Badge variant="destructive">{eventType}</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  const lastSuccessfulEvent = events?.find(e => e.processed);
  const recentErrors = events?.filter(e => e.error_message).slice(0, 3);

  if (isLoading) {
    return (
      <AdminLayout title={t("admin.stripe")}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={t("admin.stripeConfig")}>
      <div className="space-y-6 max-w-4xl">
        {/* Status Banner */}
        <Card variant={settings?.is_connected ? "elevated" : "default"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("admin.stripeIntegrationStatus")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={settings?.is_connected ? "default" : "destructive"}>
                  {settings?.is_connected ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> {t("admin.stripeConnected")} ({stripeMode})</>
                  ) : (
                    <><AlertTriangle className="h-3 w-3 mr-1" /> {t("admin.stripeNotConnected")}</>
                  )}
                </Badge>
                {lastSuccessfulEvent && (
                  <span className="text-xs text-muted-foreground">
                    {t("admin.lastEvent")}: {format(new Date(lastSuccessfulEvent.created_at), "dd/MM HH:mm", { locale: dateLocale })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe API Configuration */}
        <StripeConfigCard
          isConnected={settings?.is_connected || false}
          stripeMode={stripeMode}
          lastSync={settings?.updated_at || null}
          existingSecretKey={settings?.secret_key}
          existingWebhookSecret={settings?.webhook_secret}
          onModeChange={handleModeChange}
          onConnectionUpdate={handleConnectionUpdate}
        />

        {/* Webhook URL Card */}
        <WebhookUrlCard />

        {/* Recent Events Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t("admin.recentEvents")}
                </CardTitle>
                <CardDescription>
                  {t("admin.recentEventsDesc")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchEvents()}
                disabled={isLoadingEvents}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingEvents ? "animate-spin" : ""}`} />
                {t("actions.refresh")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !events || events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("admin.noEventsRegistered")}</p>
                <p className="text-xs mt-1">{t("admin.configureWebhook")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.eventType")}</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t("admin.date")}</TableHead>
                      <TableHead className="text-right">{t("admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {getEventTypeBadge(event.event_type)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.stripe_event_id?.slice(0, 20)}...
                        </TableCell>
                        <TableCell>
                          {event.processed ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t("admin.processed")}
                            </Badge>
                          ) : event.error_message ? (
                            <Badge variant="destructive" size="sm">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t("admin.error")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              <Clock className="h-3 w-3 mr-1" />
                              {t("admin.pending")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <FileJson className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Recent Errors */}
            {recentErrors && recentErrors.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-destructive mb-2">{t("admin.recentErrors")}</p>
                <div className="space-y-2">
                  {recentErrors.map((event) => (
                    <div key={event.id} className="bg-destructive/10 rounded p-2 text-xs">
                      <span className="font-medium">{event.event_type}:</span>{" "}
                      <span className="text-muted-foreground">{event.error_message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trial Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t("admin.trialConfig")}
            </CardTitle>
            <CardDescription>
              {t("admin.trialConfigDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("admin.trialEnabled")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin.trialEnabledDesc")}
                </p>
              </div>
              <Switch
                checked={trialEnabled}
                onCheckedChange={setTrialEnabled}
              />
            </div>

            {trialEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="trialDays">{t("admin.trialDays")}</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min={1}
                    max={30}
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.trialDaysHint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trialMessage">{t("admin.trialMessage")}</Label>
                  <Input
                    id="trialMessage"
                    placeholder={t("admin.trialMessagePlaceholder")}
                    value={trialMessage}
                    onChange={(e) => setTrialMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.trialMessageHint")}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={isUpdating} size="lg">
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("states.saving")}
              </>
            ) : (
              t("actions.saveSettings")
            )}
          </Button>
        </div>

        {/* Event Detail Modal */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("admin.eventDetails")}</DialogTitle>
              <DialogDescription>
                {selectedEvent?.event_type} - {selectedEvent?.stripe_event_id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {selectedEvent?.processed ? t("admin.processed") : selectedEvent?.error_message ? t("admin.error") : t("admin.pending")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("admin.date")}</p>
                  <p className="font-medium">
                    {selectedEvent?.created_at && format(new Date(selectedEvent.created_at), "dd/MM/yyyy HH:mm:ss", { locale: dateLocale })}
                  </p>
                </div>
              </div>

              {selectedEvent?.error_message && (
                <div className="bg-destructive/10 rounded p-3">
                  <p className="text-sm font-medium text-destructive">{t("admin.error")}</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.error_message}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Payload</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[300px]">
                  {JSON.stringify(selectedEvent?.payload, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
