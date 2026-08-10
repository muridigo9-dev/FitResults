import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Calendar, Check, Droplets, Dumbbell, UtensilsCrossed, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useChallenges } from "@/hooks/useChallenges";
import { AppLayout } from "@/components/layout/AppLayout";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { useEffect, useState } from "react";
import type { Challenge, ChallengeTask } from "@/types/challenges";

const TASK_ICONS: Record<string, typeof Droplets> = {
  water: Droplets,
  workout: Dumbbell,
  diet: UtensilsCrossed,
  habit: Star,
  checkin: Check,
  custom: Star
};

const TASK_COLORS: Record<string, string> = {
  water: "text-blue-500 bg-blue-500/10",
  workout: "text-orange-500 bg-orange-500/10",
  diet: "text-green-500 bg-green-500/10",
  habit: "text-purple-500 bg-purple-500/10",
  checkin: "text-pink-500 bg-pink-500/10",
  custom: "text-gray-500 bg-gray-500/10"
};

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeParticipation, isLoading: isHookLoading, joinChallenge, completeTask, getChallengeDetails } = useChallenges();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    if (id) {
      setLoadingDetail(true);
      getChallengeDetails(id)
        .then(setChallenge)
        .finally(() => setLoadingDetail(false));
    }
  }, [id]);

  const isLoading = isHookLoading || loadingDetail;

  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader
          type="challenge"
          message="Carregando desafio..."
          fullScreen
        />
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <EmptyState
          type="notFound"
          title="Desafio não encontrado"
          description="Este desafio não existe ou foi removido"
          icon={Trophy}
          actionButton="Voltar para desafios"
          onActionClick={() => navigate("/challenges")}
        />
      </AppLayout>
    );
  }

  // Determine participation state
  const isParticipating = activeParticipation?.challenge_id === challenge.id;
  const currentDay = activeParticipation?.current_day || 1;

  // Calculate Progress
  const totalDays = challenge.duration_days;
  const totalTasks = challenge.days?.reduce((sum, d) => sum + (d.tasks?.length || 0), 0) || 0;

  // Count tasks done across all days
  let completedTasksCount = 0;
  if (isParticipating && activeParticipation.progress) {
    activeParticipation.progress.forEach(dayProgress => {
      completedTasksCount += (dayProgress.tasks_completed?.length || 0);
    });
  }

  const overallProgress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  const isTaskCompleted = (dayId: string, taskId: string) => {
    if (!isParticipating || !activeParticipation?.progress) return false;
    const dayProgress = activeParticipation.progress.find(p => p.challenge_day_id === dayId);
    return dayProgress?.tasks_completed?.includes(taskId) || false;
  };

  const handleCompleteTask = (dayId: string, task: ChallengeTask) => {
    if (isParticipating && !isTaskCompleted(dayId, task.id)) {
      completeTask({
        participationId: activeParticipation.id,
        dayId,
        taskId: task.id
      });
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/challenges")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{challenge.name}</h1>
            <p className="text-muted-foreground">{challenge.description}</p>
          </div>
        </div>

        {/* Progress Card */}
        {isParticipating ? (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Seu Progresso</h3>
                  <p className="text-sm text-muted-foreground">
                    Dia {currentDay} de {totalDays}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {overallProgress}%
                </Badge>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {completedTasksCount} de {totalTasks} tarefas concluídas
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Pronto para o desafio?</h3>
              <p className="text-muted-foreground mb-4">
                Complete as tarefas diárias e transforme seus hábitos
              </p>
              <Button onClick={() => joinChallenge(challenge.id)}>
                Começar Desafio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Days List */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Dias do Desafio
        </h2>

        <div className="space-y-4">
          {(challenge.days || []).map((day) => {
            const dayTasks = day.tasks || [];
            const dayTasksCompleted = dayTasks.filter(t => isTaskCompleted(day.id, t.id)).length;
            const isDayComplete = dayTasks.length > 0 && dayTasksCompleted === dayTasks.length;
            const isCurrentDay = isParticipating && day.day_number === currentDay;
            const isPastDay = isParticipating && day.day_number < currentDay;
            const isFutureDay = isParticipating && day.day_number > currentDay;

            // Determine if Locked
            // Can only interact if joined.
            // Future days visible but tasks locked? Or completely hidden? 
            // Design usually allows peeking but not completing.
            // Let's allow completing previous days if missed, but focused on current.
            // Actually, `activeParticipation` drives `current_day`. 
            // But user might want to catch up. 
            // `complete_challenge_task` RPC checks if user participates, but doesn't strictly enforce Day == CurrentDay 
            // (unless we want strict mode). My RPC implementation didn't enforce specific day.
            const canInteract = isParticipating;

            return (
              <Card
                key={day.id}
                className={`${isCurrentDay ? "border-primary/50 bg-primary/5" : ""} ${isFutureDay ? "opacity-75" : ""
                  }`}
              >
                <CardContent className="p-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${isDayComplete
                          ? "bg-green-500 text-white"
                          : isCurrentDay
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                        {isDayComplete ? <Check className="h-5 w-5" /> : day.day_number}
                      </div>
                      <div>
                        <h3 className="font-semibold">{day.title || `Dia ${day.day_number}`}</h3>
                        <p className="text-xs text-muted-foreground">
                          {dayTasksCompleted}/{dayTasks.length} tarefas
                        </p>
                      </div>
                    </div>
                    {isCurrentDay && (
                      <Badge className="bg-primary/10 text-primary">Hoje</Badge>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    {dayTasks.map((task) => {
                      const completed = isTaskCompleted(day.id, task.id);
                      const Icon = TASK_ICONS[task.type] || Star;
                      const colorClass = TASK_COLORS[task.type] || "text-gray-500 bg-gray-500/10";

                      return (
                        <div
                          key={task.id}
                          onClick={() => canInteract && !completed && handleCompleteTask(day.id, task)}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${completed
                              ? "bg-green-500/10 border border-green-500/20"
                              : "bg-muted/50 border border-transparent"
                            } ${canInteract && !completed ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${completed ? "bg-green-500 text-white" : colorClass
                            }`}>
                            {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            {task.config && (
                              <p className="text-xs text-muted-foreground">
                                {JSON.stringify(task.config)}
                              </p>
                            )}
                          </div>
                          {canInteract && !completed && (
                            <Button size="sm" variant="ghost">
                              Concluir
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
