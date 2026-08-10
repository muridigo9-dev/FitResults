import { DayProgress } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyProgressProps {
  data: DayProgress[];
  isLoading?: boolean;
}

export function WeeklyProgress({ data, isLoading }: WeeklyProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Sua Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="h-3 w-8 bg-muted animate-pulse rounded" />
                <div className="h-16 w-full bg-muted animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: DayProgress["status"]) => {
    switch (status) {
      case "complete":
        return "bg-green-500";
      case "partial":
        return "bg-green-500/40";
      case "not_started":
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: DayProgress["status"]) => {
    switch (status) {
      case "complete":
        return "Completo";
      case "partial":
        return "Parcial";
      case "not_started":
        return "Não iniciado";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Sua Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-1.5 sm:gap-2">
          {data.map((day) => (
            <div 
              key={day.dayShort} 
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <span className="text-xs text-muted-foreground font-medium">
                {day.dayShort}
              </span>
              <div
                className={cn(
                  "w-full h-14 sm:h-16 rounded-lg transition-colors relative overflow-hidden",
                  getStatusColor(day.status)
                )}
                title={`${day.day}: ${getStatusLabel(day.status)} (${day.percentage}%)`}
              >
                {day.status === "partial" && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-green-500"
                    style={{ height: `${day.percentage}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500/40" />
            <span>Parcial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>Pendente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
