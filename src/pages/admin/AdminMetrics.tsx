import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  UserMinus,
  Calendar,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateRange = "today" | "7days" | "30days" | "custom";

interface MetricsData {
  activeUsers: number;
  activeSubscriptions: number;
  cancelledInPeriod: number;
  churnRate: number;
  grossRevenue: number;
  netRevenue: number;
  mrr: number;
  newSubscriptions: number;
}

export default function AdminMetrics() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  
  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start: Date;
    
    switch (dateRange) {
      case "today":
        start = startOfDay(new Date());
        break;
      case "7days":
        start = startOfDay(subDays(new Date(), 7));
        break;
      case "30days":
      default:
        start = startOfDay(subDays(new Date(), 30));
        break;
    }
    
    return { start, end };
  };

  const { data: stripeSettings } = useQuery({
    queryKey: ["stripe-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stripe_settings")
        .select("*")
        .single();
      return data as { stripe_publishable_key?: string } | null;
    },
  });

  const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-metrics", dateRange],
    queryFn: async (): Promise<MetricsData> => {
      const { start, end } = getDateRange();
      
      // Get active users count
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .or("account_status.is.null,account_status.eq.active");

      // Get cancelled in period
      const { count: cancelledInPeriod } = await (supabase as any)
        .from("account_cancellation_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("processed_at", start.toISOString())
        .lte("processed_at", end.toISOString());

      // Get subscriptions from local records
      const { count: activeSubscriptions } = await (supabase as any)
        .from("user_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get new subscriptions in period
      const { count: newSubscriptions } = await (supabase as any)
        .from("user_subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // Calculate churn rate
      const usersAtStart = (activeUsers || 0) + (cancelledInPeriod || 0);
      const churnRate = usersAtStart > 0 
        ? ((cancelledInPeriod || 0) / usersAtStart) * 100 
        : 0;

      // Note: Real revenue data would come from Stripe API
      // For now, showing estimated values based on subscriptions
      const avgPlanValue = 49.90; // Example average plan value
      const grossRevenue = (activeSubscriptions || 0) * avgPlanValue;
      const netRevenue = grossRevenue * 0.85; // After fees
      const mrr = grossRevenue;

      return {
        activeUsers: activeUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        cancelledInPeriod: cancelledInPeriod || 0,
        churnRate: Math.round(churnRate * 100) / 100,
        grossRevenue,
        netRevenue,
        mrr,
        newSubscriptions: newSubscriptions || 0,
      };
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const MetricCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend,
    trendValue 
  }: { 
    title: string; 
    value: string | number; 
    description?: string;
    icon: typeof Users;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${
                trend === "up" ? "text-green-500" : 
                trend === "down" ? "text-red-500" : 
                "text-muted-foreground"
              }`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : 
                 trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  const { start, end } = getDateRange();

  return (
    <AdminLayout title="Métricas Financeiras">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(start, "dd/MM/yyyy", { locale: ptBR })} - {format(end, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Warning if Stripe not configured */}
        {!stripeSettings?.stripe_publishable_key && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Stripe não configurado</p>
                <p className="text-sm text-muted-foreground">
                  Configure o Stripe em Admin → Stripe para obter métricas reais de faturamento.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Usuários Ativos"
            value={metrics?.activeUsers || 0}
            description="Total de contas ativas"
            icon={Users}
          />
          <MetricCard
            title="Assinaturas Ativas"
            value={metrics?.activeSubscriptions || 0}
            description="Planos pagos ativos"
            icon={CreditCard}
          />
          <MetricCard
            title="Cancelamentos"
            value={metrics?.cancelledInPeriod || 0}
            description="No período selecionado"
            icon={UserMinus}
            trend={metrics?.cancelledInPeriod && metrics.cancelledInPeriod > 0 ? "down" : "neutral"}
          />
          <MetricCard
            title="Taxa de Churn"
            value={`${metrics?.churnRate || 0}%`}
            description="Cancelamentos / Usuários"
            icon={TrendingDown}
            trend={metrics?.churnRate && metrics.churnRate > 5 ? "down" : "neutral"}
          />
        </div>

        {/* Revenue Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="MRR (Receita Recorrente)"
            value={formatCurrency(metrics?.mrr || 0)}
            description="Mensal estimado"
            icon={DollarSign}
          />
          <MetricCard
            title="Faturamento Bruto"
            value={formatCurrency(metrics?.grossRevenue || 0)}
            description="Antes de taxas"
            icon={TrendingUp}
          />
          <MetricCard
            title="Faturamento Líquido"
            value={formatCurrency(metrics?.netRevenue || 0)}
            description="Após taxas (~15%)"
            icon={DollarSign}
          />
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Novas Assinaturas</CardTitle>
              <CardDescription>No período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-primary">
                    +{metrics?.newSubscriptions || 0}
                  </div>
                  <Badge variant="secondary" className="text-green-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Novos clientes
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saúde do Negócio</CardTitle>
              <CardDescription>Análise geral</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retenção</span>
                    <span className="font-medium">
                      {100 - (metrics?.churnRate || 0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV Estimado</span>
                    <span className="font-medium">
                      {formatCurrency((metrics?.mrr || 0) / Math.max(metrics?.churnRate || 1, 1) * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Growth</span>
                    <span className={`font-medium ${
                      (metrics?.newSubscriptions || 0) > (metrics?.cancelledInPeriod || 0) 
                        ? "text-green-500" 
                        : "text-red-500"
                    }`}>
                      {(metrics?.newSubscriptions || 0) - (metrics?.cancelledInPeriod || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Note */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Os valores de faturamento são estimativas baseadas nos registros locais. 
              Para dados precisos em tempo real, configure a integração completa com o Stripe 
              via webhooks em Admin → Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
