import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  UtensilsCrossed,
  Flame,
  Droplets,
  Target,
  Scale,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useComparePeriods,
  usePeriodStatistics,
  getDateRangeForPeriod,
  getPreviousPeriod,
  type PeriodStats,
} from "@/hooks/useProgressCalendar";
import { AnimatedLoader } from "@/components/loaders";
import { cn } from "@/lib/utils";

type PeriodType = "week" | "month" | "year";

export function PeriodComparison() {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [customMode, setCustomMode] = useState(false);

  // Get current period
  const currentPeriod = getDateRangeForPeriod(periodType);
  const previousPeriod = getPreviousPeriod(
    periodType,
    currentPeriod.start,
    currentPeriod.end
  );

  const { data: comparison, isLoading } = useComparePeriods(
    previousPeriod.start,
    previousPeriod.end,
    currentPeriod.start,
    currentPeriod.end
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <AnimatedLoader type="progress" message="Comparando períodos..." />
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return null;
  }

  const { period1, period2, differences } = comparison;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparar Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Tipo de Período</Label>
              <Select
                value={periodType}
                onValueChange={(value) => setPeriodType(value as PeriodType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Período Anterior</p>
              <p className="font-medium">
                {formatDateRange(period1.start_date, period1.end_date)}
              </p>
            </div>
            <div className="text-muted-foreground">vs</div>
            <div className="text-right">
              <p className="text-muted-foreground">Período Atual</p>
              <p className="font-medium">
                {formatDateRange(period2.start_date, period2.end_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Consistency */}
        <ComparisonCard
          title="Consistência"
          icon={Target}
          iconColor="text-primary"
          value1={period1.stats.consistency_percentage}
          value2={period2.stats.consistency_percentage}
          difference={differences.consistency_change}
          unit="%"
          format="percentage"
        />

        {/* Workouts */}
        <ComparisonCard
          title="Treinos"
          icon={Dumbbell}
          iconColor="text-orange-500"
          value1={period1.stats.total_workouts}
          value2={period2.stats.total_workouts}
          difference={differences.workouts_change}
          format="number"
        />

        {/* Meals */}
        <ComparisonCard
          title="Refeições"
          icon={UtensilsCrossed}
          iconColor="text-green-500"
          value1={period1.stats.total_meals}
          value2={period2.stats.total_meals}
          difference={differences.meals_change}
          format="number"
        />

        {/* XP */}
        <ComparisonCard
          title="XP Ganho"
          icon={Flame}
          iconColor="text-accent"
          value1={period1.stats.total_xp}
          value2={period2.stats.total_xp}
          difference={differences.xp_change}
          format="number"
        />

        {/* Water */}
        <ComparisonCard
          title="Taxa de Água"
          icon={Droplets}
          iconColor="text-blue-500"
          value1={period1.stats.water_completion_rate}
          value2={period2.stats.water_completion_rate}
          difference={
            period2.stats.water_completion_rate -
            period1.stats.water_completion_rate
          }
          unit="%"
          format="percentage"
        />

        {/* Weight Change */}
        {differences.weight_change !== null && (
          <ComparisonCard
            title="Variação de Peso"
            icon={Scale}
            iconColor="text-purple-500"
            value1={period1.stats.start_weight || 0}
            value2={period2.stats.end_weight || 0}
            difference={differences.weight_change}
            unit="kg"
            format="weight"
          />
        )}
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <PeriodStatsCard
          title="Período Anterior"
          dateRange={formatDateRange(period1.start_date, period1.end_date)}
          stats={period1.stats}
        />
        <PeriodStatsCard
          title="Período Atual"
          dateRange={formatDateRange(period2.start_date, period2.end_date)}
          stats={period2.stats}
        />
      </div>
    </div>
  );
}

// Comparison Card Component
interface ComparisonCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  value1: number;
  value2: number;
  difference: number;
  unit?: string;
  format: "number" | "percentage" | "weight";
}

function ComparisonCard({
  title,
  icon: Icon,
  iconColor,
  value1,
  value2,
  difference,
  unit = "",
  format,
}: ComparisonCardProps) {
  const isPositive = difference > 0;
  const isNegative = difference < 0;
  const isNeutral = difference === 0;

  const formatValue = (value: number) => {
    if (format === "percentage") {
      return value.toFixed(1);
    }
    if (format === "weight") {
      return value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", iconColor)} />
              <span className="text-sm font-medium">{title}</span>
            </div>
            {!isNeutral && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  isPositive && "text-green-600",
                  isNegative && "text-red-600"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(difference).toFixed(format === "weight" ? 2 : 1)}
                {unit}
              </div>
            )}
            {isNeutral && (
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Minus className="w-3 h-3" />
                Igual
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Anterior</p>
              <p className="text-lg font-bold">
                {formatValue(value1)}
                {unit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Atual</p>
              <p className="text-lg font-bold">
                {formatValue(value2)}
                {unit}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Period Stats Card
interface PeriodStatsCardProps {
  title: string;
  dateRange: string;
  stats: PeriodStats;
}

function PeriodStatsCard({ title, dateRange, stats }: PeriodStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{dateRange}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatRow
          label="Dias com Check-in"
          value={`${stats.complete_days + stats.partial_days} / ${stats.total_days}`}
        />
        <StatRow
          label="Consistência"
          value={`${stats.consistency_percentage.toFixed(1)}%`}
        />
        <StatRow label="Treinos" value={stats.total_workouts.toString()} />
        <StatRow label="Refeições" value={stats.total_meals.toString()} />
        <StatRow label="Hábitos" value={stats.total_habits.toString()} />
        <StatRow
          label="Tarefas de Desafios"
          value={stats.total_challenge_tasks.toString()}
        />
        <StatRow label="XP Total" value={stats.total_xp.toString()} />
        <StatRow
          label="Conquistas"
          value={stats.total_achievements.toString()}
        />
        {stats.weight_change !== null && (
          <StatRow
            label="Variação de Peso"
            value={`${stats.weight_change > 0 ? "+" : ""}${stats.weight_change.toFixed(2)} kg`}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Stat Row Component
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// Helper function to format date range
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  const startFormatted = startDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const endFormatted = endDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startFormatted} - ${endFormatted}`;
}
