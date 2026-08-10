import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Mail, Lock, Eye, EyeOff, ArrowRight, User, CheckCircle2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { z } from "zod";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";
import { MagicLinkButton } from "@/components/auth/MagicLinkButton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const getAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t("auth.errors.invalidEmail")),
  password: z.string().min(6, t("auth.errors.invalidPassword")),
  name: z.string().optional(),
});
// ... imports ...

export default function Auth() {
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { branding } = useBranding();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const authSchema = getAuthSchema(t);

  // Role-based redirect after authentication
  // CRITICAL: Admin bypasses subscription check, users need active subscription
  useEffect(() => {
    if (!loading && !roleLoading && user && !isCheckingSubscription) {
      const checkAndRedirect = async () => {
        setIsCheckingSubscription(true);

        // ADMIN → Always redirect to /admin (bypasses subscription)
        if (isAdmin) {
          navigate("/admin", { replace: true });
          return;
        }

        // USER → Check subscription status BEFORE redirecting
        try {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("subscription_status, account_status")
            .eq("id", user.id)
            .maybeSingle();

          const activeStatuses = ["active", "trialing"];
          const hasActiveSubscription = activeStatuses.includes(profile?.subscription_status || "");

          if (hasActiveSubscription) {
            navigate("/dashboard", { replace: true });
          } else {
            // User doesn't have active subscription → Reactivate
            navigate("/reactivate", { replace: true });
          }
        } catch (err) {
          console.error("Error checking subscription:", err);
          // On error, let them try dashboard (AuthGuard will handle)
          navigate("/dashboard", { replace: true });
        }
      };

      checkAndRedirect();
    }
  }, [user, loading, roleLoading, isAdmin, navigate, isCheckingSubscription]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password, name: isLogin ? undefined : name });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") fieldErrors.email = err.message;
          if (err.path[0] === "password") fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error(t("auth.errors.loginFailed"));
          } else if (error.message.includes("Email not confirmed")) {
            toast.error(t("auth.errors.confirmEmail"));
          } else {
            toast.error(error.message || t("auth.errors.unexpected"));
          }
        } else {
          toast.success(t("auth.success.welcomeBack"));
          // Navigation is handled by useEffect based on role
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error(t("auth.errors.alreadyRegistered"));
          } else {
            toast.error(error.message || t("auth.errors.unexpected"));
          }
        } else {
          toast.success(t("auth.success.accountCreated"));
          setShowVerifyEmail(true);
        }
      }
    } catch (error) {
      toast.error(t("auth.errors.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || roleLoading || isCheckingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-soft to-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (showVerifyEmail) {
    return <VerifyEmail email={email} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher showLabel={false} />
      </div>

      {/* Logo & Brand */}
      <div className="flex flex-col items-center mb-8 animate-in">
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
        <h1 className="text-2xl font-bold text-foreground">{branding?.appName || "FitResults"}</h1>
        <p className="text-muted-foreground text-sm">{branding?.tagline || t("auth.tagline") || "Sua jornada começa aqui"}</p>
      </div>

      {/* Auth Card */}
      <Card variant="elevated" className="w-full max-w-sm animate-in-delay-1">
        <CardHeader className="text-center pb-2">
          <CardTitle>{isLogin ? t("auth.loginTitle") : t("auth.signupTitle")}</CardTitle>
          <CardDescription>
            {isLogin
              ? t("auth.loginSubtitle")
              : t("auth.signupSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              <GoogleAuthButton />
              <FacebookAuthButton />
              <MagicLinkButton />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.orContinueWithEmail")}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder={t("auth.namePlaceholder")}
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                {isLogin && (
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? t("auth.login") : t("auth.signup")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
              >
                {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
                <span className="font-semibold text-primary">
                  {isLogin ? t("auth.createNow") : t("auth.login")}
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 flex gap-4 text-xs text-muted-foreground animate-in-delay-2">
        <Link to="/privacy" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
          {t("legal.privacyPolicy")}
        </Link>
        <span>•</span>
        <Link to="/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
          {t("legal.termsOfUse")}
        </Link>
      </div>
    </div>
  );
}
