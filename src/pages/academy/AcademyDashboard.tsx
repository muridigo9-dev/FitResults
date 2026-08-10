import { useState } from "react";
import { useAcademy } from "@/contexts/AcademyContext";
import { useAcademyMembers } from "@/hooks/useAcademyMembers";
import { useAcademyInvites } from "@/hooks/useAcademyInvites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Users,
  Dumbbell,
  Apple,
  GraduationCap,
  TrendingUp,
  UserPlus,
  Mail,
  Calendar,
  Activity,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { AcademyBadge, LimitBadge, StatusBadge } from "@/components/academy";
import { CreateInviteDialog } from "@/components/academy/CreateInviteDialog";
import { LoadingScreen } from "@/components/states";
import { Link } from "react-router-dom";

// =====================================================
// ACADEMY DASHBOARD
// =====================================================

export default function AcademyDashboard() {
  const {
    currentAcademy,
    academyStats,
    isAcademyLoading,
    userRole,
    canInviteStudents,
    canViewMembers,
    canManageAcademy,
    isAcademyAdmin,
  } = useAcademy();

  const { data: trainers = [], isLoading: isLoadingTrainers } = useAcademyMembers(
    currentAcademy?.id,
    "trainer"
  );
  const { data: nutritionists = [], isLoading: isLoadingNutritionists } = useAcademyMembers(
    currentAcademy?.id,
    "nutritionist"
  );
  const { data: students = [], isLoading: isLoadingStudents } = useAcademyMembers(
    currentAcademy?.id,
    "student"
  );
  const { data: invites = [], isLoading: isLoadingInvites } = useAcademyInvites(currentAcademy?.id);

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  if (isAcademyLoading) {
    return <LoadingScreen message="Carregando academia..." />;
  }

  if (!currentAcademy) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Academia Selecionada</CardTitle>
            <CardDescription>
              Você não está vinculado a nenhuma academia ou precisa selecionar uma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/academies">Ver Academias</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const recentStudents = students.slice(0, 5);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{
                background: currentAcademy.primary_color
                  ? `linear-gradient(135deg, ${currentAcademy.primary_color} 0%, ${currentAcademy.primary_color}cc 100%)`
                  : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
              }}
            >
              {currentAcademy.logo_url ? (
                <img
                  src={currentAcademy.logo_url}
                  alt={currentAcademy.name}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{currentAcademy.name}</h1>
              <p className="text-muted-foreground">Dashboard da Academia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentAcademy.status} />
            {userRole && <AcademyBadge role={userRole} />}
          </div>
        </div>

        {canInviteStudents && (
          <Button size="lg" onClick={() => setShowInviteDialog(true)} className="gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trainers */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Trainers</CardTitle>
            <Dumbbell className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {academyStats?.total_trainers ?? "-"}
            </div>
            <LimitBadge
              current={academyStats?.total_trainers ?? 0}
              max={academyStats?.max_trainers ?? 0}
            />
          </CardContent>
        </Card>

        {/* Nutritionists */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nutricionistas</CardTitle>
            <Apple className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {academyStats?.total_nutritionists ?? "-"}
            </div>
            <LimitBadge
              current={academyStats?.total_nutritionists ?? 0}
              max={academyStats?.max_nutritionists ?? 0}
            />
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {academyStats?.total_students ?? "-"}
            </div>
            <LimitBadge
              current={academyStats?.total_students ?? 0}
              max={academyStats?.max_students ?? 0}
            />
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <Mail className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{pendingInvites.length}</div>
            <p className="text-xs text-muted-foreground">Aguardando resposta</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid lg:grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {canViewMembers && <TabsTrigger value="members">Membros</TabsTrigger>}
          {canViewMembers && <TabsTrigger value="students">Alunos</TabsTrigger>}
          {isAcademyAdmin && <TabsTrigger value="activity">Atividade</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Alunos Recentes
                </CardTitle>
                <CardDescription>Últimos alunos que entraram na academia</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStudents ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentStudents.length > 0 ? (
                  <div className="space-y-3">
                    {recentStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {student.user.avatar_url ? (
                            <img
                              src={student.user.avatar_url}
                              alt={student.user.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <GraduationCap className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.user.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Entrou {new Date(student.joined_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <AcademyBadge role="student" size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum aluno ainda</p>
                  </div>
                )}
                {students.length > 5 && (
                  <Button variant="ghost" className="w-full mt-4" asChild>
                    <Link to="/academy/students">Ver todos os alunos →</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Content Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Conteúdo da Academia
                </CardTitle>
                <CardDescription>Estatísticas de conteúdo criado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Treinos</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {academyStats?.total_workouts ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Apple className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Dietas</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {academyStats?.total_diets ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Desafios</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {academyStats?.total_challenges ?? 0}
                    </span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/academy/content">Gerenciar Conteúdo →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Convites Pendentes
                </CardTitle>
                <CardDescription>
                  {pendingInvites.length} convite(s) aguardando resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingInvites.slice(0, 5).map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invite.invited_email}</p>
                        <p className="text-xs text-muted-foreground">
                          Enviado {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4" asChild>
                  <Link to="/academy/invites">Ver todos os convites →</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Trainers */}
            {trainers.map((trainer) => (
              <Card key={trainer.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{trainer.user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {trainer.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <AcademyBadge role="trainer" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Nutritionists */}
            {nutritionists.map((nutritionist) => (
              <Card key={nutritionist.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Apple className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{nutritionist.user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {nutritionist.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <AcademyBadge role="nutritionist" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Students Tab - Full list */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Alunos</CardTitle>
              <CardDescription>{students.length} aluno(s) na academia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{student.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.user.email}</p>
                    </div>
                    <div className="text-right">
                      {student.total_checkins !== undefined && (
                        <p className="text-sm font-medium">{student.total_checkins} check-ins</p>
                      )}
                      {student.last_checkin && (
                        <p className="text-xs text-muted-foreground">
                          Último: {new Date(student.last_checkin).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Em breve: Timeline de atividades da academia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">Em Desenvolvimento</p>
                <p className="text-sm">
                  Timeline de atividades, eventos e métricas detalhadas em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invite Dialog */}
      <CreateInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  );
}
