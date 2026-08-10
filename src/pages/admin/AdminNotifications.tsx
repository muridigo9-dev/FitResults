/**
 * Admin Notifications Panel
 * 
 * Manage notification templates, view logs, and test notifications
 */

import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, FileText, TestTube2, Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  event_type: string;
  channel: string;
  target_audience: string;
  is_active: boolean;
  priority: number;
  throttle_minutes: number;
  title_template: string;
  body_template: string;
  action_url_template: string;
  created_at: string;
}

interface NotificationLog {
  id: string;
  event_type: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  user_id: string;
  push_sent_at: string | null;
  in_app_sent_at: string | null;
  push_error: string | null;
  in_app_error: string | null;
  created_at: string;
}

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  // Fetch logs
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["admin-notification-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("status")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const sent = data.filter((l) => l.status === "sent").length;
      const failed = data.filter((l) => l.status === "failed").length;
      const pending = data.filter((l) => l.status === "pending").length;
      const skipped = data.filter((l) => l.status === "skipped").length;

      return { sent, failed, pending, skipped, total: data.length };
    },
  });

  // Toggle template active status
  const toggleTemplateActive = async (templateId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("notification_templates")
      .update({ is_active: !currentStatus })
      .eq("id", templateId);

    if (!error) {
      refetchTemplates();
    }
  };

  // Filter templates
  const filteredTemplates = templates?.filter((t) =>
    searchQuery
      ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.event_type.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
            <p className="text-muted-foreground">
              Gerencie templates, visualize logs e teste notificações
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas (7d)</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sent || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total ? Math.round((stats.sent / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhadas (7d)</CardTitle>
              <Bell className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.failed || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total ? Math.round((stats.failed / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skipped (7d)</CardTitle>
              <Bell className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.skipped || 0}</div>
              <p className="text-xs text-muted-foreground">Throttle aplicado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Ativos</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates?.filter((t) => t.is_active).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                de {templates?.length || 0} templates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="templates">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Bell className="mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube2 className="mr-2 h-4 w-4" />
              Testar
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Templates de Notificação</CardTitle>
                    <CardDescription>
                      Configure templates para diferentes eventos do sistema
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : filteredTemplates && filteredTemplates.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Badge variant="outline">{template.channel}</Badge>
                            <Badge variant="outline">
                              Prioridade: {template.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Evento:</strong> {template.event_type} |{" "}
                            <strong>Throttle:</strong> {template.throttle_minutes} min |{" "}
                            <strong>Público:</strong> {template.target_audience}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTemplateActive(template.id, template.is_active)}
                          >
                            {template.is_active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum template encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Notificações</CardTitle>
                <CardDescription>
                  Últimas 100 notificações enviadas ou tentadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between p-3 border rounded-lg text-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                log.status === "sent"
                                  ? "default"
                                  : log.status === "failed"
                                  ? "destructive"
                                  : log.status === "skipped"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {log.status}
                            </Badge>
                            <Badge variant="outline">{log.event_type}</Badge>
                            <Badge variant="outline">{log.channel}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="font-medium">{log.title}</p>
                          <p className="text-muted-foreground">{log.body}</p>
                          {(log.push_error || log.in_app_error) && (
                            <p className="text-xs text-red-500 mt-1">
                              Erro: {log.push_error || log.in_app_error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum log encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Testar Notificações</CardTitle>
                <CardDescription>
                  Envie notificações de teste para verificar configurações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <TestTube2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Interface de testes em desenvolvimento
                    </p>
                    <Button>Enviar Teste</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
