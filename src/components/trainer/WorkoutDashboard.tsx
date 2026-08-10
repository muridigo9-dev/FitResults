import { useState } from "react";
import {
  Users,
  Dumbbell,
  TrendingUp,
  Flame,
  Trophy,
  MessageSquare,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrainerWorkoutDashboard } from "@/hooks/useTrainerWorkoutDashboard";
import { AnimatedLoader } from "@/components/loaders";
import { cn } from "@/lib/utils";
import { MOOD_LABELS, MOOD_ICONS, MOOD_COLORS } from "@/types/workout";
import type { StudentProgress, ExerciseFeedbackMood } from "@/types/workout";

interface WorkoutDashboardProps {
  academyId?: string;
}

export function WorkoutDashboard({ academyId }: WorkoutDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  const { data, isLoading, error } = useTrainerWorkoutDashboard(academyId, selectedPeriod);

  if (isLoading) {
    return <AnimatedLoader type="workout" message="Carregando dashboard..." />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Erro ao carregar dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Tabs value={String(selectedPeriod)} onValueChange={(v) => setSelectedPeriod(Number(v) as 7 | 30 | 90)}>
          <TabsList>
            <TabsTrigger value="7">7 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
            <TabsTrigger value="90">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Alunos Ativos"
          value={data.activeStudents}
          subtitle={`de ${data.totalStudents} total`}
          icon={Users}
          trend={data.activeStudents > 0 ? "up" : undefined}
        />
        <OverviewCard
          title="Treinos Hoje"
          value={data.totalSessionsToday}
          subtitle={`${data.totalSessionsThisWeek} esta semana`}
          icon={Dumbbell}
          highlight
        />
        <OverviewCard
          title="Taxa de Conclusão"
          value={`${data.avgCompletionRate}%`}
          subtitle="média dos alunos"
          icon={TrendingUp}
          trend={data.avgCompletionRate >= 80 ? "up" : data.avgCompletionRate >= 50 ? undefined : "down"}
        />
        <OverviewCard
          title="Avaliação Média"
          value={data.avgStudentRating.toFixed(1)}
          subtitle="de 5 estrelas"
          icon={Trophy}
          trend={data.avgStudentRating >= 4 ? "up" : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Progresso dos Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.studentProgress.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum aluno encontrado
              </p>
            ) : (
              <div className="space-y-4">
                {data.studentProgress.slice(0, 5).map((student) => (
                  <StudentProgressRow key={student.studentId} student={student} />
                ))}
                {data.studentProgress.length > 5 && (
                  <Button variant="ghost" className="w-full">
                    Ver todos os {data.studentProgress.length} alunos
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de ranking
              </p>
            ) : (
              <div className="space-y-3">
                {data.topStudents.map((student, index) => (
                  <div
                    key={student.studentId}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm",
                        index === 0
                          ? "bg-yellow-500 text-white"
                          : index === 1
                          ? "bg-gray-300 text-gray-700"
                          : index === 2
                          ? "bg-orange-400 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={student.avatarUrl} />
                      <AvatarFallback>
                        {student.studentName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {student.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.totalXp.toLocaleString()} XP
                      </p>
                    </div>
                    {student.streak > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {student.streak}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hardest Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Exercícios Mais Difíceis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.hardestExercises.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum feedback de exercícios ainda
              </p>
            ) : (
              <div className="space-y-3">
                {data.hardestExercises.map((ex) => (
                  <div
                    key={ex.exerciseId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    {ex.exercise.imageUrl ? (
                      <img
                        src={ex.exercise.imageUrl}
                        alt={ex.exercise.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {ex.exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ex.totalCompletions} execuções
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{MOOD_ICONS[ex.avgMood]}</span>
                      <Badge
                        variant="outline"
                        style={{ borderColor: MOOD_COLORS[ex.avgMood] }}
                      >
                        {MOOD_LABELS[ex.avgMood]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedbacks Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentFeedback.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum feedback recente
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentFeedback.slice(0, 5).map((feedback, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-xl shrink-0">
                      {MOOD_ICONS[feedback.mood]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{feedback.studentName}</span>
                        {" avaliou "}
                        <span className="font-medium">{feedback.exerciseName}</span>
                        {" como "}
                        <span
                          className="font-medium"
                          style={{ color: MOOD_COLORS[feedback.mood] }}
                        >
                          {MOOD_LABELS[feedback.mood]}
                        </span>
                      </p>
                      {feedback.comment && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          "{feedback.comment}"
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(feedback.createdAt).toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mood Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Dificuldade</CardTitle>
        </CardHeader>
        <CardContent>
          <MoodDistribution mood={data.avgStudentMood} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface OverviewCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  highlight?: boolean;
}

function OverviewCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight,
}: OverviewCardProps) {
  return (
    <Card className={cn(highlight && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              highlight ? "bg-primary/20" : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                highlight ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 mt-2 text-xs",
              trend === "up" ? "text-green-500" : "text-red-500"
            )}
          >
            <TrendingUp
              className={cn("h-3 w-3", trend === "down" && "rotate-180")}
            />
            <span>{trend === "up" ? "Bom" : "Atenção"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentProgressRow({ student }: { student: StudentProgress }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar>
        <AvatarImage src={student.avatarUrl} />
        <AvatarFallback>{student.studentName.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{student.studentName}</p>
          {student.currentStreak > 0 && (
            <Badge variant="outline" className="gap-1 shrink-0">
              <Flame className="h-3 w-3 text-orange-500" />
              {student.currentStreak}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{student.sessionsThisWeek} treinos esta semana</span>
          {student.lastWorkoutDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(student.lastWorkoutDate).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {Math.round(student.completionRate)}%
          </span>
          {student.avgMood && (
            <span className="text-lg">{MOOD_ICONS[student.avgMood]}</span>
          )}
        </div>
        <Progress value={student.completionRate} className="w-24 h-2" />
      </div>
    </div>
  );
}

function MoodDistribution({ mood }: { mood: ExerciseFeedbackMood }) {
  const moods: ExerciseFeedbackMood[] = [
    "very_easy",
    "easy",
    "moderate",
    "hard",
    "very_hard",
  ];

  return (
    <div className="flex items-center justify-center gap-4">
      {moods.map((m) => (
        <div
          key={m}
          className={cn(
            "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
            mood === m ? "bg-primary/10 scale-110" : "opacity-50"
          )}
        >
          <span className="text-3xl">{MOOD_ICONS[m]}</span>
          <span
            className={cn(
              "text-xs font-medium",
              mood === m ? "text-primary" : "text-muted-foreground"
            )}
          >
            {MOOD_LABELS[m]}
          </span>
        </div>
      ))}
    </div>
  );
}
