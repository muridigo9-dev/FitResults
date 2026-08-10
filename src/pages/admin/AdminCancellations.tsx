import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserX,
  Clock,
  User,
  Filter,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  CreditCard,
  Search,
  Mail,
  Phone,
  Calendar
} from "lucide-react";
import { useAdminCancellationRequests, CancellationRequest } from "@/hooks/useCancellationRequests";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CANCELLATION_REASONS: Record<string, string> = {
  price: "Preço",
  missing_features: "Falta de funcionalidades",
  technical_issues: "Problemas técnicos",
  not_using: "Não uso mais",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_review: "Em contato",
  completed: "Cancelado",
  rejected: "Rejeitado",
  contacted: "Contatado",
};

export default function AdminCancellations() {
  const {
    requests,
    isLoading,
    updateRequest,
    isUpdating,
    processCancellation,
    isProcessing,
    pendingCount: fetchedPendingCount,
  } = useAdminCancellationRequests();

  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let result = requests || [];

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }

    // Search by email or user ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.user_id.toLowerCase().includes(query) ||
        r.profiles?.full_name?.toLowerCase().includes(query) ||
        r.profiles?.email?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [requests, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "in_review":
      case "contacted":
        return <Badge variant="default"><MessageSquare className="h-3 w-3 mr-1" />Em contato</Badge>;
      case "completed":
        return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case "rejected":
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSelectRequest = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedRequest) return;

    updateRequest({
      id: selectedRequest.id,
      status,
      admin_notes: adminNotes,
    });

    setSelectedRequest({ ...selectedRequest, status: status as any, admin_notes: adminNotes });
  };

  const handleProcessCancellation = () => {
    if (!selectedRequest) return;

    processCancellation({
      requestId: selectedRequest.id,
      userId: selectedRequest.user_id,
      cancelImmediately,
      adminNotes,
    });

    setShowConfirmDialog(false);
  };

  // Use fetched pending count or calculate from local data
  const pendingCount = fetchedPendingCount || requests?.filter(r => r.status === "pending").length || 0;
  const inReviewCount = requests?.filter(r => r.status === "in_review").length || 0;
  const completedCount = requests?.filter(r => r.status === "completed").length || 0;

  return (
    <AdminLayout title="Cancelamento de Contas">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-destructive">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Contato</p>
                  <p className="text-2xl font-bold text-primary">{inReviewCount}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
                <UserX className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{requests?.length || 0}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="pb-3 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserX className="h-5 w-5" />
                  Solicitações
                  {pendingCount > 0 && (
                    <Badge variant="destructive">{pendingCount}</Badge>
                  )}
                </CardTitle>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email, nome ou ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="in_review">Em contato</SelectItem>
                    <SelectItem value="completed">Canceladas</SelectItem>
                    <SelectItem value="rejected">Rejeitadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma solicitação encontrada</p>
                    {searchQuery && (
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery("")}
                        className="mt-2"
                      >
                        Limpar busca
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map(request => (
                        <TableRow
                          key={request.id}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedRequest?.id === request.id ? "bg-muted" : ""
                            }`}
                          onClick={() => handleSelectRequest(request)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {request.profiles?.full_name || "Usuário"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {request.profiles?.email || request.user_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {CANCELLATION_REASONS[request.reason] || request.reason}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card className="flex flex-col">
            {selectedRequest ? (
              <>
                <CardHeader className="border-b pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">Detalhes</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedRequest.profiles?.full_name || "Usuário"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                  {/* User Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedRequest.profiles?.email || "Email não disponível"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Request Info */}
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Motivo</p>
                      <p className="text-sm">
                        {CANCELLATION_REASONS[selectedRequest.reason] || selectedRequest.reason}
                      </p>
                    </div>

                    {selectedRequest.details && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Feedback</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedRequest.details}
                        </p>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Status Stripe</p>
                      <p className="text-sm">
                        {selectedRequest.stripe_cancellation_status || "Não processado"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Admin Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="adminNotes" className="text-xs font-medium">
                      Notas do Admin (registro de churn)
                    </Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Registre o motivo final, contexto..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>

                  {/* Actions */}
                  {selectedRequest.status !== "completed" && selectedRequest.status !== "rejected" && (
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRequest.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus("in_review")}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Em contato
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus("rejected")}
                          disabled={isUpdating}
                          className="text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={isUpdating || isProcessing}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Processar Cancelamento
                      </Button>
                    </div>
                  )}

                  {/* Processed Info */}
                  {selectedRequest.processed_at && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium text-green-600 mb-1">Processado em</p>
                      <p className="text-sm">
                        {format(new Date(selectedRequest.processed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <div className="text-center">
                  <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Selecione uma solicitação</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Cancelamento
            </AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-4">
              <div>
                Esta ação irá cancelar a assinatura do usuário no Stripe e
                marcar a conta como cancelada no sistema.
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <div className="font-medium text-sm text-foreground">Cancelamento Imediato</div>
                  <div className="text-xs text-muted-foreground">
                    Se desativado, cancela no fim do período atual
                  </div>
                </div>
                <Switch
                  checked={cancelImmediately}
                  onCheckedChange={setCancelImmediately}
                />
              </div>

              <div className="text-sm font-medium text-destructive">
                ⚠️ Esta ação não pode ser desfeita automaticamente.
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProcessCancellation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Cancelamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
