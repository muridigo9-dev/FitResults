import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Clock } from "lucide-react";

export function AdminAuditLog() {
    const { auditLog, isLoadingAudit } = useAdminPermissions();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Histórico de Alterações</h3>
            </div>

            <div className="border rounded-md">
                <ScrollArea className="h-[600px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ação</TableHead>
                                <TableHead>Tabela</TableHead>
                                <TableHead>Detalhes</TableHead>
                                <TableHead>Autor</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingAudit ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Carregando histórico...
                                    </TableCell>
                                </TableRow>
                            ) : auditLog.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                auditLog.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Badge variant={
                                                log.action === 'INSERT' ? 'default' :
                                                    log.action === 'DELETE' ? 'destructive' : 'secondary'
                                            }>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {log.table_name}
                                        </TableCell>
                                        <TableCell className="max-w-md truncate text-xs font-mono">
                                            {JSON.stringify(log.new_value || log.old_value)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-3 w-3" />
                                                <span className="truncate max-w-[100px]" title={log.changed_by}>
                                                    {log.changed_by}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(log.changed_at), {
                                                    addSuffix: true,
                                                    locale: ptBR,
                                                })}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}
