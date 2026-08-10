import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTrainerDashboard, useTrainerQuickStats } from "@/hooks/useTrainerDashboard";
import { StudentSummary } from "@/hooks/useTrainerStudents";
import { CommunityRanking } from "@/components/trainer/CommunityRanking";
import { StudentInviteForm } from "@/components/trainer/StudentInviteForm";
import { StudentDetailView } from "@/components/trainer/StudentDetailView";
import { TrainerConversationsList } from "@/components/trainer/TrainerConversationsList";
import { StudentMessagesTab } from "@/components/trainer/StudentMessagesTab";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTrainerConversations, useTrainerChatEnabled, TrainerConversation } from "@/hooks/useTrainerChat";
import {
  Users,
  UserPlus,
  Activity,
  TrendingUp,
  Search,
  Flame,
  Target,
  Calendar,
  ChevronRight,
  Crown,
  AlertCircle,
  Loader2,
  BarChart3,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color = "primary",
  isLoading = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; positive: boolean };
  color?: "primary" | "success" | "warning" | "accent" | "tertiary";
  isLoading?: boolean;
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <>
                <p className="text-3xl font-bold mt-1">{value}</p>
                {subValue && (
                  <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
                )}
                {trend && (
                  <p
                    className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      trend.positive ? "text-success" : "text-destructive"
                    )}
                  >
                    <TrendingUp
                      className={cn("h-3 w-3", !trend.positive && "rotate-180")}
                    />
                    {trend.value}%
                  </p>
                )}
              </>
            )}
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              colorClasses[color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentRow({
  student,
  onClick,
}: {
  student: StudentSummary;
  onClick: () => void;
}) {
  const lastCheckin = student.last_checkin_date
    ? formatDistanceToNow(new Date(student.last_checkin_date), {
        addSuffix: true,
        locale: ptBR,
      })
    : "Nunca";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={student.student_avatar || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {student.student_name?.charAt(0) || "A"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{student.student_name || "Aluno"}</p>
          {student.current_streak >= 7 && (
            <Badge variant="outline" className="text-xs border-level-gold/30 text-level-gold">
              <Flame className="h-3 w-3 mr-1" />
              {student.current_streak}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Último check-in: {lastCheckin}
        </p>
      </div>

      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium">{student.checkins_last_7_days}/7</p>
        <p className="text-xs text-muted-foreground">check-ins</p>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
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

      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function EngagementChart({ students }: { students: StudentSummary[] }) {
  // Group by checkins in last 7 days
  const data = [
    { name: "0", count: students.filter((s) => s.checkins_last_7_days === 0).length },
    { name: "1-2", count: students.filter((s) => s.checkins_last_7_days >= 1 && s.checkins_last_7_days <= 2).length },
    { name: "3-4", count: students.filter((s) => s.checkins_last_7_days >= 3 && s.checkins_last_7_days <= 4).length },
    { name: "5-6", count: students.filter((s) => s.checkins_last_7_days >= 5 && s.checkins_last_7_days <= 6).length },
    { name: "7", count: students.filter((s) => s.checkins_last_7_days === 7).length },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Engajamento Semanal
        </CardTitle>
        <CardDescription>Check-ins por aluno nos últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value} alunos`, "Quantidade"]}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { students, studentLimit, stats, isLoading } = useTrainerDashboard();
  const { totalUnread } = useTrainerConversations();
  const { isChatEnabled: chatFeatureEnabled } = useTrainerChatEnabled();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<TrainerConversation | null>(null);
  const [activeTab, setActiveTab] = useState("students");

  const isPersonalModeEnabled = isEnabled("personal_mode_enabled");

  // Filter students
  const filteredStudents = students.filter(
    (s) =>
      s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show student detail view
  if (selectedStudent) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6">
          <StudentDetailView
            student={selectedStudent}
            onBack={() => setSelectedStudent(null)}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie seus alunos e acompanhe o progresso
            </p>
          </div>
          {studentLimit && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Limite de alunos</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={(studentLimit.current_count / studentLimit.max_students) * 100}
                  className="w-24 h-2"
                />
                <span className="text-sm font-medium">
                  {studentLimit.current_count}/{studentLimit.max_students}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total de Alunos"
            value={stats.totalStudents}
            isLoading={isLoading}
            color="primary"
          />
          <StatCard
            icon={Activity}
            label="Ativos Hoje"
            value={stats.studentsWithCheckinsToday}
            subValue={`${stats.engagementRate}% engajamento`}
            isLoading={isLoading}
            color="success"
          />
          <StatCard
            icon={Target}
            label="Check-ins (7d)"
            value={stats.totalCheckins7Days}
            isLoading={isLoading}
            color="tertiary"
          />
          <StatCard
            icon={Flame}
            label="Streak Médio"
            value={stats.averageStreak}
            subValue="dias"
            isLoading={isLoading}
            color="accent"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Alunos
            </TabsTrigger>
            {chatFeatureEnabled && (
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagens
                {totalUnread > 0 && (
                  <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alunos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* List */}
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      {students.length === 0 ? (
                        <>
                          <p className="text-lg font-medium">Nenhum aluno ainda</p>
                          <p className="text-muted-foreground mb-4">
                            Convide seu primeiro aluno para começar
                          </p>
                          <Button onClick={() => setActiveTab("invite")}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Convidar Aluno
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium">Nenhum resultado</p>
                          <p className="text-muted-foreground">
                            Tente outro termo de busca
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 pr-4">
                      {filteredStudents.map((student) => (
                        <StudentRow
                          key={student.student_id}
                          student={student}
                          onClick={() => setSelectedStudent(student)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Engagement Chart */}
              <div className="space-y-4">
                <EngagementChart students={students} />

                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Resumo Rápido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Alunos ativos (7d)</span>
                      <span className="font-medium">
                        {students.filter((s) => s.checkins_last_7_days > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Com streak ativo</span>
                      <span className="font-medium">
                        {students.filter((s) => s.current_streak > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Inativos (+7d)</span>
                      <span className="font-medium text-warning">
                        {students.filter((s) => s.checkins_last_7_days === 0).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          {chatFeatureEnabled && (
            <TabsContent value="messages" className="mt-6">
              {selectedConversation ? (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar às conversas
                  </Button>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedConversation.student_avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {selectedConversation.student_name?.charAt(0) || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedConversation.student_name || "Aluno"}
                          </CardTitle>
                          <CardDescription>
                            {selectedConversation.student_email}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <StudentMessagesTab
                        studentId={selectedConversation.student_id}
                        studentName={selectedConversation.student_name}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TrainerConversationsList
                    onSelectConversation={setSelectedConversation}
                    selectedConversationId={selectedConversation?.conversation_id}
                  />
                  <Card className="hidden lg:block">
                    <CardContent className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                      <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Selecione uma conversa</p>
                      <p className="text-sm text-center mt-2">
                        Clique em uma conversa à esquerda para visualizar as mensagens.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="invite" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <StudentInviteForm />
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <CommunityRanking trainerId={user?.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
