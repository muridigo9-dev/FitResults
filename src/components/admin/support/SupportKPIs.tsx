import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    MessageSquare,
    Clock,
    CheckCircle,
    TrendingUp,
    Star,
    Activity
} from "lucide-react";
import { SupportAnalytics } from "@/hooks/useSupport";

interface SupportKPIsProps {
    data?: SupportAnalytics["kpis"];
    isLoading: boolean;
}

export function SupportKPIs({ data, isLoading }: SupportKPIsProps) {
    const formatSeconds = (seconds: number | null) => {
        if (seconds === null) return "--";
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
    };

    const kpis = [
        {
            title: "Tickets Abertos",
            value: data?.open_tickets ?? 0,
            icon: MessageSquare,
            color: "text-destructive",
            description: "Aguardando resposta",
        },
        {
            title: "Em Andamento",
            value: data?.in_progress ?? 0,
            icon: Activity,
            color: "text-blue-500",
            description: "Conversas ativas",
        },
        {
            title: "Tempo de Resposta (FRT)",
            value: formatSeconds(data?.avg_frt_seconds ?? null),
            icon: Clock,
            color: "text-amber-500",
            description: "Média 1ª resposta",
        },
        {
            title: "Resolução (MTTR)",
            value: formatSeconds(data?.avg_mttr_seconds ?? null),
            icon: CheckCircle,
            color: "text-green-500",
            description: "Média fechamento",
        },
        {
            title: "Satisfação (CSAT)",
            value: data?.csat_avg ? `${data.csat_avg}/5` : "--",
            icon: Star,
            color: "text-yellow-500",
            description: "Nota média usuários",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpis.map((kpi, i) => (
                <Card key={i} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {kpi.title}
                        </CardTitle>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {kpi.description}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
