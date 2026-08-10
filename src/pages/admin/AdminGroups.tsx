import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useUserGroups, useGroupMembers } from "@/hooks/useUserGroups";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { UserGroup, GroupFormData } from "@/types/personalTrainer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminGroups() {
  const { isPersonalTrainerModeEnabled } = usePersonalTrainerMode();
  const {
    groups,
    isLoading,
    createGroup,
    isCreating,
    updateGroup,
    isUpdating,
    deleteGroup,
    isDeleting,
  } = useUserGroups();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<UserGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    description: "",
    is_active: true,
  });

  // Members management
  const { members, isLoading: isMembersLoading, addMember, removeMember, isAdding, isRemoving } = useGroupMembers(selectedGroup?.id || null);

  // Available users to add
  const { data: availableUsers } = useQuery({
    queryKey: ["available-users-for-group", selectedGroup?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name")
        .order("full_name");
      
      if (error) throw error;
      
      // Filter out users already in the group
      const memberIds = members?.map(m => m.user_id) || [];
      return data?.filter((u: any) => !memberIds.includes(u.id)) || [];
    },
    enabled: !!selectedGroup && !isMembersLoading,
  });

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const resetForm = () => {
    setFormData({ name: "", description: "", is_active: true });
    setEditingGroup(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (group: UserGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      is_active: group.is_active,
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (editingGroup) {
      updateGroup({ id: editingGroup.id, ...formData });
    } else {
      createGroup(formData);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (deletingGroup) {
      deleteGroup(deletingGroup.id);
      setDeletingGroup(null);
    }
  };

  const handleAddMember = () => {
    if (selectedUserId) {
      addMember({ userId: selectedUserId });
      setSelectedUserId("");
    }
  };

  return (
    <AdminLayout title="Grupos">
      <div className="space-y-6">
        {/* Warning if mode is disabled */}
        {!isPersonalTrainerModeEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Modo Personal Trainer Desativado</AlertTitle>
            <AlertDescription>
              Os grupos só serão utilizados quando o Modo Personal Trainer estiver ativo.
              Ative a flag <code className="font-mono">personal_trainer_mode_enabled</code> em Feature Flags.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Grupos</h2>
            <p className="text-muted-foreground">
              Gerencie turmas, alunos e atribuições de conteúdo
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Groups List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos
              </CardTitle>
              <CardDescription>
                {groups?.length || 0} grupos cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : groups?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum grupo criado</p>
                    <Button variant="link" onClick={handleOpenCreate}>
                      Criar primeiro grupo
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead className="text-center">Membros</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups?.map((group) => (
                        <TableRow 
                          key={group.id}
                          className={selectedGroup?.id === group.id ? "bg-muted/50" : ""}
                          onClick={() => setSelectedGroup(group)}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {group.description || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{group.member_count || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {group.is_active ? (
                              <Badge className="bg-green-500">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(group);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingGroup(group);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Members Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Membros
                {selectedGroup && (
                  <Badge variant="outline" className="ml-2">
                    {selectedGroup.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedGroup 
                  ? `Gerencie os membros de "${selectedGroup.name}"`
                  : "Selecione um grupo para ver os membros"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedGroup ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um grupo na lista ao lado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add member */}
                  <div className="flex gap-2">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddMember} disabled={!selectedUserId || isAdding}>
                      {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Members list */}
                  <ScrollArea className="h-[280px]">
                    {isMembersLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : members?.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        <p className="text-sm">Nenhum membro neste grupo</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {members?.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {(member.user?.full_name || member.user?.email || "U")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {member.user?.full_name || member.user?.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.role_in_group === "assistant" ? "Assistente" : "Aluno"}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeMember(member.id)}
                              disabled={isRemoving}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Editar Grupo" : "Novo Grupo"}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? "Atualize as informações do grupo"
                  : "Crie um novo grupo para organizar alunos"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Grupo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Turma Janeiro 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo do grupo..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Grupo Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.name || isCreating || isUpdating}
              >
                {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingGroup ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Grupo?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o grupo "{deletingGroup?.name}"?
                Todos os membros serão removidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
