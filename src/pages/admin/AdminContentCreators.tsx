import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Loader2,
  AlertTriangle,
  PenTool,
  Dumbbell,
  Utensils,
  Target,
  CheckCircle,
} from "lucide-react";
import { useContentCreators } from "@/hooks/useContentCreators";
import { useUserGroups } from "@/hooks/useUserGroups";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PermissionsFormData {
  can_create_diets: boolean;
  can_create_workouts: boolean;
  can_create_challenges: boolean;
  can_create_habits: boolean;
  allowed_group_ids: string[];
}

export default function AdminContentCreators() {
  const { isPersonalTrainerModeEnabled } = usePersonalTrainerMode();
  const {
    creators,
    isLoading,
    promoteToCreator,
    isPromoting,
    updatePermissions,
    isUpdating,
    removeCreatorRole,
    isRemoving,
  } = useContentCreators();
  const { groups } = useUserGroups();

  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<any>(null);
  const [removingCreator, setRemovingCreator] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissionsForm, setPermissionsForm] = useState<PermissionsFormData>({
    can_create_diets: true,
    can_create_workouts: true,
    can_create_challenges: true,
    can_create_habits: true,
    allowed_group_ids: [],
  });

  // Available users (not already content creators)
  const { data: availableUsers } = useQuery({
    queryKey: ["available-users-for-creator"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name")
        .order("full_name");
      
      if (error) throw error;
      
      // Filter out users already content creators
      const creatorIds = creators?.map(c => c.id) || [];
      return data?.filter((u: any) => !creatorIds.includes(u.id)) || [];
    },
    enabled: !isLoading,
  });

  const handleOpenPromote = () => {
    setSelectedUserId("");
    setPermissionsForm({
      can_create_diets: true,
      can_create_workouts: true,
      can_create_challenges: true,
      can_create_habits: true,
      allowed_group_ids: [],
    });
    setIsPromoteDialogOpen(true);
  };

  const handleOpenEdit = (creator: any) => {
    setEditingCreator(creator);
    setPermissionsForm({
      can_create_diets: creator.permissions?.can_create_diets ?? true,
      can_create_workouts: creator.permissions?.can_create_workouts ?? true,
      can_create_challenges: creator.permissions?.can_create_challenges ?? true,
      can_create_habits: creator.permissions?.can_create_habits ?? true,
      allowed_group_ids: creator.permissions?.allowed_group_ids || [],
    });
  };

  const handlePromote = () => {
    if (selectedUserId) {
      promoteToCreator({
        userId: selectedUserId,
        permissions: permissionsForm,
      });
      setIsPromoteDialogOpen(false);
    }
  };

  const handleUpdatePermissions = () => {
    if (editingCreator) {
      updatePermissions({
        userId: editingCreator.id,
        ...permissionsForm,
      });
      setEditingCreator(null);
    }
  };

  const handleRemove = () => {
    if (removingCreator) {
      removeCreatorRole(removingCreator.id);
      setRemovingCreator(null);
    }
  };

  const toggleGroupPermission = (groupId: string) => {
    setPermissionsForm(prev => ({
      ...prev,
      allowed_group_ids: prev.allowed_group_ids.includes(groupId)
        ? prev.allowed_group_ids.filter(id => id !== groupId)
        : [...prev.allowed_group_ids, groupId],
    }));
  };

  return (
    <AdminLayout title="Criadores de Conteúdo">
      <div className="space-y-6">
        {/* Warning if mode is disabled */}
        {!isPersonalTrainerModeEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Modo Personal Trainer Desativado</AlertTitle>
            <AlertDescription>
              Os criadores de conteúdo só poderão gerenciar conteúdo segmentado quando o Modo Personal Trainer estiver ativo.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Criadores de Conteúdo</h2>
            <p className="text-muted-foreground">
              Gerencie usuários que podem criar e atribuir conteúdo
            </p>
          </div>
          <Button onClick={handleOpenPromote}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Criador
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Criadores</p>
                  <p className="text-2xl font-bold">{creators?.length || 0}</p>
                </div>
                <PenTool className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Grupos Disponíveis</p>
                  <p className="text-2xl font-bold">{groups?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Modo Personal</p>
                  <p className="text-2xl font-bold">
                    {isPersonalTrainerModeEnabled ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <CheckCircle className={`h-8 w-8 ${isPersonalTrainerModeEnabled ? "text-green-500" : "text-muted-foreground/50"}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creators Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Criadores de Conteúdo
            </CardTitle>
            <CardDescription>
              Usuários com permissão para criar e gerenciar conteúdo
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
              ) : creators?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <PenTool className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum criador de conteúdo</p>
                  <Button variant="link" onClick={handleOpenPromote}>
                    Adicionar primeiro criador
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-center">Permissões</TableHead>
                      <TableHead className="text-center">Grupos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators?.map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {(creator.full_name || creator.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{creator.full_name || "-"}</p>
                              <p className="text-xs text-muted-foreground">{creator.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-1">
                            {creator.permissions?.can_create_diets && (
                              <Badge variant="outline" className="text-xs">
                                <Utensils className="h-3 w-3 mr-1" />
                                Dietas
                              </Badge>
                            )}
                            {creator.permissions?.can_create_workouts && (
                              <Badge variant="outline" className="text-xs">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                Treinos
                              </Badge>
                            )}
                            {creator.permissions?.can_create_challenges && (
                              <Badge variant="outline" className="text-xs">
                                <Target className="h-3 w-3 mr-1" />
                                Desafios
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {creator.permissions?.allowed_group_ids?.length || 0} grupos
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(creator)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRemovingCreator(creator)}
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

        {/* Promote Dialog */}
        <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Criador de Conteúdo</DialogTitle>
              <DialogDescription>
                Selecione um usuário e defina suas permissões
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-3">
                <Label>Pode criar:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="can_diets"
                      checked={permissionsForm.can_create_diets}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_diets: !!checked }))
                      }
                    />
                    <Label htmlFor="can_diets" className="text-sm font-normal">Dietas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="can_workouts"
                      checked={permissionsForm.can_create_workouts}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_workouts: !!checked }))
                      }
                    />
                    <Label htmlFor="can_workouts" className="text-sm font-normal">Treinos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="can_challenges"
                      checked={permissionsForm.can_create_challenges}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_challenges: !!checked }))
                      }
                    />
                    <Label htmlFor="can_challenges" className="text-sm font-normal">Desafios</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="can_habits"
                      checked={permissionsForm.can_create_habits}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_habits: !!checked }))
                      }
                    />
                    <Label htmlFor="can_habits" className="text-sm font-normal">Hábitos</Label>
                  </div>
                </div>
              </div>

              {groups && groups.length > 0 && (
                <div className="space-y-3">
                  <Label>Grupos permitidos:</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-2">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`group_${group.id}`}
                          checked={permissionsForm.allowed_group_ids.includes(group.id)}
                          onCheckedChange={() => toggleGroupPermission(group.id)}
                        />
                        <Label htmlFor={`group_${group.id}`} className="text-sm font-normal">
                          {group.name}
                        </Label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handlePromote} 
                disabled={!selectedUserId || isPromoting}
              >
                {isPromoting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Promover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={!!editingCreator} onOpenChange={() => setEditingCreator(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Permissões</DialogTitle>
              <DialogDescription>
                Atualize as permissões de {editingCreator?.full_name || editingCreator?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Pode criar:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit_can_diets"
                      checked={permissionsForm.can_create_diets}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_diets: !!checked }))
                      }
                    />
                    <Label htmlFor="edit_can_diets" className="text-sm font-normal">Dietas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit_can_workouts"
                      checked={permissionsForm.can_create_workouts}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_workouts: !!checked }))
                      }
                    />
                    <Label htmlFor="edit_can_workouts" className="text-sm font-normal">Treinos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit_can_challenges"
                      checked={permissionsForm.can_create_challenges}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_challenges: !!checked }))
                      }
                    />
                    <Label htmlFor="edit_can_challenges" className="text-sm font-normal">Desafios</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit_can_habits"
                      checked={permissionsForm.can_create_habits}
                      onCheckedChange={(checked) => 
                        setPermissionsForm(prev => ({ ...prev, can_create_habits: !!checked }))
                      }
                    />
                    <Label htmlFor="edit_can_habits" className="text-sm font-normal">Hábitos</Label>
                  </div>
                </div>
              </div>

              {groups && groups.length > 0 && (
                <div className="space-y-3">
                  <Label>Grupos permitidos:</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-2">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`edit_group_${group.id}`}
                          checked={permissionsForm.allowed_group_ids.includes(group.id)}
                          onCheckedChange={() => toggleGroupPermission(group.id)}
                        />
                        <Label htmlFor={`edit_group_${group.id}`} className="text-sm font-normal">
                          {group.name}
                        </Label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCreator(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePermissions} disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Dialog */}
        <AlertDialog open={!!removingCreator} onOpenChange={() => setRemovingCreator(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Criador?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover as permissões de criador de conteúdo de{" "}
                "{removingCreator?.full_name || removingCreator?.email}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isRemoving}
              >
                {isRemoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
