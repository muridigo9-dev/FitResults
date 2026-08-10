/**
 * AdminImpersonation Page
 * 
 * Painel de gerenciamento de impersonação de usuários
 * Exibe logs, estatísticas e permite iniciar impersonações
 */

import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StartImpersonationDialog } from "@/components/admin/StartImpersonationDialog";
import { useImpersonationLogs, useImpersonationStats } from "@/hooks/useImpersonation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  UserCog,
  Search,
  Activity,
  Users,
  Clock,
  TrendingUp,
  Shield,
  AlertCircle,
} from "lucide-react";
import { AnimatedLoader, EmptyState } from "@/components/loaders";

export default function AdminImpersonation() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch logs
  const { data: logs, isLoading: logsLoading } = useImpersonationLogs();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useImpersonationStats();

  // Fetch users for impersonation
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users-for-impersonation", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .neq("role", "admin") // Cannot impersonate other admins
        .order("email");

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" />
            Impersonação de Usuários
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie sessões de impersonação para suporte técnico e testes
          </p>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <AnimatedLoader type="progress" message="Carregando estatísticas..." />
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Impersonações
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total_impersonations}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessões Ativas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {stats.active_impersonations}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Usuários Impersonados
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.unique_impersonated_users}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Duração Média
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats.avg_duration_minutes)} min
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Shield className="h-4 w-4 mr-2" />
              Logs de Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Usuário</CardTitle>
                <CardDescription>
                  Busque por email ou nome para iniciar uma impersonação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite email ou nome (mínimo 2 caracteres)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {searchTerm.length >= 2 && (
                  <div className="mt-4">
                    {usersLoading ? (
                      <AnimatedLoader type="progress" message="Buscando usuários..." />
                    ) : users && users.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => {
                            const isTestUser = user.email.includes("@test.com");
                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.email}
                                </TableCell>
                                <TableCell>{user.full_name || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{user.role}</Badge>
                                    {isTestUser && (
                                      <Badge variant="secondary">Teste</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <StartImpersonationDialog
                                    targetUserId={user.id}
                                    targetUserEmail={user.email}
                                    isTestUser={isTestUser}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <EmptyState
                        type="no-results"
                        title="Nenhum usuário encontrado"
                        description="Tente buscar por outro email ou nome"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Impersonações</CardTitle>
                <CardDescription>
                  Logs completos de todas as sessões de impersonação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <AnimatedLoader type="progress" message="Carregando logs..." />
                ) : logs && logs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin</TableHead>
                        <TableHead>Usuário Impersonado</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.admin.email}</div>
                              {log.admin.profiles?.full_name && (
                                <div className="text-xs text-muted-foreground">
                                  {log.admin.profiles.full_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {log.impersonated.email}
                              </div>
                              {log.impersonated.profiles?.full_name && (
                                <div className="text-xs text-muted-foreground">
                                  {log.impersonated.profiles.full_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.reason ? (
                              <span className="text-sm">{log.reason}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Usuário de teste
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.started_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            {formatDuration(log.started_at, log.ended_at)}
                          </TableCell>
                          <TableCell>
                            {log.is_active ? (
                              <Badge variant="default" className="bg-success">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Encerrada</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    type="no-data"
                    title="Nenhuma impersonação registrada"
                    description="Os logs de impersonação aparecerão aqui"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* LGPD Compliance Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-5 w-5" />
              Aviso de Compliance LGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              O sistema de impersonação está em conformidade com a LGPD (Lei
              Geral de Proteção de Dados).
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Todas as sessões são auditadas e registradas</li>
              <li>Justificativa obrigatória para usuários reais</li>
              <li>Sessões expiram automaticamente</li>
              <li>Usuários com bloqueio LGPD não podem ser impersonados</li>
              <li>Logs são imutáveis e rastreáveis</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
