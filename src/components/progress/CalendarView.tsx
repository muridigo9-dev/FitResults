import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  UtensilsCrossed,
  Trophy,
  Flame,
  Award,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarMonth, useStreakDays, type DayData } from "@/hooks/useProgressCalendar";
import { AnimatedLoader } from "@/components/loaders";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface CalendarViewProps {
  onDayClick?: (day: DayData) => void;
}

export function CalendarView({ onDayClick }: CalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const { data: monthData, isLoading } = useCalendarMonth(currentYear, currentMonth);
  const { data: streakDays } = useStreakDays();

  // Create a map for quick lookup
  const dataMap = new Map<string, DayData>();
  monthData?.forEach((day) => {
    dataMap.set(day.date, day);
  });

  const streakDatesSet = new Set(streakDays?.map((d) => d.date) || []);

  // Get first day of month and total days
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day);
    onDayClick?.(day);
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayData = dataMap.get(dateStr);
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() + 1 &&
        currentYear === today.getFullYear();
      const isInStreak = streakDatesSet.has(dateStr);

      days.push(
        <CalendarDay
          key={day}
          day={day}
          data={dayData}
          isToday={isToday}
          isInStreak={isInStreak}
          onClick={() => dayData && handleDayClick(dayData)}
        />
      );
    }

    return days;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <AnimatedLoader type="progress" message="Carregando calendário..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {MONTHS[currentMonth - 1]} {currentYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendarDays()}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500" />
              <span className="text-muted-foreground">Completo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20 border-2 border-yellow-500" />
              <span className="text-muted-foreground">Parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border border-border" />
              <span className="text-muted-foreground">Sem check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-muted-foreground">Streak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Check-in de {selectedDay && new Date(selectedDay.date + "T00:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>

          {selectedDay && <DayDetailContent day={selectedDay} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Calendar Day Component
interface CalendarDayProps {
  day: number;
  data?: DayData;
  isToday: boolean;
  isInStreak: boolean;
  onClick: () => void;
}

function CalendarDay({ day, data, isToday, isInStreak, onClick }: CalendarDayProps) {
  const hasData = !!data;
  const isComplete = data?.completion_status === "complete";
  const isPartial = data?.completion_status === "partial";

  return (
    <motion.button
      whileHover={{ scale: hasData ? 1.05 : 1 }}
      whileTap={{ scale: hasData ? 0.95 : 1 }}
      onClick={hasData ? onClick : undefined}
      disabled={!hasData}
      className={cn(
        "aspect-square rounded-lg border-2 p-1 relative transition-colors",
        "flex flex-col items-center justify-center",
        isToday && "ring-2 ring-primary ring-offset-2",
        isComplete && "bg-green-500/20 border-green-500 hover:bg-green-500/30",
        isPartial && "bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30",
        !hasData && "bg-muted border-border opacity-50 cursor-default",
        hasData && !isComplete && !isPartial && "border-border hover:border-primary"
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          "text-sm font-medium",
          isComplete && "text-green-700 dark:text-green-300",
          isPartial && "text-yellow-700 dark:text-yellow-300",
          !hasData && "text-muted-foreground"
        )}
      >
        {day}
      </span>

      {/* Activity indicators */}
      {hasData && (
        <div className="flex items-center gap-0.5 mt-1">
          {data.workouts_count > 0 && (
            <Dumbbell className="w-2.5 h-2.5 text-orange-500" />
          )}
          {data.meals_count > 0 && (
            <UtensilsCrossed className="w-2.5 h-2.5 text-green-500" />
          )}
          {data.water_completed && (
            <Droplets className="w-2.5 h-2.5 text-blue-500" />
          )}
          {data.challenge_tasks_count > 0 && (
            <Trophy className="w-2.5 h-2.5 text-purple-500" />
          )}
        </div>
      )}

      {/* Streak indicator */}
      {isInStreak && (
        <Flame className="absolute -top-1 -right-1 w-3 h-3 text-orange-500" />
      )}

      {/* Achievements indicator */}
      {data && data.achievements_count > 0 && (
        <Award className="absolute -bottom-1 -right-1 w-3 h-3 text-yellow-500" />
      )}
    </motion.button>
  );
}

// Day Detail Content
function DayDetailContent({ day }: { day: DayData }) {
  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge
          variant={
            day.completion_status === "complete"
              ? "default"
              : day.completion_status === "partial"
              ? "secondary"
              : "outline"
          }
        >
          {day.completion_status === "complete"
            ? "✓ Check-in Completo"
            : day.completion_status === "partial"
            ? "⚠ Check-in Parcial"
            : "✗ Sem Check-in"}
        </Badge>

        {day.xp_earned > 0 && (
          <div className="flex items-center gap-1 text-sm text-primary">
            <Flame className="w-4 h-4" />
            <span className="font-semibold">+{day.xp_earned} XP</span>
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="grid grid-cols-2 gap-3">
        {/* Water */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">Água</span>
            </div>
            <p className="text-lg font-bold">
              {(day.water_ml / 1000).toFixed(1)}L
            </p>
            {day.water_completed && (
              <p className="text-xs text-green-600">✓ Meta atingida</p>
            )}
          </CardContent>
        </Card>

        {/* Workouts */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium">Treinos</span>
            </div>
            <p className="text-lg font-bold">{day.workouts_count}</p>
            <p className="text-xs text-muted-foreground">concluído(s)</p>
          </CardContent>
        </Card>

        {/* Meals */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium">Refeições</span>
            </div>
            <p className="text-lg font-bold">{day.meals_count}</p>
            <p className="text-xs text-muted-foreground">registrada(s)</p>
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium">Desafios</span>
            </div>
            <p className="text-lg font-bold">{day.challenge_tasks_count}</p>
            <p className="text-xs text-muted-foreground">tarefa(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Weight */}
      {day.weight_kg && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Peso</span>
              </div>
              <span className="text-lg font-bold">{day.weight_kg} kg</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {day.achievements_count > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold">
                  {day.achievements_count} conquista(s) desbloqueada(s)!
                </p>
                <p className="text-xs text-muted-foreground">
                  Parabéns pelo seu progresso!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
