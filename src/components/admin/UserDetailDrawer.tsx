import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Shield,
  User as UserIcon,
  Flame,
  TrendingUp,
  Calendar,
  CreditCard,
  KeyRound,
  Ban,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TestTube,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminUser, AccountStatus, UserRole } from "@/hooks/useAdminUsers";

// Password reset response type
interface PasswordResetResponse {
  success: boolean;
  code?: string;
  message: string;
  remaining_seconds?: number;
  resend_id?: string;
}

interface UserDetailDrawerProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  onForcePasswordChange: (userId: string) => Promise<void>;
  onUpdateAccountStatus: (userId: string, status: AccountStatus) => Promise<void>;
  onToggleRole: (userId: string, role: UserRole, action: "add" | "remove") => Promise<void>;
  isLoading?: boolean;
}

export function UserDetailDrawer({
  user,
  open,
  onOpenChange,
  onSendPasswordReset,
  onForcePasswordChange,
  onUpdateAccountStatus,
  onToggleRole,
  isLoading,
}: UserDetailDrawerProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!user) return null;

  const handleAction = async (actionName: string, action: () => Promise<void>) => {
    setLoadingAction(actionName);
    try {
      await action();
      toast.success(`Ação "${actionName}" realizada com sucesso!`);
    } catch (error: any) {
      toast.error(error.message || `Erro ao executar "${actionName}"`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Special handler for password reset that handles rate limit responses
  const handlePasswordReset = async () => {
    setLoadingAction("Enviar reset de senha");
    try {
      const response = await onSendPasswordReset(user.email);

      if (response.success) {
        toast.success("Email de redefinição de senha enviado com sucesso!", {
          description: "O usuário receberá um link para criar uma nova senha.",
          icon: <CheckCircle className="h-4 w-4 text-success" />,
        });
      } else if (response.code === "PASSWORD_RESET_RATE_LIMIT") {
        // Rate limit hit - show warning instead of error
        const seconds = response.remaining_seconds || 60;
        toast.warning(`Email já enviado recentemente`, {
          description: `Aguarde ${seconds} segundos antes de reenviar.`,
          icon: <Clock className="h-4 w-4 text-warning" />,
          duration: 5000,
        });
      } else if (response.code === "RESEND_NOT_CONFIGURED") {
        toast.warning("Configuração pendente", {
          description: "O serviço de e-mail (Resend) não está configurado nas definições do sistema.",
          icon: <AlertTriangle className="h-4 w-4 text-warning" />,
          duration: 6000,
        });
      } else {
        // Other error
        toast.error(response.message || "Erro ao enviar email de reset");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de reset de senha");
    } finally {
      setLoadingAction(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin": return "destructive";
      case "personal_trainer": return "default";
      case "academy_admin": return "secondary";
      case "content_creator": return "outline";
      default: return "soft";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "admin": return "Admin";
      case "personal_trainer": return "Personal Trainer";
      case "academy_admin": return "Academia";
      case "content_creator": return "Criador de Conteúdo";
      default: return "Usuário";
    }
  };

  const getStatusIcon = () => {
    if (user.accountStatus === "suspended") return <Ban className="h-4 w-4 text-destructive" />;
    if (user.accountStatus === "cancelled") return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="flex items-center gap-2">
                {user.name}
                {user.isTestUser && (
                  <Badge variant="outline" className="gap-1">
                    <TestTube className="h-3 w-3" />
                    Teste
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon()}
              Status da Conta
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg border border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Conta</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user.accountStatus === "active" ? "success" : user.accountStatus === "suspended" ? "destructive" : "secondary"}>
                    {user.accountStatus === "active" ? "Ativa" :
                      user.accountStatus === "pending" ? "Pendente" :
                        user.accountStatus === "suspended" ? "Suspensa" : "Cancelada"}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Assinatura</p>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    user.subscriptionStatus === "active" ? "success" :
                      user.subscriptionStatus === "trial" ? "soft" :
                        user.subscriptionStatus === "expired" ? "soft-warning" : "secondary"
                  }>
                    {user.subscriptionStatus === "active" ? "Ativa" :
                      user.subscriptionStatus === "trial" ? "Trial" :
                        user.subscriptionStatus === "expired" ? "Expirada" :
                          user.subscriptionStatus === "cancelled" ? "Cancelada" : "Sem assinatura"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Plan Details Section */}
            {(user.planName || user.planPrice) && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <CreditCard className="h-4 w-4" />
                    Detalhes do Plano
                  </h4>
                  {user.planPrice && (
                    <span className="text-sm font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: user.planCurrency || 'BRL' }).format(user.planPrice)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Plano Atual</p>
                    <p className="font-medium">{user.planName || "Básico"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Expira em</p>
                    <p className={cn(
                      "font-medium",
                      user.planExpiresAt && new Date(user.planExpiresAt) < new Date() ? "text-destructive" : ""
                    )}>
                      {user.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString("pt-BR") : "Sem expiração"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Roles Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role} variant={getRoleBadgeVariant(role)}>
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Engagement Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Engajamento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Sequência</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <Flame className={`h-4 w-4 ${user.streak > 0 ? "text-accent" : "text-muted-foreground"}`} />
                  {user.streak} dias
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Check-ins (7d)</p>
                <p className="text-lg font-semibold">{user.daysActiveLast7}/7</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Check-ins (30d)</p>
                <p className="text-lg font-semibold">{user.daysActiveLast30}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Conteúdos</p>
                <p className="text-lg font-semibold">{user.contentsConsumed}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastro</span>
                <span>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último check-in</span>
                <span>{user.lastCheckin ? new Date(user.lastCheckin).toLocaleDateString("pt-BR") : "Nunca"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Onboarding</span>
                <span>{user.onboardingCompleted ? "Concluído ✓" : "Pendente"}</span>
              </div>
            </div>
          </div>

          {user.stripeCustomerId && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Stripe
                </h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer ID</span>
                    <span className="text-xs">{user.stripeCustomerId}</span>
                  </div>
                  {user.stripeSubscriptionId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscription ID</span>
                      <span className="text-xs">{user.stripeSubscriptionId}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Ações Administrativas</h4>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                disabled={isLoading || loadingAction !== null}
                onClick={handlePasswordReset}
              >
                {loadingAction === "Enviar reset de senha" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Reenviar Email de Reset de Senha
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                disabled={isLoading || loadingAction !== null}
                onClick={() => handleAction("Forçar troca de senha", () => onForcePasswordChange(user.id))}
              >
                {loadingAction === "Forçar troca de senha" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Forçar Troca de Senha no Próximo Login
              </Button>

              {user.accountStatus === "suspended" ? (
                <Button
                  variant="outline"
                  className="justify-start text-success"
                  disabled={isLoading || loadingAction !== null}
                  onClick={() => handleAction("Reativar conta", () => onUpdateAccountStatus(user.id, "active"))}
                >
                  {loadingAction === "Reativar conta" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reativar Conta
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="justify-start text-destructive"
                  disabled={isLoading || loadingAction !== null}
                  onClick={() => handleAction("Suspender conta", () => onUpdateAccountStatus(user.id, "suspended"))}
                >
                  {loadingAction === "Suspender conta" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4 mr-2" />
                  )}
                  Suspender Conta
                </Button>
              )}

              {!user.roles.includes("admin") ? (
                <Button
                  variant="outline"
                  className="justify-start"
                  disabled={isLoading || loadingAction !== null}
                  onClick={() => handleAction("Tornar admin", () => onToggleRole(user.id, "admin", "add"))}
                >
                  {loadingAction === "Tornar admin" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Tornar Administrador
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="justify-start text-destructive"
                  disabled={isLoading || loadingAction !== null}
                  onClick={() => handleAction("Remover admin", () => onToggleRole(user.id, "admin", "remove"))}
                >
                  {loadingAction === "Remover admin" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Remover Administrador
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
