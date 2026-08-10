import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, TrendingUp } from "lucide-react";
import { CalendarView, PeriodComparison } from "@/components/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  usePeriodStatistics,
  getDateRangeForPeriod,
} from "@/hooks/useProgressCalendar";
import { AnimatedLoader } from "@/components/loaders";

export default function ProgressCalendar() {
  const [activeTab, setActiveTab] = useState("calendar");

  // Get current month stats for overview
  const currentMonth = getDateRangeForPeriod("month");
  const { data: monthStats, isLoading: isLoadingMonth } = usePeriodStatistics(
    currentMonth.start,
    currentMonth.end
  );

  return (
    <AppLayout
      header={{
        title: "Calendário de Evolução",
        showBack: true,
        backTo: "/daily-summary",
      }}
    >
      <div className="py-4 space-y-6">
        {/* Description */}
        <p className="text-muted-foreground text-sm animate-in">
          Visualize seu histórico de check-ins e compare seu progresso ao longo do tempo
        </p>

        {/* Quick Stats */}
        {monthStats && !isLoadingMonth && (
          <div className="grid gap-4 md:grid-cols-4 animate-in-delay-1">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Consistência (Mês)
                </p>
                <p className="text-2xl font-bold">
                  {monthStats.consistency_percentage.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Check-ins Completos
                </p>
                <p className="text-2xl font-bold">{monthStats.complete_days}</p>
                <p className="text-xs text-muted-foreground">
                  de {monthStats.total_days} dias
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Treinos Realizados
                </p>
                <p className="text-2xl font-bold">{monthStats.total_workouts}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">XP Ganho</p>
                <p className="text-2xl font-bold">{monthStats.total_xp}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparação
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Tendências
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6 mt-6">
            <CalendarView />

            {/* Calendar Legend & Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Como usar o calendário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • <strong>Clique em um dia</strong> para ver detalhes do check-in
                </p>
                <p>
                  • <strong>Dias verdes</strong> indicam check-in completo
                </p>
                <p>
                  • <strong>Dias amarelos</strong> indicam check-in parcial
                </p>
                <p>
                  • <strong>Ícone de fogo</strong> indica dias no seu streak atual
                </p>
                <p>
                  • <strong>Ícone de troféu</strong> indica conquistas desbloqueadas
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6 mt-6">
            <PeriodComparison />

            {/* Comparison Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dicas de Comparação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • Compare períodos para identificar padrões de comportamento
                </p>
                <p>
                  • <strong>Setas verdes (↑)</strong> indicam melhora
                </p>
                <p>
                  • <strong>Setas vermelhas (↓)</strong> indicam queda
                </p>
                <p>
                  • Use comparações mensais para avaliar progresso de longo prazo
                </p>
                <p>
                  • Comparações semanais ajudam a ajustar sua rotina rapidamente
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Tendências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-semibold mb-2">
                      Análise de Tendências em Desenvolvimento
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Em breve você poderá visualizar gráficos detalhados de suas
                      tendências de progresso ao longo do tempo, incluindo previsões
                      e insights personalizados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
