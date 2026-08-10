/**
 * ImpersonateUserDialog Component
 * 
 * Dialog para SUPER ADMIN iniciar impersonação de usuário
 * com avisos LGPD e campo de justificativa
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  UserCog,
  CheckCircle2,
  XCircle 
} from "lucide-react";
import { useCanImpersonate, useStartImpersonation } from "@/hooks/useImpersonation";

interface ImpersonateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName?: string;
}

export function ImpersonateUserDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: ImpersonateUserDialogProps) {
  const [reason, setReason] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: canImpersonate, isLoading: checkingPermission } = useCanImpersonate(
    open ? userId : null
  );
  const { mutate: startImpersonation, isPending } = useStartImpersonation();

  const isTestUser = userEmail.includes("@test.com");
  const requiresReason = !isTestUser;

  const handleSubmit = () => {
    if (requiresReason && reason.trim().length < 10) {
      return;
    }

    if (!acceptedTerms) {
      return;
    }

    startImpersonation(
      { targetUserId: userId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
          setAcceptedTerms(false);
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setReason("");
    setAcceptedTerms(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Impersonar Usuário
          </DialogTitle>
          <DialogDescription>
            Você está prestes a acessar o sistema como outro usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{userName || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              {isTestUser && (
                <Badge variant="secondary">Usuário de Teste</Badge>
              )}
            </div>
          </div>

          {/* Permission Check */}
          {checkingPermission ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Verificando permissões...</p>
            </div>
          ) : canImpersonate?.can_impersonate ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                {canImpersonate.reason}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {canImpersonate?.reason || "Não é possível impersonar este usuário"}
              </AlertDescription>
            </Alert>
          )}

          {canImpersonate?.can_impersonate && (
            <>
              {/* Reason Field */}
              {requiresReason && (
                <div className="space-y-2">
                  <Label htmlFor="reason" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Justificativa *
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Descreva o motivo da impersonação (ex: suporte técnico, debug de funcionalidade, validação de dados...)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 10 caracteres. Esta justificativa será registrada nos logs de auditoria.
                  </p>
                </div>
              )}

              {/* LGPD Warning */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">⚠️ AVISO LEGAL - LGPD</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li>Toda ação será registrada e auditável</li>
                    <li>Use apenas para fins legítimos (suporte, debug, testes)</li>
                    <li>Não altere dados sensíveis sem autorização</li>
                    <li>Não compartilhe informações confidenciais</li>
                    <li>Sessão expira em 30 minutos</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Terms Acceptance */}
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1"
                />
                <label
                  htmlFor="accept-terms"
                  className="text-sm cursor-pointer flex items-start gap-2"
                >
                  <Shield className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <span>
                    Declaro estar ciente das responsabilidades legais e de compliance (LGPD)
                    ao impersonar este usuário, e que utilizarei este acesso apenas para
                    fins autorizados de suporte técnico ou testes internos.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !canImpersonate?.can_impersonate ||
              (requiresReason && reason.trim().length < 10) ||
              !acceptedTerms ||
              isPending
            }
          >
            {isPending ? "Iniciando..." : "Iniciar Impersonação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
