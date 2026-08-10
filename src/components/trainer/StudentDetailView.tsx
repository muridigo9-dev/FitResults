import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useStudentProgress, StudentSummary, StudentProgress } from "@/hooks/useTrainerStudents";
import { useStudentAssignments } from "@/hooks/useTrainerDashboard";
import { useAnamnesis } from "@/hooks/useAnamnesis";
import { AnamnesisHistory } from "./AnamnesisHistory";
import { ContentAssignmentForm } from "./ContentAssignmentForm";
import { StudentReportExport } from "./StudentReportExport";
import { StudentMessagesTab } from "./StudentMessagesTab";
import { useStudentFeedbackList } from "@/hooks/useStudentFeedback";
import {
  User,
  Activity,
  Target,
  Dumbbell,
  UtensilsCrossed,
  Droplets,
  Scale,
  Heart,
  Calendar,
  TrendingUp,
  Flame,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ClipboardList,
  ChevronLeft,
  Award,
  Plus,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface StudentDetailViewProps {
  student: StudentSummary;
  onBack: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "primary" | "success" | "warning" | "accent" | "tertiary";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    accent: "bg-accent/10 text-accent",
    tertiary: "bg-tertiary/10 text-tertiary",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressTab({ studentId }: { studentId: string }) {
  const { data: progressData = [], isLoading } = useStudentProgress(studentId);

  const chartData = progressData.map((p: StudentProgress) => ({
    date: format(new Date(p.date), "dd/MM"),
    peso: p.weight,
    agua: p.water_completion_pct,
    treinos: p.workouts_completed,
    habitos: p.habits_completed,
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum dado de progresso ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weight Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Evolução de Peso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorPeso)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activities Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividades Diárias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="treinos" stroke="hsl(var(--accent))" strokeWidth={2} name="Treinos" />
                <Line type="monotone" dataKey="habitos" stroke="hsl(var(--tertiary))" strokeWidth={2} name="Hábitos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignmentsTab({ studentId }: { studentId: string }) {
  const { data: assignments = [], isLoading } = useStudentAssignments(studentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma atribuição encontrada</p>
      </div>
    );
  }

  const contentIcons: Record<string, React.ElementType> = {
    workout: Dumbbell,
    diet: UtensilsCrossed,
    challenge: Target,
    habit: Star,
  };

  const statusColors: Record<string, string> = {
    active: "bg-success/10 text-success border-success/30",
    scheduled: "bg-warning/10 text-warning border-warning/30",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {assignments.map((assignment: any) => {
          const Icon = contentIcons[assignment.content_type] || Target;
          return (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {assignment.title || `${assignment.content_type} atribuído`}
                      </p>
                      <Badge variant="outline" className={cn("text-xs", statusColors[assignment.status])}>
                        {assignment.status === "active" && "Ativo"}
                        {assignment.status === "scheduled" && "Agendado"}
                        {assignment.status === "completed" && "Concluído"}
                        {assignment.status === "cancelled" && "Cancelado"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(assignment.start_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {assignment.end_date && (
                        <span>
                          até {format(new Date(assignment.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {assignment.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {assignment.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function AnamnesisTab({ studentId }: { studentId: string }) {
  return <AnamnesisHistory studentId={studentId} />;
}

function FeedbackTab({ studentId }: { studentId: string }) {
  const { feedbackList, isLoading } = useStudentFeedbackList(studentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (feedbackList.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum feedback recebido ainda</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {feedbackList.map((feedback) => (
          <Card key={feedback.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    feedback.rating === "like" && "bg-success/10",
                    feedback.rating === "dislike" && "bg-destructive/10",
                    feedback.rating === "neutral" && "bg-muted"
                  )}
                >
                  {feedback.rating === "like" && <ThumbsUp className="h-5 w-5 text-success" />}
                  {feedback.rating === "dislike" && <ThumbsDown className="h-5 w-5 text-destructive" />}
                  {feedback.rating === "neutral" && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {feedback.content_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(feedback.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {feedback.comment && (
                    <p className="text-sm">{feedback.comment}</p>
                  )}
                  {feedback.difficulty_rating && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dificuldade: {feedback.difficulty_rating}/5
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [activeTab, setActiveTab] = useState("progress");
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarImage src={student.student_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {student.student_name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{student.student_name || "Aluno"}</h1>
          <p className="text-sm text-muted-foreground">{student.student_email}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            student.status === "active" && "text-success border-success/30",
            student.status === "inactive" && "text-muted-foreground",
            student.status === "pending" && "text-warning border-warning/30"
          )}
        >
          {student.status === "active" && "Ativo"}
          {student.status === "inactive" && "Inativo"}
          {student.status === "pending" && "Pendente"}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <Plus className="h-4 w-4" />
              Atribuir Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <ContentAssignmentForm
              defaultStudentId={student.student_id}
              onSuccess={() => setShowAssignmentDialog(false)}
            />
          </DialogContent>
        </Dialog>

        <StudentReportExport student={student} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          label="Streak Atual"
          value={student.current_streak}
          subValue={`Recorde: ${student.longest_streak}`}
          color="accent"
        />
        <StatCard
          icon={Target}
          label="Check-ins (7d)"
          value={student.checkins_last_7_days}
          color="success"
        />
        <StatCard
          icon={Award}
          label="XP Total"
          value={student.total_xp.toLocaleString()}
          subValue={`Nível ${student.level}`}
          color="tertiary"
        />
        <StatCard
          icon={Calendar}
          label="Atribuições"
          value={student.active_assignments}
          subValue="Ativas"
          color="primary"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progress" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Progresso</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Atribuições</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Mensagens</span>
          </TabsTrigger>
          <TabsTrigger value="anamnesis" className="flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Anamnese</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          <ProgressTab studentId={student.student_id} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab studentId={student.student_id} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <StudentMessagesTab 
            studentId={student.student_id} 
            studentName={student.student_name} 
          />
        </TabsContent>

        <TabsContent value="anamnesis" className="mt-4">
          <AnamnesisTab studentId={student.student_id} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <FeedbackTab studentId={student.student_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StudentDetailView;
