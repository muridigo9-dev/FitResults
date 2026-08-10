import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from "recharts";
import { SupportAnalytics } from "@/hooks/useSupport";
import { ThumbsDown, AlertTriangle, TrendingUp, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupportChartsProps {
    data?: SupportAnalytics;
    isLoading: boolean;
}

const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#6366f1"];

export function SupportCharts({ data, isLoading }: SupportChartsProps) {
    if (isLoading) return <div className="h-64 flex items-center justify-center">Carregando insights...</div>;
    if (!data) return null;

    const categoryData = (data.by_category || []).map(c => ({
        name: c.category === 'other' ? 'Outros' : c.category.charAt(0).toUpperCase() + c.category.slice(1),
        count: c.count,
        resTime: c.avg_resolution_seconds ? Math.round(c.avg_resolution_seconds / 3600) : 0
    }));

    const csatDistribution = (data.csat_distribution || []).map(d => ({
        name: `${d.score} Estrela${d.score > 1 ? 's' : ''}`,
        count: d.count
    }));

    const trendData = (data.volume_trend || []).map(v => ({
        date: format(parseISO(v.date), "dd/MM", { locale: ptBR }),
        quantidade: v.count
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            {/* Volume Trend Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Tendência de Volume
                        </CardTitle>
                        <CardDescription>Tickets abertos por dia no período selecionado</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="quantidade"
                                    stroke="#0ea5e9"
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Category Volume & Resolution Time */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Volume por Categoria</CardTitle>
                    <CardDescription>Distribuição dos tickets por assunto</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <History className="h-4 w-4 text-amber-500" />
                        Tempo de Resolução (h)
                    </CardTitle>
                    <CardDescription>Média de horas para fechamento</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="resTime" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* CSAT Distribution */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Satisfação (CSAT)</CardTitle>
                    <CardDescription>Notas dadas pelos usuários</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={csatDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {csatDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Critical Insights */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <div>
                            <CardTitle className="text-sm font-semibold">Alertas de Insatisfação</CardTitle>
                            <CardDescription>Tickets com nota ≤ 2</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[180px] pr-4">
                        <div className="space-y-4">
                            {(data.recent_low_scores || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Excelente! Nenhuma reclamação crítica recente.</p>
                            ) : (
                                (data.recent_low_scores || []).map((ticket) => (
                                    <div key={ticket.id} className="flex items-start gap-4 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                                        <div className="bg-destructive text-white p-1.5 rounded-full mt-1">
                                            <ThumbsDown className="h-3 w-3" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-bold text-xs truncate">{ticket.subject}</p>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {format(parseISO(ticket.created_at), "dd MMM", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground italic line-clamp-2 mb-2">
                                                "{ticket.satisfaction_comment || "Sem comentário."}"
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <div
                                                        key={s}
                                                        className={`h-1 w-4 rounded-full ${s <= ticket.satisfaction_score ? 'bg-destructive' : 'bg-muted'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
