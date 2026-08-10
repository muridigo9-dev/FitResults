import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame } from "lucide-react";

interface ConsistencyCardProps {
  activeDays: number;
  totalDays: number;
  isLoading?: boolean;
}

export function ConsistencyCard({ activeDays, totalDays, isLoading }: ConsistencyCardProps) {
  const percentage = Math.round((activeDays / totalDays) * 100);

  if (isLoading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-2 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">
              Consistência: <span className="text-primary">{activeDays} de {totalDays} dias</span>
            </p>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Você registrou pelo menos 1 hábito em {activeDays} de {totalDays} dias esta semana
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
