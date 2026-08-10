import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

interface CaloriesChartProps {
    data: { day: string; value: number }[];
    isLoading?: boolean;
    period?: "week" | "month" | "year";
}

const chartConfig = {
    value: {
        label: "Calorias",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export function CaloriesChart({ data, isLoading, period }: CaloriesChartProps) {
    const hasData = data.some(d => d.value > 0);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-orange-500" />
                        Calorias ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[160px] bg-muted animate-pulse rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-orange-500" />
                    Calorias ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[160px] flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum consumo registrado</p>
                        </div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[160px] w-full">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                tickMargin={8}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                tickFormatter={(value) => `${value}`}
                            />
                            <ChartTooltip
                                content={<ChartTooltipContent />}
                                formatter={(value) => [value, "Kcal"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorCalories)"
                            />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
