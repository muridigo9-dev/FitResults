/**
 * AdminImpersonationLogs Page
 * 
 * Página para visualizar logs de impersonação
 * Auditoria completa e LGPD compliant
 */

import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useImpersonationLogs } from "@/hooks/useImpersonation";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Shield, 
  Clock, 
  User, 
  Calendar,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";

export default function AdminImpersonationLogs() {
  const { data: logs, isLoading } = useImpersonationLogs();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-success">Ativa</Badge>;
      case "ended":
        return <Badge variant="secondary">Encerrada</Badge>;
      case "expired":
        return <Badge variant="outline">Expirada</Badge>;
      case "revoked":
        return <Badge variant="destructive">Revogada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return "—";
    
    // Parse PostgreSQL interval format (e.g., "00:15:30")
    const match = duration.match(/(\d+):(\d+):(\d+)/);
    if (!match) return duration;

    const [, hours, minutes, seconds] = match;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const s = parseInt(seconds);

    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Logs de Impersonação
          </h1>
          <p className="text-muted-foreground mt-2">
            Auditoria completa de todas as sessões de impersonação (LGPD compliant)
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Sessões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessões Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {logs?.filter(l => l.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Encerradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs?.filter(l => l.status === "ended").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expiradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {logs?.filter(l => l.status === "expired").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Impersonações</CardTitle>
            <CardDescription>
              Todas as sessões de impersonação são registradas para auditoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <AnimatedLoader type="progress" message="Carregando logs..." />
            ) : !logs || logs.length === 0 ? (
              <EmptyState
                type="no-data"
                title="Nenhum log encontrado"
                description="Não há registros de impersonação ainda"
              />
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Main Info */}
                      <div className="flex-1 space-y-3">
                        {/* Admin and User */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{log.admin_name || log.admin_email}</span>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{log.impersonated_name || log.impersonated_email}</span>
                          </div>
                        </div>

                        {/* Reason */}
                        {log.reason && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground">{log.reason}</span>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                          
                          {log.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Duração: {formatDuration(log.duration)}
                            </div>
                          )}

                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.ip_address}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(log.status)}
                        {log.status === "active" && log.started_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.started_at), {
                              locale: ptBR,
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Conformidade LGPD</p>
                <p className="text-muted-foreground">
                  Todos os logs de impersonação são mantidos por questões de auditoria e compliance.
                  Estes registros são imutáveis e servem como prova de acesso para fins de transparência
                  e proteção de dados pessoais, conforme exigido pela Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
