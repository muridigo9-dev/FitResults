import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DailyCheckin } from "@/types/checkin";
import {
  CheckCircle2,
  Utensils,
  Dumbbell,
  Trophy,
  Droplets,
  Smile,
  Scale,
  Sparkles
} from "lucide-react";
import { getMoodEmoji } from "@/lib/moodHelpers";

interface CheckinSummaryProps {
  checkin: DailyCheckin;
  stats: {
    mealsCompleted: number;
    mealsTotal: number;
    workoutsCompleted: number;
    workoutsTotal: number;
    tasksCompleted: number;
    tasksTotal: number;
    waterProgress: number;
    hasMood: boolean;
    hasWeight: boolean;
  };
  className?: string;
}

export function CheckinSummary({ checkin, stats, className }: CheckinSummaryProps) {
  const summaryItems = [
    {
      icon: Utensils,
      label: "Alimentação",
      value: `${stats.mealsCompleted} refeições`,
      completed: stats.mealsCompleted > 0,
      color: "text-primary",
    },
    {
      icon: Dumbbell,
      label: "Treinos",
      value: `${stats.workoutsCompleted} concluídos`,
      completed: stats.workoutsCompleted > 0,
      color: "text-primary",
    },
    {
      icon: Trophy,
      label: "Desafios",
      value: stats.tasksTotal > 0
        ? `${stats.tasksCompleted}/${stats.tasksTotal} tarefas`
        : "Nenhum ativo",
      completed: stats.tasksCompleted > 0,
      color: "text-primary",
    },
    {
      icon: Droplets,
      label: "Água",
      value: `${(checkin.water.current / 1000).toFixed(1)}L de ${(checkin.water.goal / 1000).toFixed(1)}L`,
      completed: stats.waterProgress >= 100,
      color: "text-primary",
    },
    {
      icon: Smile,
      label: "Humor",
      value: getMoodEmoji(checkin.mood),
      completed: stats.hasMood,
      color: "text-primary",
    },
    {
      icon: Scale,
      label: "Peso",
      value: checkin.weight ? `${checkin.weight} kg` : "Não registrado",
      completed: stats.hasWeight,
      color: "text-primary",
    },
  ];

  const completedItems = summaryItems.filter(item => item.completed).length;
  const overallProgress = Math.round((completedItems / summaryItems.length) * 100);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-success/10 mb-2">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Resumo do Dia</h2>
        <p className="text-sm text-muted-foreground">
          Revise seu check-in antes de confirmar
        </p>
      </div>

      {/* Overall progress */}
      <Card variant="elevated" className="animate-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Progresso geral</p>
              <p className="text-lg font-semibold text-foreground">
                {completedItems} de {summaryItems.length} categorias
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary items */}
      <div className="space-y-2">
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              variant="default"
              className={cn(
                `animate-in-delay-${index + 1}`,
                item.completed && "border-success/30"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    item.completed ? "bg-success/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      item.completed ? "text-success" : "text-muted-foreground"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{item.label}</p>
                  </div>

                  <span className={cn(
                    "text-sm font-medium",
                    item.completed ? "text-success" : "text-muted-foreground"
                  )}>
                    {item.value}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes if any */}
      {checkin.notes && (
        <Card variant="default" className="animate-in-delay-7">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Observações</p>
            <p className="text-foreground">{checkin.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Motivation message */}
      <Card variant="elevated" className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4 text-center">
          {overallProgress >= 80 ? (
            <p className="font-medium text-success">
              🎉 Excelente dia! Continue assim!
            </p>
          ) : overallProgress >= 50 ? (
            <p className="font-medium text-primary">
              💪 Bom progresso! Cada passo conta.
            </p>
          ) : (
            <p className="font-medium text-muted-foreground">
              🌱 Todo começo é válido. Vamos lá!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
