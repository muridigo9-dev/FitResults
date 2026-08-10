import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";

interface ForcePasswordChangeModalProps {
  open: boolean;
}

export function ForcePasswordChangeModal({ open }: ForcePasswordChangeModalProps) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t("admin.passwordTooShort") || "A senha deve ter pelo menos 8 caracteres";
    }
    if (!/[A-Z]/.test(password)) {
      return t("admin.passwordNeedsUppercase") || "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/[a-z]/.test(password)) {
      return t("admin.passwordNeedsLowercase") || "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/[0-9]/.test(password)) {
      return t("admin.passwordNeedsNumber") || "A senha deve conter pelo menos um número";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrors({ newPassword: passwordError });
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: t("admin.passwordsDoNotMatch") || "As senhas não coincidem" });
      return;
    }

    setIsLoading(true);

    try {
      // Update password and remove the must_change_password flag
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (error) throw error;

      toast.success(t("admin.passwordChangedSuccess") || "Senha alterada com sucesso!");
      
      // Force reload to refresh the user state
      window.location.reload();
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t("admin.passwordChangeError") || "Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">
            {t("admin.mustChangePassword") || "Alteração de Senha Obrigatória"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("admin.mustChangePasswordDescription") || 
              "Por segurança, você deve alterar sua senha padrão antes de continuar."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {t("admin.newPassword") || "Nova Senha"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t("admin.confirmPassword") || "Confirmar Senha"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
                required
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">{t("admin.passwordRequirements") || "Requisitos da senha:"}</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>{t("admin.passwordReq8Chars") || "Mínimo de 8 caracteres"}</li>
              <li>{t("admin.passwordReqUppercase") || "Pelo menos uma letra maiúscula"}</li>
              <li>{t("admin.passwordReqLowercase") || "Pelo menos uma letra minúscula"}</li>
              <li>{t("admin.passwordReqNumber") || "Pelo menos um número"}</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("actions.saving") || "Salvando..."}
              </span>
            ) : (
              t("admin.changePassword") || "Alterar Senha"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
