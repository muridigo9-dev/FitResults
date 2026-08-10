import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Lock, Eye, EyeOff, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useBranding } from "@/hooks/useBranding";
import { useI18n } from "@/hooks/useI18n";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branding } = useBranding();
  const { t } = useI18n();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const passwordSchema = z.object({
    password: z.string()
      .min(8, t("admin.passwordTooShort") || "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, t("admin.passwordNeedsUppercase") || "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, t("admin.passwordNeedsLowercase") || "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, t("admin.passwordNeedsNumber") || "Senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("admin.passwordsDoNotMatch") || "As senhas não coincidem",
    path: ["confirmPassword"],
  });

  // Check if user came from a valid reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken) {
        // User clicked the recovery link - session should be established
        setIsValidSession(true);
      } else if (session) {
        // User has an active session
        setIsValidSession(true);
      } else {
        // No valid session for password reset
        setIsValidSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes (when user clicks magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateForm = () => {
    const result = passwordSchema.safeParse({ password, confirmPassword });

    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { must_change_password: false }
      });

      if (error) {
        if (error.message.includes("same as old")) {
          toast.error(t("auth.errors.samePassword") || "A nova senha deve ser diferente da anterior");
        } else {
          toast.error(error.message || t("auth.errors.unexpected"));
        }
        return;
      }

      setIsSuccess(true);
      toast.success(t("auth.passwordUpdated") || "Senha atualizada com sucesso!");

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (err) {
      console.error("Password update error:", err);
      toast.error(t("auth.errors.unexpected") || "Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicators
  const passwordChecks = [
    { label: t("admin.passwordReq8Chars") || "8+ caracteres", valid: password.length >= 8 },
    { label: t("admin.passwordReqUppercase") || "Letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: t("admin.passwordReqLowercase") || "Letra minúscula", valid: /[a-z]/.test(password) },
    { label: t("admin.passwordReqNumber") || "Número", valid: /[0-9]/.test(password) },
  ];

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-soft to-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Invalid session - show error
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background">
        <Card variant="elevated" className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t("auth.invalidLink") || "Link inválido ou expirado"}</CardTitle>
            <CardDescription>
              {t("auth.invalidLinkDesc") || "O link de recuperação de senha expirou ou é inválido. Solicite um novo link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/forgot-password">
                {t("auth.requestNewLink") || "Solicitar novo link"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">{t("auth.backToLogin") || "Voltar ao login"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background">
        <Card variant="elevated" className="w-full max-w-sm animate-in">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>{t("auth.passwordUpdated") || "Senha atualizada!"}</CardTitle>
            <CardDescription>
              {t("auth.passwordUpdatedDesc") || "Sua senha foi alterada com sucesso. Você será redirecionado em instantes..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">
                {t("navigation.dashboard") || "Ir para o dashboard"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background">
      {/* Logo & Brand */}
      <div className="flex flex-col items-center mb-8 animate-in text-center">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden relative">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {branding?.appName || t("auth.resetPasswordTitle") || "Nova Senha"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {branding?.tagline || t("auth.resetPasswordSubtitle") || "Crie uma senha forte e segura"}
        </p>
      </div>

      {/* Form Card */}
      <Card variant="elevated" className="w-full max-w-sm animate-in-delay-1">
        <CardHeader className="text-center pb-2">
          <CardTitle>{t("auth.resetPasswordTitle") || "Definir nova senha"}</CardTitle>
          <CardDescription>
            {t("auth.resetPasswordSubtitle") || "Escolha uma senha segura para sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.newPassword") || "Nova senha"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Password Strength Indicators */}
            {password && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs ${check.valid ? "text-green-600" : "text-muted-foreground"
                      }`}
                  >
                    {check.valid ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-current" />
                    )}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword") || "Confirmar senha"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t("auth.passwordsMatch") || "Senhas coincidem"}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !passwordChecks.every(c => c.valid)}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.updatePassword") || t("auth.changePassword") || "Atualizar senha"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground animate-in-delay-2">
        {t("auth.rememberedPassword") || "Lembrou sua senha?"}{" "}
        <Link to="/auth" className="text-primary hover:underline">
          {t("auth.login") || "Fazer login"}
        </Link>
      </p>
    </div>
  );
}
