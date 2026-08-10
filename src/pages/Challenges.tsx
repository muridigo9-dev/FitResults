import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Calendar, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useChallenges } from "@/hooks/useChallenges";
import { AppLayout } from "@/components/layout/AppLayout";
import { AnimatedLoader, NoChallengesEmptyState } from "@/components/loaders";
import type { Challenge } from "@/types/challenges";

export default function Challenges() {
  const { challenges, isLoading, joinChallenge } = useChallenges();

  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader
          type="challenge"
          message="Carregando desafios..."
          fullScreen
        />
      </AppLayout>
    );
  }

  // Filter to ensure only active ones are shown (though RPC handles it usually)
  const activeChallenges = challenges.filter(c => c.is_active);

  const getProgressPercentage = (c: Challenge) => {
    if (!c.user_progress || !c.user_progress.total_days) return 0;
    // Simple logic: (current_day - 1) / total_days * 100
    // If completed, 100%
    if (c.participation_status === 'completed') return 100;
    return Math.round(((c.user_progress.current_day - 1) / c.user_progress.total_days) * 100);
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Desafios</h1>
          <p className="text-muted-foreground">
            Participe de desafios e transforme seus hábitos
          </p>
        </div>

        {/* Empty State */}
        {activeChallenges.length === 0 && (
          <NoChallengesEmptyState />
        )}

        {/* Challenges Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {activeChallenges.map(challenge => {
            const isJoined = challenge.is_joined;
            const isCompleted = challenge.participation_status === "completed";
            const currentDay = challenge.user_progress?.current_day || 1;
            const progressPercentage = getProgressPercentage(challenge);

            return (
              <Card key={challenge.id} className="overflow-hidden hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isCompleted
                          ? "bg-green-500/10"
                          : isJoined
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}>
                        <Trophy className={`h-6 w-6 ${isCompleted
                            ? "text-green-500"
                            : isJoined
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{challenge.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{challenge.duration_days} dias</span>
                        </div>
                      </div>
                    </div>

                    {isCompleted && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                    {isJoined && !isCompleted && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Dia {currentDay}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {challenge.description}
                  </p>

                  {/* Progress (if joined) */}
                  {isJoined && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Dia {currentDay} de {challenge.duration_days}
                      </p>
                    </div>
                  )}

                  {/* Rewards / XP */}
                  {!isJoined && (
                    <div className="p-3 bg-amber-500/10 rounded-lg flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400">
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-semibold">Ganhe {challenge.xp_reward} XP</span>
                    </div>
                  )}

                  {/* Action */}
                  {!isJoined ? (
                    <Button
                      className="w-full"
                      onClick={() => joinChallenge(challenge.id)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Aceitar Desafio
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/challenges/${challenge.id}`}>
                        {isCompleted ? "Ver Detalhes" : "Continuar"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
