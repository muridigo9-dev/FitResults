/**
 * StartImpersonationDialog Component
 * 
 * Dialog para iniciar impersonação de usuário
 * Inclui avisos de LGPD e campo de justificativa
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, UserCog, Shield, FileText } from "lucide-react";
import { useImpersonation } from "@/hooks/useImpersonation";

interface StartImpersonationDialogProps {
  targetUserId: string;
  targetUserEmail: string;
  isTestUser?: boolean;
  trigger?: React.ReactNode;
}

export function StartImpersonationDialog({
  targetUserId,
  targetUserEmail,
  isTestUser = false,
  trigger,
}: StartImpersonationDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { startImpersonation, isStarting } = useImpersonation();

  const handleStart = () => {
    if (!isTestUser && !reason.trim()) {
      return;
    }

    if (!acceptedTerms) {
      return;
    }

    startImpersonation(
      {
        targetUserId,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setReason("");
          setAcceptedTerms(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserCog className="h-4 w-4 mr-2" />
            Entrar como Usuário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Iniciar Impersonação
          </DialogTitle>
          <DialogDescription>
            Você está prestes a acessar a conta de outro usuário. Esta ação é
            auditada e deve seguir as diretrizes de LGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="space-y-2">
            <Label>Usuário Alvo</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <span className="font-medium">{targetUserEmail}</span>
              {isTestUser && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Usuário de Teste
                </span>
              )}
            </div>
          </div>

          {/* Reason (required for real users) */}
          {!isTestUser && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Justificativa *
              </Label>
              <Textarea
                id="reason"
                placeholder="Ex: Suporte técnico solicitado pelo usuário via ticket #1234"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Obrigatório para usuários reais. Esta justificativa será
                registrada nos logs de auditoria.
              </p>
            </div>
          )}

          {/* LGPD Warning */}
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              <strong className="text-warning">Aviso LGPD:</strong> Ao
              impersonar um usuário, você terá acesso aos dados pessoais dele.
              Esta ação deve ser realizada apenas quando estritamente necessário
              e dentro das diretrizes legais.
            </AlertDescription>
          </Alert>

          {/* Compliance Info */}
          <Alert>
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">Responsabilidades:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Todas as ações serão registradas em log de auditoria</li>
                <li>A sessão expirará automaticamente em 30 minutos</li>
                <li>Não altere dados sensíveis sem autorização</li>
                <li>Não compartilhe informações confidenciais</li>
                <li>Encerre a sessão assim que concluir o suporte</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Terms Acceptance */}
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Confirmo que li e entendi as responsabilidades acima e que esta
              impersonação é necessária e justificada conforme as políticas de
              compliance e LGPD.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isStarting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStart}
            disabled={
              isStarting ||
              !acceptedTerms ||
              (!isTestUser && !reason.trim())
            }
          >
            {isStarting ? "Iniciando..." : "Iniciar Impersonação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
