import { WaterData } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from "recharts";

interface WaterChartProps {
  data: WaterData[];
  isLoading?: boolean;
  period?: "week" | "month" | "year";
}

const chartConfig = {
  consumed: {
    label: "Consumido",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function WaterChart({ data, isLoading, period }: WaterChartProps) {
  const hasData = data.some(d => d.consumed > 0);
  const goal = data[0]?.goal || 2.0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            Água ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            Água ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ainda sem dados de água</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" />
          Água ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              tickFormatter={(value) => `${value}L`}
              domain={[0, Math.max(goal + 0.5, 3)]}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              formatter={(value) => [`${value}L`, "Consumido"]}
            />
            <ReferenceLine
              y={goal}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: `Meta: ${goal}L`,
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))'
              }}
            />
            <Bar
              dataKey="consumed"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
