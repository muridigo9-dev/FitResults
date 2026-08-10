import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useEmailLogs } from "@/hooks/useEmailSettings";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const TEMPLATE_TYPES: Record<string, string> = {
  welcome: "Boas-vindas",
  general_notification: "Notificação Geral",
  cancellation_request_received: "Cancelamento Recebido",
  cancellation_processed: "Cancelamento Processado",
  support_reply: "Resposta do Suporte",
  password_reset: "Reset de Senha",
  subscription_renewal: "Renovação de Assinatura",
  trial_expiring: "Trial Expirando",
  custom: "Customizado",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AdminEmailMetrics() {
  const { logs, isLoading, refetch } = useEmailLogs();
  const [period, setPeriod] = useState("7");

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    const days = parseInt(period);
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    return logs.filter((log) =>
      isWithinInterval(new Date(log.sent_at), { start: startDate, end: endDate })
    );
  }, [logs, period]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredLogs.length;
    const sent = filteredLogs.filter((l) => l.status === "sent").length;
    const failed = filteredLogs.filter((l) => l.status === "failed").length;
    const pending = filteredLogs.filter((l) => l.status === "pending").length;

    const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : "0";
    const errorRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0";

    return {
      total,
      sent,
      failed,
      pending,
      deliveryRate,
      errorRate,
    };
  }, [filteredLogs]);

  // Metrics from previous period for comparison
  const previousMetrics = useMemo(() => {
    if (!logs) return { deliveryRate: 0, total: 0 };
    
    const days = parseInt(period);
    const startDate = startOfDay(subDays(new Date(), days * 2));
    const endDate = endOfDay(subDays(new Date(), days));

    const previousLogs = logs.filter((log) =>
      isWithinInterval(new Date(log.sent_at), { start: startDate, end: endDate })
    );

    const total = previousLogs.length;
    const sent = previousLogs.filter((l) => l.status === "sent").length;

    return {
      deliveryRate: total > 0 ? (sent / total) * 100 : 0,
      total,
    };
  }, [logs, period]);

  // Calculate trends
  const deliveryTrend = parseFloat(metrics.deliveryRate) - previousMetrics.deliveryRate;
  const volumeTrend = previousMetrics.total > 0
    ? ((metrics.total - previousMetrics.total) / previousMetrics.total) * 100
    : 0;

  // Pie chart data
  const statusChartData = useMemo(() => [
    { name: "Enviados", value: metrics.sent },
    { name: "Falhas", value: metrics.failed },
    { name: "Pendentes", value: metrics.pending },
  ].filter((d) => d.value > 0), [metrics]);

  // Template breakdown
  const templateBreakdown = useMemo(() => {
    const breakdown: Record<string, { sent: number; failed: number; total: number }> = {};

    filteredLogs.forEach((log) => {
      const type = log.template_type || "manual";
      if (!breakdown[type]) {
        breakdown[type] = { sent: 0, failed: 0, total: 0 };
      }
      breakdown[type].total++;
      if (log.status === "sent") breakdown[type].sent++;
      if (log.status === "failed") breakdown[type].failed++;
    });

    return Object.entries(breakdown)
      .map(([type, data]) => ({
        type,
        name: TEMPLATE_TYPES[type] || type,
        ...data,
        rate: data.total > 0 ? ((data.sent / data.total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  // Daily breakdown for bar chart
  const dailyBreakdown = useMemo(() => {
    const days = parseInt(period);
    const breakdown: Record<string, { date: string; sent: number; failed: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "dd/MM");
      breakdown[date] = { date, sent: 0, failed: 0 };
    }

    filteredLogs.forEach((log) => {
      const date = format(new Date(log.sent_at), "dd/MM");
      if (breakdown[date]) {
        if (log.status === "sent") breakdown[date].sent++;
        if (log.status === "failed") breakdown[date].failed++;
      }
    });

    return Object.values(breakdown);
  }, [filteredLogs, period]);

  // Recent failures
  const recentFailures = useMemo(() => {
    return filteredLogs
      .filter((l) => l.status === "failed")
      .slice(0, 10);
  }, [filteredLogs]);

  return (
    <AdminLayout title="Métricas de E-mail">
      <div className="space-y-6">
        {/* Header with period selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Dashboard de E-mails</h2>
            <p className="text-sm text-muted-foreground">
              Métricas de entrega, falhas e performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enviados</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{metrics.total}</p>
                  )}
                </div>
                <Mail className="h-8 w-8 text-muted-foreground/50" />
              </div>
              {!isLoading && volumeTrend !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${volumeTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                  {volumeTrend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(volumeTrend).toFixed(0)}% vs período anterior
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{metrics.deliveryRate}%</p>
                  )}
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
              {!isLoading && deliveryTrend !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${deliveryTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                  {deliveryTrend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(deliveryTrend).toFixed(1)}% vs período anterior
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Erro</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-destructive">{metrics.errorRate}%</p>
                  )}
                </div>
                <XCircle className="h-8 w-8 text-destructive/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.failed} falhas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">{metrics.pending}</p>
                  )}
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                Volume Diário
              </CardTitle>
              <CardDescription>
                E-mails enviados e falhas por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : dailyBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sent" name="Enviados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Falhas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <Mail className="h-8 w-8 mr-2 opacity-50" />
                  Sem dados no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
              <CardDescription>
                Proporção de entregas vs falhas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <Mail className="h-8 w-8 mr-2 opacity-50" />
                  Sem dados no período
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Breakdown & Recent Failures */}
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Por Template</TabsTrigger>
            <TabsTrigger value="failures">Falhas Recentes</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desempenho por Template</CardTitle>
                <CardDescription>
                  Taxa de sucesso de cada tipo de e-mail
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : templateBreakdown.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Enviados</TableHead>
                          <TableHead className="text-center">Falhas</TableHead>
                          <TableHead className="text-right">Taxa de Sucesso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templateBreakdown.map((template) => (
                          <TableRow key={template.type}>
                            <TableCell>
                              <Badge variant="outline">{template.name}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {template.total}
                            </TableCell>
                            <TableCell className="text-center text-green-600">
                              {template.sent}
                            </TableCell>
                            <TableCell className="text-center text-destructive">
                              {template.failed}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={parseFloat(template.rate) >= 95 ? "text-green-600" : parseFloat(template.rate) >= 80 ? "text-yellow-600" : "text-destructive"}>
                                {template.rate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum e-mail enviado no período</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failures">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Falhas Recentes
                </CardTitle>
                <CardDescription>
                  Últimos 10 erros de envio
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : recentFailures.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Erro</TableHead>
                          <TableHead className="text-right">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentFailures.map((failure) => (
                          <TableRow key={failure.id}>
                            <TableCell className="font-mono text-sm">
                              {failure.user_email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {TEMPLATE_TYPES[failure.template_type || ""] || failure.template_type || "Manual"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-sm text-destructive truncate">
                                {failure.error_message || "Erro desconhecido"}
                              </p>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {format(new Date(failure.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <p>Nenhuma falha no período selecionado!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
