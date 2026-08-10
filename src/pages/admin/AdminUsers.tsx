import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  MoreVertical,
  Mail,
  Shield,
  User as UserIcon,
  Flame,
  TrendingUp,
  Eye,
  RotateCcw,
  Target,
  Loader2,
  UserPlus,
  AlertCircle,
  KeyRound,
  Ban,
  TestTube,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";
import { useAdminUsers, type UserFilters, type AdminUser } from "@/hooks/useAdminUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AdminUserFilters } from "@/components/admin/AdminUserFilters";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";

interface PendingUser {
  user_id: string;
  email: string;
  created_at: string;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<UserFilters>({
    accountStatus: "all",
    subscriptionStatus: "all",
    role: "all",
    userType: "all",
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    users,
    isLoading,
    resetStreak,
    toggleUserRole,
    refetch,
    filterUsers,
    sendPasswordReset,
    forcePasswordChange,
    updateAccountStatus,
    isSendingPasswordReset,
    isUpdatingStatus,
  } = useAdminUsers();

  // Pending users (auth.users without profiles)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Create user modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    full_name: "",
    role: "user" as "admin" | "user",
    subscription_status: "active" as "active" | "trial" | "cancelled" | "none",
  });

  // Fetch pending users
  const fetchPendingUsers = async () => {
    setIsLoadingPending(true);
    try {
      const { data, error } = await supabase.rpc("list_users_without_profile" as any);
      if (!error && data) {
        setPendingUsers(data as PendingUser[]);
      }
    } catch (err) {
      console.log("Could not fetch pending users:", err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Provision profile for pending user
  const handleProvisionProfile = async (userId: string, email: string) => {
    const name = prompt(`Nome completo para ${email}:`, email.split("@")[0]);
    if (!name) return;

    try {
      const { data, error } = await supabase.rpc("provision_user_profile" as any, {
        p_user_id: userId,
        p_full_name: name,
        p_role: "user",
        p_subscription_status: "active",
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      if (result?.success) {
        toast.success(result.message || "Perfil provisionado!");
        fetchPendingUsers();
        refetch();
      } else {
        throw new Error(result?.error || "Erro ao provisionar");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao provisionar perfil");
    }
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.accountStatus !== "all") count++;
    if (filters.subscriptionStatus !== "all") count++;
    if (filters.role !== "all") count++;
    if (filters.userType !== "all") count++;
    return count;
  }, [filters]);

  // Apply filters and search
  const filteredUsers = useMemo(() => {
    let result = filterUsers(filters);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    return result;
  }, [filterUsers, filters, searchQuery]);

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleResetStreak = async (userId: string, userName: string) => {
    try {
      await resetStreak(userId);
      toast.success(`Streak de ${userName} resetado`);
    } catch {
      toast.error("Erro ao resetar streak");
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string, userName: string) => {
    try {
      const action = currentRole === "admin" ? "remove" : "add";
      await toggleUserRole(userId, "admin", action);
      toast.success(`${userName} agora é ${action === "add" ? "admin" : "usuário"}`);
    } catch {
      toast.error("Erro ao alterar role");
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const response = await sendPasswordReset(email);
      if (response.success) {
        toast.success("Email de redefinição de senha enviado com sucesso!");
      } else if (response.code === "RESEND_NOT_CONFIGURED") {
        toast.warning("O envio de emails não está configurado. Configure a chave da API do Resend nas configurações.");
      } else if (response.code === "PASSWORD_RESET_RATE_LIMIT") {
        toast.warning(`Email já enviado recentemente. Aguarde ${response.remaining_seconds || 60}s.`);
      } else {
        toast.error(response.message || "Erro ao enviar email de reset");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar email de reset");
    }
  };

  const handleForcePasswordChange = async (userId: string) => {
    try {
      await forcePasswordChange(userId);
      toast.success("Usuário será forçado a trocar a senha no próximo login");
    } catch (err: any) {
      toast.error(err.message || "Erro ao forçar troca de senha");
    }
  };

  const handleUpdateAccountStatus = async (userId: string, status: "active" | "pending" | "cancelled" | "suspended") => {
    try {
      await updateAccountStatus(userId, status);
      toast.success("Status da conta atualizado com sucesso!");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.full_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const response = await supabase.functions.invoke("create-test-user", {
        body: {
          email: newUserForm.email,
          full_name: newUserForm.full_name,
          role: newUserForm.role,
          subscription_status: newUserForm.subscription_status,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (!result?.success) {
        toast.error(result?.error || "Erro ao criar usuário");
        return;
      }

      toast.success(result?.message || "Usuário criado com sucesso!");

      setIsCreateModalOpen(false);
      setNewUserForm({
        email: "",
        full_name: "",
        role: "user",
        subscription_status: "active",
      });
      fetchPendingUsers();
      refetch();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setIsCreating(false);
    }
  };

  const { stats } = useAdminUsers();

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Usuário de Teste
            </Button>
          </div>

          {/* Filters */}
          <AdminUserFilters
            filters={filters}
            onFiltersChange={setFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats.total}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-success">{stats.active}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-blue-500">{stats.newThisWeek}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Novos (7d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-orange-500">{stats.expiringSoon}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Expirando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-primary">{stats.admins}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-muted-foreground">{stats.engagedLast7Days}</p>}
              <p className="text-xs text-muted-foreground uppercase font-semibold">Engajados</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users Alert */}
        {pendingUsers.length > 0 && (
          <Alert className="border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertTitle>Usuários Pendentes de Perfil</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">{pendingUsers.length} usuário(s) fizeram signup mas não têm perfil.</p>
              <div className="flex flex-wrap gap-2">
                {pendingUsers.slice(0, 5).map((pending) => (
                  <Button key={pending.user_id} variant="outline" size="sm" onClick={() => handleProvisionProfile(pending.user_id, pending.email)}>
                    <UserPlus className="h-3 w-3 mr-1" />
                    {pending.email}
                  </Button>
                ))}
                {pendingUsers.length > 5 && <Badge variant="secondary">+{pendingUsers.length - 5} mais</Badge>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Lista de Usuários
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{filteredUsers.length} de {users.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                type="users"
                title="Nenhum usuário encontrado"
                description={searchQuery || activeFiltersCount > 0 ? "Tente ajustar os filtros" : "Ainda não há usuários cadastrados"}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Engajamento</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden xl:table-cell">Sequência</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {user.name}
                                {user.isTestUser && (
                                  <span title="Usuário de teste">
                                    <TestTube className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {user.role === "admin" && (
                                  <Badge variant="soft" size="sm"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
                                )}
                                {user.role === "personal_trainer" && (
                                  <Badge variant="outline" size="sm">PT</Badge>
                                )}
                                {user.role === "academy_admin" && (
                                  <Badge variant="outline" size="sm">Academia</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            user.subscriptionStatus === "active" ? "success" :
                              user.subscriptionStatus === "trial" ? "soft" :
                                user.subscriptionStatus === "expired" ? "soft-warning" :
                                  user.subscriptionStatus === "cancelled" ? "destructive" :
                                    "secondary"
                          }>
                            {user.subscriptionStatus === "active" ? "Ativo" :
                              user.subscriptionStatus === "trial" ? "Trial" :
                                user.subscriptionStatus === "expired" ? "Expirado" :
                                  user.subscriptionStatus === "cancelled" ? "Cancelado" :
                                    user.subscriptionStatus === "suspended" ? "Suspenso" :
                                      "Sem assinatura"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <span>{user.daysActiveLast7}/7 dias (última sem.)</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Último check-in: {user.lastCheckin ? new Date(user.lastCheckin).toLocaleDateString("pt-BR") : "Nunca"}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <Flame className={`h-4 w-4 ${user.streak > 0 ? 'text-accent' : 'text-muted-foreground'}`} />
                            <span className="font-medium">{user.streak} dias</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendPasswordReset(user.email)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Reenviar Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleForcePasswordChange(user.id)}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Forçar Troca de Senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResetStreak(user.id, user.name)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Resetar Sequência
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleAdmin(user.id, user.role, user.name)}>
                                <Shield className="h-4 w-4 mr-2" />
                                {user.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.accountStatus === "suspended" ? (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "active")} className="text-success">
                                  <Target className="h-4 w-4 mr-2" />
                                  Reativar Conta
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateAccountStatus(user.id, "suspended")} className="text-destructive">
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspender Conta
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSendPasswordReset={handleSendPasswordReset}
        onForcePasswordChange={handleForcePasswordChange}
        onUpdateAccountStatus={handleUpdateAccountStatus}
        onToggleRole={toggleUserRole}
        isLoading={isSendingPasswordReset || isUpdatingStatus}
      />

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Usuário de Teste
            </DialogTitle>
            <DialogDescription>
              Cria um novo usuário de teste com senha temporária.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input id="full_name" placeholder="João Silva" value={newUserForm.full_name} onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="joao@exemplo.com" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Usuário</Label>
              <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v as "admin" | "user" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user"><UserIcon className="h-4 w-4 mr-2 inline" />Usuário</SelectItem>
                  <SelectItem value="admin"><Shield className="h-4 w-4 mr-2 inline" />Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status da Assinatura</Label>
              <Select value={newUserForm.subscription_status} onValueChange={(v) => setNewUserForm({ ...newUserForm, subscription_status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="none">Sem assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : <><Plus className="h-4 w-4 mr-2" />Criar Usuário</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
