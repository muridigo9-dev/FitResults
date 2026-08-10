import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  User,
  Calendar,
  FileText,
  Play,
  History,
  Download,
  MessageSquare as ChatIcon,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { SupportChatContent } from "@/components/support/SupportChatContent";

import {
  useAdminLGPDRequests,
  useAdminLGPDAuditLogs,
  LGPDRequestWithUser,
  LGPDStatusFilter,
} from "@/hooks/useLGPD";
import { LGPD_TYPE_CONFIG, LGPD_STATUS_CONFIG } from "@/components/lgpd/LGPDRequestCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@/components/states";
import { cn } from "@/lib/utils";

// ==========================================
// REQUEST DETAIL DIALOG
// ==========================================

interface RequestDetailDialogProps {
  request: LGPDRequestWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (requestId: string, notes?: string) => void;
  onDeny: (requestId: string, justification: string) => void;
  onExecute: (requestId: string, notes?: string) => void;
  onRequestInfo: (requestId: string, notes: string) => void;
  isProcessing: boolean;
}

function RequestDetailDialog({
  request,
  open,
  onOpenChange,
  onApprove,
  onDeny,
  onExecute,
  onRequestInfo,
  isProcessing,
}: RequestDetailDialogProps) {
  const [action, setAction] = useState<"approve" | "deny" | "execute" | "info" | null>(null);
  const [notes, setNotes] = useState("");

  if (!request) return null;

  const typeConfig = LGPD_TYPE_CONFIG[request.request_type];
  const statusConfig = LGPD_STATUS_CONFIG[request.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const handleAction = () => {
    if (!action) return;

    switch (action) {
      case "approve":
        onApprove(request.id, notes || undefined);
        break;
      case "deny":
        if (!notes.trim()) {
          alert("Justificativa é obrigatória para negar uma solicitação");
          return;
        }
        onDeny(request.id, notes);
        break;
      case "execute":
        onExecute(request.id, notes || undefined);
        break;
      case "info":
        if (!notes.trim()) {
          alert("Informações solicitadas são obrigatórias");
          return;
        }
        onRequestInfo(request.id, notes);
        break;
    }

    setAction(null);
    setNotes("");
    onOpenChange(false);
  };

  const canApprove = request.status === "pending" || request.status === "requires_info" || request.status === "under_review";
  const canExecute = request.status === "approved";
  const canRequestInfo = request.status === "pending" || request.status === "under_review";
  const canDeny = request.status === "pending" || request.status === "requires_info" || request.status === "under_review";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", typeConfig.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            {typeConfig.label}
          </DialogTitle>
          <DialogDescription>Detalhes da solicitação LGPD</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <ChatIcon className="h-4 w-4" />
              Chat {request.support_ticket_id && <Badge variant="secondary" className="ml-1 px-1 h-4 min-w-[16px]">!</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 pt-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                <StatusIcon className={cn("h-3 w-3", request.status === "processing" && "animate-spin")} />
                {statusConfig.label}
              </Badge>
            </div>

            {/* User Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.user_avatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{request.user_name || "Usuário"}</p>
                    <p className="text-sm text-muted-foreground truncate">{request.user_email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Solicitado em</p>
                <p className="font-medium">
                  {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {request.resolved_at && (
                <div>
                  <p className="text-muted-foreground mb-1">Resolvido em</p>
                  <p className="font-medium">
                    {format(new Date(request.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              {request.handler_name && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Responsável</p>
                  <p className="font-medium">{request.handler_name}</p>
                </div>
              )}
            </div>

            {/* User Message */}
            {request.user_message && (
              <div>
                <Label className="text-muted-foreground mb-2 block">Mensagem do Usuário</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">{request.user_message}</div>
              </div>
            )}

            {/* Admin Notes */}
            {request.admin_notes && (
              <div>
                <Label className="text-muted-foreground mb-2 block">Observações do Admin</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">{request.admin_notes}</div>
              </div>
            )}

            {/* Denial Reason */}
            {request.denial_reason && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Justificativa da Negação</AlertTitle>
                <AlertDescription>{request.denial_reason}</AlertDescription>
              </Alert>
            )}

            {/* Data Export URL */}
            {request.data_export_url && (
              <div>
                <Label className="text-muted-foreground mb-2 block">Dados Exportados</Label>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href={request.data_export_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Dados
                  </a>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="communication" className="pt-4">
            {request.support_ticket_id ? (
              <div className="border rounded-xl overflow-hidden bg-muted/30">
                <SupportChatContent
                  ticketId={request.support_ticket_id}
                  userId={request.user_id}
                  subject={`LGPD: ${typeConfig.label}`}
                  isAdmin={true}
                />
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                  <ChatIcon className="h-6 w-6" />
                </div>
                <div className="max-w-[280px] mx-auto">
                  <p className="text-sm font-medium">Chat não iniciado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O chat será habilitado automaticamente quando você solicitar mais informações ao usuário.
                  </p>
                </div>
                {!action && canRequestInfo && (
                  <Button variant="outline" size="sm" onClick={() => setAction("info")}>
                    Solicitar Informações Agora
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Selection */}
        <div className="border-t pt-4">
          <Label>Ações Disponíveis</Label>
          <div className="grid grid-cols-2 gap-3">
            {canApprove && (
              <Button onClick={() => setAction("approve")} variant="default">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            )}
            {canExecute && (
              <Button onClick={() => setAction("execute")} variant="default">
                <Play className="h-4 w-4 mr-2" />
                Executar
              </Button>
            )}
            {canRequestInfo && (
              <Button onClick={() => setAction("info")} variant="outline">
                <Info className="h-4 w-4 mr-2" />
                Solicitar Info
              </Button>
            )}
            {canDeny && (
              <Button onClick={() => setAction("deny")} variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Negar
              </Button>
            )}
          </div>
        </div>

        {/* Action Form */}
        {action && (
          <div className="pt-4 border-t space-y-3">
            <div>
              <Label>
                {action === "deny"
                  ? "Justificativa *"
                  : action === "info"
                    ? "Informações Solicitadas *"
                    : "Observações (Opcional)"}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  action === "deny"
                    ? "Explique o motivo da negação..."
                    : action === "info"
                      ? "Descreva as informações necessárias..."
                      : "Adicione observações..."
                }
                className="mt-2"
                rows={4}
              />
            </div>

            {(action === "execute" && (request.request_type === "deletion" || request.request_type === "anonymization")) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Esta ação é irreversível e será executada imediatamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {action ? (
            <>
              <Button variant="outline" onClick={() => { setAction(null); setNotes(""); }} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button onClick={handleAction} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Confirmar"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}

// ==========================================
// REQUEST LIST ITEM
// ==========================================

interface RequestListItemProps {
  request: LGPDRequestWithUser;
  onClick: () => void;
}

function RequestListItem({ request, onClick }: RequestListItemProps) {
  const typeConfig = LGPD_TYPE_CONFIG[request.request_type];
  const statusConfig = LGPD_STATUS_CONFIG[request.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* User Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={request.user_avatar || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>

          {/* Request Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("p-1.5 rounded-lg bg-muted shrink-0", typeConfig.color)}>
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{typeConfig.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{request.user_name || request.user_email}</p>
                </div>
              </div>
              <Badge variant={statusConfig.variant} className="flex items-center gap-1 shrink-0">
                <StatusIcon className={cn("h-3 w-3", request.status === "processing" && "animate-spin")} />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(request.requested_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              {request.resolved_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Resolvido
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function AdminLGPD() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<LGPDStatusFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<LGPDRequestWithUser | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const {
    requests,
    isLoading,
    statusCounts,
    approveRequest,
    isApproving,
    denyRequest,
    isDenying,
    executeRequest,
    isExecuting,
    requestInfo,
    isRequestingInfo,
  } = useAdminLGPDRequests(statusFilter);

  const { logs: auditLogs, isLoading: isLoadingLogs } = useAdminLGPDAuditLogs();

  const isProcessing = isApproving || isDenying || isExecuting || isRequestingInfo;

  return (
    <AdminLayout title="Gestão LGPD">
      <div className="space-y-6">
        {/* Header Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Sistema de Gestão LGPD</AlertTitle>
          <AlertDescription>
            Gerencie solicitações de privacidade dos usuários conforme a Lei Geral de Proteção de
            Dados. Todas as ações são auditadas e irreversíveis.
          </AlertDescription>
        </Alert>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" />
                Processando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.processing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={showAuditLogs ? "audit" : "requests"} onValueChange={(v) => setShowAuditLogs(v === "audit")}>
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Solicitações ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Auditoria ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Solicitações LGPD</CardTitle>
                    <CardDescription>Gerencie todas as solicitações de privacidade</CardDescription>
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as LGPDStatusFilter)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas ({statusCounts.total})</SelectItem>
                      <SelectItem value="pending">Pendentes ({statusCounts.pending})</SelectItem>
                      <SelectItem value="approved">Aprovadas</SelectItem>
                      <SelectItem value="processing">Processando ({statusCounts.processing})</SelectItem>
                      <SelectItem value="completed">Concluídas ({statusCounts.completed})</SelectItem>
                      <SelectItem value="denied">Negadas</SelectItem>
                      <SelectItem value="failed">Falhas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhuma solicitação"
                    description="Não há solicitações LGPD com este filtro"
                  />
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {requests.map((request) => (
                        <RequestListItem
                          key={request.id}
                          request={request}
                          onClick={() => setSelectedRequest(request)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>Histórico completo de ações LGPD</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="Nenhum log"
                    description="Nenhuma ação foi registrada ainda"
                  />
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-medium text-sm">{log.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">{log.description}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Detail Dialog */}
      <RequestDetailDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        onApprove={(requestId, adminNotes) => approveRequest({
          requestId,
          userId: selectedRequest?.user_id!,
          requestType: selectedRequest?.request_type!,
          adminNotes
        })}
        onDeny={(requestId, justification) => denyRequest({
          requestId,
          userId: selectedRequest?.user_id!,
          requestType: selectedRequest?.request_type!,
          justification
        })}
        onExecute={(requestId, adminNotes) => executeRequest({
          requestId,
          userId: selectedRequest?.user_id!,
          requestType: selectedRequest?.request_type!,
          adminNotes
        })}
        onRequestInfo={(requestId, adminNotes) => requestInfo({
          requestId,
          userId: selectedRequest?.user_id!,
          requestType: selectedRequest?.request_type!,
          adminNotes
        })}
        isProcessing={isProcessing}
      />
    </AdminLayout>
  );
}

export default AdminLGPD;
