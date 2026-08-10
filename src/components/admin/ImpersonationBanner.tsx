/**
 * ImpersonationBanner Component
 * 
 * Banner visível quando SUPER ADMIN está impersonando um usuário
 * Exibe informações claras e botão para encerrar impersonação
 */

import { AlertTriangle, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useImpersonationStatus, useEndImpersonation } from "@/hooks/useImpersonation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

export function ImpersonationBanner() {
  const { data: status } = useImpersonationStatus();
  const { mutate: endImpersonation, isPending } = useEndImpersonation();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!status?.isImpersonating || !status.expiresAt) return;

    const updateTime = () => {
      const remaining = formatDistanceToNow(new Date(status.expiresAt!), {
        locale: ptBR,
        addSuffix: false,
      });
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [status]);

  if (!status?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Warning Icon + Message */}
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-semibold">
                MODO IMPERSONAÇÃO ATIVO
              </span>
              <span className="text-sm">
                Você está navegando como:{" "}
                <Badge variant="secondary" className="ml-1">
                  {status.impersonatedEmail}
                </Badge>
              </span>
            </div>
          </div>

          {/* Time Remaining + Exit Button */}
          <div className="flex items-center gap-3">
            {timeRemaining && (
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                <span>Expira em {timeRemaining}</span>
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => endImpersonation()}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da Impersonação
            </Button>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mt-2 text-xs opacity-90">
          ⚠️ Todas as ações realizadas neste modo são registradas e auditáveis (LGPD).
          Use apenas para suporte técnico ou testes autorizados.
        </div>
      </div>
    </div>
  );
}
