import { WorkoutData } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

interface WorkoutsChartProps {
  data: WorkoutData[];
  isLoading?: boolean;
  period?: "week" | "month" | "year";
}

const chartConfig = {
  sessions: {
    label: "Sessões",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export function WorkoutsChart({ data, isLoading, period }: WorkoutsChartProps) {
  const hasData = data.some(d => d.sessions > 0);
  const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-accent" />
            Treinos ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
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
            <Dumbbell className="h-4 w-4 text-accent" />
            Treinos ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ainda sem treinos registrados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-accent" />
            Treinos ({period === "year" ? "Anual" : period === "month" ? "Mensal" : "Semanal"})
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalSessions} sessões
          </span>
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
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              formatter={(value) => [value, "Sessões"]}
            />
            <Bar
              dataKey="sessions"
              fill="hsl(var(--accent))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
