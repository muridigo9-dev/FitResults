import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Mail, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useBranding } from "@/hooks/useBranding";
import { useI18n } from "@/hooks/useI18n";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { branding } = useBranding();
  const { t } = useI18n();

  const emailSchema = z.string().email(t("auth.errors.invalidEmail") || "Email inválido");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(t("auth.errors.invalidEmail") || "Por favor, insira um email válido");
      return;
    }

    setIsLoading(true);

    try {
      // Try our custom whitelabel edge function first
      const { data, error: fnError } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email: email,
          redirect_url: `${window.location.origin}/reset-password`,
        },
      });

      if (fnError || !data?.success) {
        console.warn("Custom reset failed, falling back to Supabase:", fnError || data);

        if (data?.code === "RESEND_NOT_CONFIGURED") {
          toast.warning(t("auth.errors.resendNotConfigured") || data.message || "Serviço de email não configurado. Contate o administrador.");
          setIsLoading(false);
          return;
        }

        if (data?.code === "PASSWORD_RESET_RATE_LIMIT") {
          toast.error(t("auth.errors.rateLimit") || data.message || "Muitas solicitações. Tente novamente em breve.");
          setIsLoading(false);
          return;
        }

        // Fallback to default Supabase password reset
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
          console.error("Password reset error:", resetError);
        }
      }

      // Always show success for security (don't reveal if email exists)
      setIsEmailSent(true);
      toast.success(t("auth.resetLinkSent") || "Se o email existir, você receberá as instruções");
    } catch (err) {
      console.error("Password reset exception:", err);
      toast.error(t("auth.errors.unexpected") || "Erro ao processar solicitação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isEmailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background">
        <Card variant="elevated" className="w-full max-w-sm animate-in">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>{t("auth.resetLinkSent") || "Email enviado!"}</CardTitle>
            <CardDescription>
              {t("auth.forgotPasswordSuccess") || `Se uma conta existir com o email <strong>${email}</strong>, você receberá um link para redefinir sua senha.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>📧 {t("auth.checkInbox") || "Verifique sua caixa de entrada"}</p>
              <p>📁 {t("auth.checkSpam") || "Cheque também a pasta de spam"}</p>
              <p>⏰ {t("auth.linkExpires") || "O link expira em 1 hora"}</p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("auth.backToLogin") || "Voltar para login"}
              </Link>
            </Button>

            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setIsEmailSent(false);
                setEmail("");
              }}
            >
              {t("auth.magicLinkTryAnother") || "Tentar outro email"}
            </button>
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
          {branding?.appName || t("auth.forgotPasswordTitle") || "Recuperar Senha"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {branding?.tagline || t("auth.forgotPasswordSubtitle") || "Digite seu email para continuar"}
        </p>
      </div>

      {/* Form Card */}
      <Card variant="elevated" className="w-full max-w-sm animate-in-delay-1">
        <CardHeader className="text-center pb-2">
          <CardTitle>{t("auth.forgotPasswordTitle") || "Esqueceu sua senha?"}</CardTitle>
          <CardDescription>
            {t("auth.forgotPasswordHint") || "Enviaremos um link para você criar uma nova senha"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email") || "Email"}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder") || "seu@email.com"}
                  className={`pl-10 ${error ? "border-destructive" : ""}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.sendResetLink") || "Enviar link de recuperação"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("auth.backToLogin") || "Voltar para login"}
            </Link>
          </div>
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
