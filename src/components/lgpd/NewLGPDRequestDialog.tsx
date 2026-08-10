import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { LGPD_TYPE_CONFIG } from "./LGPDRequestCard";
import { LGPDRequestType, useLGPD } from "@/hooks/useLGPD";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface NewLGPDRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: { requestType: LGPDRequestType; userMessage?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function NewLGPDRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: NewLGPDRequestDialogProps) {
  const { t } = useI18n();
  const [selectedType, setSelectedType] = useState<LGPDRequestType | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [confirmedIrreversible, setConfirmedIrreversible] = useState(false);
  const lgpd = useLGPD();

  const handleSubmit = async () => {
    if (!selectedType) return;

    const trimmedNotes = userNotes.trim();
    await onSubmit({
      requestType: selectedType,
      userMessage: trimmedNotes || undefined
    });

    // Reset form
    setSelectedType(null);
    setUserNotes("");
    setConfirmedIrreversible(false);
    onOpenChange(false);
  };

  const selectedConfig = selectedType ? LGPD_TYPE_CONFIG[selectedType] : null;
  const Icon = selectedConfig?.icon;

  const getNormalizedType = (type: string) => {
    const changes: Record<string, string> = {
      confirmation: 'data_confirmation',
      access: 'data_access',
      correction: 'data_correction',
      portability: 'data_portability',
      anonymization: 'data_anonymization',
      deletion: 'data_deletion',
      revocation: 'consent_revocation'
    };
    return changes[type] || type;
  }

  const getSelectedTypeLabel = () => {
    if (!selectedType) return "";
    return t(`lgpd.type.${getNormalizedType(selectedType)}`);
  }

  const getSelectedTypeDesc = () => {
    if (!selectedType) return "";
    return t(`lgpd.type.${getNormalizedType(selectedType)}_desc`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("lgpd.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("lgpd.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Request Type Selection */}
          <div className="space-y-3">
            <Label>{t("lgpd.dialog.requestType")} *</Label>
            <RadioGroup
              value={selectedType || ""}
              onValueChange={(value) => setSelectedType(value as LGPDRequestType)}
            >
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(LGPD_TYPE_CONFIG).filter(([type]) => {
                  if (type.includes('data_') || type === 'consent_revocation') {
                    if (type === "data_portability" && !lgpd.exportEnabled) return false;
                    if (type === "data_anonymization" && !lgpd.anonymizationEnabled) return false;
                    if (type === "data_deletion" && !lgpd.hardDeleteEnabled) return false;
                    return true;
                  }
                  return false; // Hide compatibility short names from UI
                }).map(([type, config]) => {
                  const RequestIcon = config.icon;
                  const isSelected = selectedType === type;
                  const normalized = getNormalizedType(type);
                  const label = t(`lgpd.type.${normalized}`);
                  const desc = t(`lgpd.type.${normalized}_desc`);

                  return (
                    <label
                      key={type}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={type} className="mt-0.5" />
                      <div className={cn("p-2 rounded-lg bg-muted shrink-0", config.color)}>
                        <RequestIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1">{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Selected Type Details */}
          {selectedConfig && Icon && (
            <Alert>
              <Icon className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{getSelectedTypeLabel()}:</strong> {getSelectedTypeDesc()}
                {(selectedType === "data_deletion" || selectedType === "deletion") && (
                  <div className="mt-2 space-y-2">
                    <p className="text-destructive font-bold">
                      ⚠️ {t("lgpd.dialog.deletionWarningTitle")}
                    </p>
                    <p className="text-destructive italic">
                      {t("lgpd.dialog.deletionWarningText")}
                    </p>
                  </div>
                )}
                {(selectedType === "data_anonymization" || selectedType === "anonymization") && (
                  <p className="mt-2 text-yellow-600">
                    ⚠️ {t("lgpd.dialog.anonymizationWarningText")}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* User Notes */}
          <div className="space-y-2">
            <Label htmlFor="user-notes">{t("lgpd.dialog.notesLabel")}</Label>
            <Textarea
              id="user-notes"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder={t("lgpd.dialog.notesPlaceholder")}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t("lgpd.dialog.maxChars")} ({userNotes.length}/500)
            </p>
          </div>

          {/* Warning for sensitive requests */}
          {(selectedType === "data_deletion" || selectedType === "deletion" ||
            selectedType === "data_anonymization" || selectedType === "anonymization") && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t("lgpd.dialog.sensitiveActionWarning")}
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <input
                    type="checkbox"
                    id="confirm-irreversible"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    onChange={(e) => setConfirmedIrreversible(e.target.checked)}
                  />
                  <Label htmlFor="confirm-irreversible" className="text-sm font-medium leading-none cursor-pointer">
                    {t("lgpd.dialog.confirmIrreversible")}
                  </Label>
                </div>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t("lgpd.dialog.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedType ||
                isSubmitting ||
                userNotes.length > 500 ||
                ((selectedType === "data_deletion" || selectedType === "deletion" ||
                  selectedType === "data_anonymization" || selectedType === "anonymization") && !confirmedIrreversible)
              }
              className="flex-1"
            >
              {isSubmitting ? t("lgpd.dialog.sending") : t("lgpd.dialog.send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
