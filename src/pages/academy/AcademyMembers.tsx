import { useState } from "react";
import { useAcademy } from "@/contexts/AcademyContext";
import { useAcademyMembers, useRemoveMember, useUpdateMember } from "@/hooks/useAcademyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AcademyBadge, StatusBadge } from "@/components/academy";
import { CreateInviteDialog } from "@/components/academy/CreateInviteDialog";
import { LoadingScreen } from "@/components/states";
import { MoreVertical, Search, UserPlus, Trash2, Ban, Mail, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademyRole } from "@/contexts/AcademyContext";

// =====================================================
// ACADEMY MEMBERS PAGE
// =====================================================

export default function AcademyMembers() {
  const { currentAcademy, canManageAcademy, canInviteStudents } = useAcademy();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AcademyRole | "all">("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const { data: allMembers = [], isLoading } = useAcademyMembers(currentAcademy?.id);
  const { mutate: removeMember } = useRemoveMember();
  const { mutate: updateMember } = useUpdateMember();

  // Filter members
  const filteredMembers = allMembers.filter((member) => {
    const matchesSearch =
      member.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Group by role
  const trainers = filteredMembers.filter((m) => m.role === "trainer");
  const nutritionists = filteredMembers.filter((m) => m.role === "nutritionist");
  const students = filteredMembers.filter((m) => m.role === "student");
  const contentCreators = filteredMembers.filter((m) => m.role === "content_creator");

  const handleRemoveMember = (memberId: string) => {
    removeMember(memberId, {
      onSuccess: () => setMemberToRemove(null),
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Carregando membros..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Membros da Academia</h1>
          <p className="text-muted-foreground">
            Gerencie trainers, nutricionistas e alunos
          </p>
        </div>

        {canInviteStudents && (
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members by Role */}
      <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Todos ({allMembers.length})
          </TabsTrigger>
          <TabsTrigger value="trainer">
            Trainers ({trainers.length})
          </TabsTrigger>
          <TabsTrigger value="nutritionist">
            Nutris ({nutritionists.length})
          </TabsTrigger>
          <TabsTrigger value="student">
            Alunos ({students.length})
          </TabsTrigger>
          <TabsTrigger value="content_creator">
            Criadores ({contentCreators.length})
          </TabsTrigger>
        </TabsList>

        {/* All Members Table */}
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Membros</CardTitle>
              <CardDescription>
                {filteredMembers.length} membro(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entrada</TableHead>
                    {canManageAcademy && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                            {member.user.avatar_url ? (
                              <img
                                src={member.user.avatar_url}
                                alt={member.user.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              member.user.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{member.user.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AcademyBadge role={member.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(member.joined_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      {canManageAcademy && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(member.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum membro encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainers */}
        <TabsContent value="trainer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Trainers</CardTitle>
              <CardDescription>{trainers.length} trainer(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers.map((trainer) => (
                  <Card key={trainer.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-2xl font-bold text-orange-500">
                          {trainer.user.avatar_url ? (
                            <img
                              src={trainer.user.avatar_url}
                              alt={trainer.user.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            trainer.user.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {canManageAcademy && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(trainer.id)}
                              >
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{trainer.user.full_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {trainer.user.email}
                      </p>
                      <AcademyBadge role="trainer" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nutritionists */}
        <TabsContent value="nutritionist" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Nutricionistas</CardTitle>
              <CardDescription>{nutritionists.length} nutricionista(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nutritionists.map((nutritionist) => (
                  <Card key={nutritionist.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-2xl font-bold text-green-500">
                          {nutritionist.user.avatar_url ? (
                            <img
                              src={nutritionist.user.avatar_url}
                              alt={nutritionist.user.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            nutritionist.user.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {canManageAcademy && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(nutritionist.id)}
                              >
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{nutritionist.user.full_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {nutritionist.user.email}
                      </p>
                      <AcademyBadge role="nutritionist" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students */}
        <TabsContent value="student" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Alunos</CardTitle>
              <CardDescription>{students.length} aluno(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Último Check-in</TableHead>
                    <TableHead>Entrada</TableHead>
                    {canManageAcademy && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center font-semibold text-blue-500">
                            {student.user.avatar_url ? (
                              <img
                                src={student.user.avatar_url}
                                alt={student.user.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              student.user.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{student.user.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.total_checkins ?? 0}</TableCell>
                      <TableCell>
                        {student.last_checkin
                          ? new Date(student.last_checkin).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {new Date(student.joined_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      {canManageAcademy && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                              <DropdownMenuItem>Ver Progresso</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(student.id)}
                              >
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Creators */}
        <TabsContent value="content_creator" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Criadores de Conteúdo</CardTitle>
              <CardDescription>{contentCreators.length} criador(es)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentCreators.map((creator) => (
                  <Card key={creator.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center text-2xl font-bold text-pink-500">
                          {creator.user.avatar_url ? (
                            <img
                              src={creator.user.avatar_url}
                              alt={creator.user.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            creator.user.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {canManageAcademy && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(creator.id)}
                              >
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{creator.user.full_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {creator.user.email}
                      </p>
                      <AcademyBadge role="content_creator" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro da academia? Esta ação pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
