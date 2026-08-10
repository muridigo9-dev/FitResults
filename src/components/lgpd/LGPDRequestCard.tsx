import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileText,
  Edit,
  Download,
  UserX,
  Trash2,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info
} from "lucide-react";
import { LGPDRequest, LGPDRequestType, LGPDRequestStatus, useLGPD } from "@/hooks/useLGPD";
import { SupportChatContent } from "@/components/support/SupportChatContent";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

// ==========================================
// LGPD REQUEST TYPE CONFIG
// ==========================================

export const LGPD_TYPE_CONFIG: Record<
  LGPDRequestType,
  { icon: typeof Shield; color: string }
> = {
  data_confirmation: {
    icon: Shield,
    color: "text-blue-600",
  },
  data_access: {
    icon: FileText,
    color: "text-green-600",
  },
  data_correction: {
    icon: Edit,
    color: "text-orange-600",
  },
  data_portability: {
    icon: Download,
    color: "text-purple-600",
  },
  data_anonymization: {
    icon: UserX,
    color: "text-yellow-600",
  },
  data_deletion: {
    icon: Trash2,
    color: "text-red-600",
  },
  consent_revocation: {
    icon: Ban,
    color: "text-gray-600",
  },
  // Compatibility with short names if they still arrive
  confirmation: { icon: Shield, color: "text-blue-600" },
  access: { icon: FileText, color: "text-green-600" },
  correction: { icon: Edit, color: "text-orange-600" },
  portability: { icon: Download, color: "text-purple-600" },
  anonymization: { icon: UserX, color: "text-yellow-600" },
  deletion: { icon: Trash2, color: "text-red-600" },
  revocation: { icon: Ban, color: "text-gray-600" },
};

// ==========================================
// LGPD REQUEST STATUS CONFIG
// ==========================================

export const LGPD_STATUS_CONFIG: Record<
  LGPDRequestStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; color: string }
> = {
  pending: {
    variant: "outline",
    icon: Clock,
    color: "text-yellow-600",
  },
  approved: {
    variant: "default",
    icon: CheckCircle,
    color: "text-green-600",
  },
  denied: {
    variant: "destructive",
    icon: XCircle,
    color: "text-red-600",
  },
  requires_info: {
    variant: "outline",
    icon: Info,
    color: "text-blue-600",
  },
  under_review: {
    variant: "outline",
    icon: Clock,
    color: "text-blue-600",
  },
  cancelled: {
    variant: "secondary",
    icon: XCircle,
    color: "text-gray-400",
  },
  processing: {
    variant: "secondary",
    icon: Loader2,
    color: "text-blue-600",
  },
  completed: {
    variant: "default",
    icon: CheckCircle,
    color: "text-green-600",
  },
  failed: {
    variant: "destructive",
    icon: AlertCircle,
    color: "text-red-600",
  },
};

// ==========================================
// LGPD REQUEST CARD COMPONENT
// ==========================================

interface LGPDRequestCardProps {
  request: LGPDRequest;
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function LGPDRequestCard({
  request,
  onClick,
  showDetails = false,
  className,
}: LGPDRequestCardProps) {
  const { t, language } = useI18n();
  const typeConfig = LGPD_TYPE_CONFIG[request.request_type];
  const statusConfig = LGPD_STATUS_CONFIG[request.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const isClickable = !!onClick;

  const dateLocale = (language as string) === 'pt-BR' ? ptBR : (language as string) === 'es-ES' ? es : enUS;

  // Resolve type label and description dynamically
  // Handle legacy short names by mapping them or asking for translation
  // Ideally, translation keys match request_type.
  // We'll normalize short names to long names for translation lookup if needed
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

  const normalizedType = getNormalizedType(request.request_type);
  const typeLabel = t(`lgpd.type.${normalizedType}`);
  const typeDesc = t(`lgpd.type.${normalizedType}_desc`);
  const statusLabel = t(`lgpd.status.${request.status}`);

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg bg-muted shrink-0", typeConfig.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">
                {typeLabel}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                {typeDesc}
              </p>
            </div>
          </div>
          <div className="flex justify-end sm:block">
            <Badge
              variant={statusConfig.variant}
              className="flex items-center gap-1 whitespace-nowrap text-[10px] py-0.5"
            >
              <StatusIcon
                className={cn("h-3 w-3", request.status === "processing" && "animate-spin")}
              />
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex flex-col min-[350px]:flex-row gap-3 min-[350px]:gap-8 text-[10px] sm:text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">{t("lgpd.card.requestedAt")}</p>
              <p className="font-medium whitespace-nowrap">
                {format(new Date(request.requested_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`, {
                  locale: dateLocale,
                })}
              </p>
            </div>
            {request.resolved_at && (
              <div>
                <p className="text-muted-foreground mb-0.5">{t("lgpd.card.resolvedAt")}</p>
                <p className="font-medium whitespace-nowrap">
                  {format(new Date(request.resolved_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`, {
                    locale: dateLocale,
                  })}
                </p>
              </div>
            )}
          </div>

          {showDetails && request.user_message && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">{t("lgpd.card.userNotes")}</p>
              <p className="text-sm">{request.user_message}</p>
            </div>
          )}

          {showDetails && request.admin_notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">{t("lgpd.card.adminNotes")}</p>
              <p className="text-sm">{request.admin_notes}</p>
            </div>
          )}

          {showDetails && request.denial_reason && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">{t("lgpd.card.denialReason")}</p>
              <p className="text-sm text-red-600">{request.denial_reason}</p>
            </div>
          )}

          {showDetails && request.support_ticket_id && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <AlertCircle className="h-3 w-3" />
                {t("lgpd.card.supportChat")}
              </div>
              <div className="border rounded-xl overflow-hidden bg-muted/20 min-h-[300px]">
                <SupportChatContent
                  ticketId={request.support_ticket_id}
                  userId={request.user_id}
                  subject={`LGPD: ${typeLabel}`}
                  isAdmin={false}
                />
              </div>
            </div>
          )}

          {request.data_export_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={request.data_export_url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                {t("lgpd.card.download")}
              </a>
            </Button>
          )}

          {isClickable && (
            <Button variant="ghost" size="sm" className="w-full">
              {t("lgpd.card.viewDetails")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
