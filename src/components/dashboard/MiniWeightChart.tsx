/**
 * MiniWeightChart Component
 * 
 * Simple line chart for weight history (last 7 days).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightDataPoint {
  date: string;
  weight: number;
}

interface MiniWeightChartProps {
  data: WeightDataPoint[];
}

export function MiniWeightChart({ data }: MiniWeightChartProps) {
  if (!data || data.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Peso (7 dias)</CardTitle>
        </CardHeader>
        <CardContent className="h-[120px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Dados insuficientes</p>
        </CardContent>
      </Card>
    );
  }

  const firstWeight = data[0].weight;
  const lastWeight = data[data.length - 1].weight;
  const diff = lastWeight - firstWeight;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-habit-workout" : trend === "down" ? "text-success" : "text-muted-foreground";

  const chartConfig = {
    weight: {
      label: "Peso",
      color: "hsl(var(--primary))",
    },
  };

  // Calculate Y axis domain with some padding
  const weights = data.map(d => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.2 || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Peso (7 dias)</CardTitle>
          <span className={cn("flex items-center text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3 w-3 mr-0.5" />
            {Math.abs(diff).toFixed(1)} kg
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis 
                dataKey="date" 
                hide 
              />
              <YAxis 
                hide 
                domain={[minWeight - padding, maxWeight + padding]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
