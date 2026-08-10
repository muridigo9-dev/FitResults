/**
 * MiniWaterChart Component
 * 
 * Simple bar chart for water intake history (last 7 days).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface WaterDataPoint {
  date: string;
  amount: number; // in ml
  goal: number; // in ml
}

interface MiniWaterChartProps {
  data: WaterDataPoint[];
}

export function MiniWaterChart({ data }: MiniWaterChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Água (7 dias)</CardTitle>
        </CardHeader>
        <CardContent className="h-[120px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Sem dados</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    amount: {
      label: "Água (L)",
      color: "hsl(var(--habit-water))",
    },
  };

  // Calculate average completion
  const avgCompletion = data.reduce((acc, d) => acc + (d.amount / d.goal) * 100, 0) / data.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Água (7 dias)</CardTitle>
          <span className="text-xs text-muted-foreground">
            Média: {avgCompletion.toFixed(0)}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis 
                dataKey="date" 
                hide 
              />
              <YAxis hide />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => `${((value as number) / 1000).toFixed(1)} L`}
                  />
                } 
              />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              >
                {data.map((entry, index) => {
                  const isComplete = entry.amount >= entry.goal;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isComplete ? "hsl(var(--habit-water))" : "hsl(var(--habit-water) / 0.4)"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
