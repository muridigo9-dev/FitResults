import { WeightData } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";

interface WeightChartProps {
  data: WeightData[];
  isLoading?: boolean;
  period?: "week" | "month" | "year";
}

const chartConfig = {
  weight: {
    label: "Peso",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function WeightChart({ data, isLoading, period }: WeightChartProps) {
  // Filter only days with weight data
  const dataWithWeight = data.filter(d => d.weight !== null);
  const hasData = dataWithWeight.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Peso ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
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
            <Scale className="h-4 w-4" />
            Peso ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ainda sem registros de peso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate min/max for Y axis with some padding
  const weights = dataWithWeight.map(d => d.weight as number);
  const minWeight = Math.min(...weights) - 1;
  const maxWeight = Math.max(...weights) + 1;
  const currentWeight = weights[weights.length - 1];
  const previousWeight = weights.length > 1 ? weights[0] : currentWeight;
  const weightDiff = currentWeight - previousWeight;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Peso ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </span>
          <span className="text-sm font-normal">
            {currentWeight} kg
            {weightDiff !== 0 && (
              <span className={weightDiff < 0 ? "text-green-500 ml-1" : "text-muted-foreground ml-1"}>
                ({weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)})
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <LineChart data={dataWithWeight} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              tickFormatter={(value) => `${value}kg`}
              domain={[minWeight, maxWeight]}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              formatter={(value) => [`${value} kg`, "Peso"]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--background))", stroke: "hsl(var(--foreground))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
