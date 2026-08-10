import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useValidateInvite, useAcceptInvite } from "@/hooks/useAcademyInvites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/states";
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  User,
  Lock,
  ArrowRight,
  Dumbbell,
  Building2,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AcademyBadge } from "@/components/academy";
import { useBranding } from "@/hooks/useBranding";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { user } = useAuth();
  const { data: invite, isLoading: isValidating } = useValidateInvite(token);
  const { acceptInvite, isAccepting } = useAcceptInvite();
  const { branding } = useBranding();

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill email from invite
  useEffect(() => {
    if (invite?.email) {
      setEmail(invite.email);
    }
  }, [invite?.email]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${branding.appUrl || window.location.origin}/accept-invite?token=${token}`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    try {
      await acceptInvite({ token });

      // Check if user has completed onboarding
      if (user?.id) {
        const { data: anamnesis } = await supabase
          .from("anamnesis")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (anamnesis && anamnesis.length > 0) {
          navigate("/dashboard");
        } else {
          navigate("/student-onboarding");
        }
      } else {
        navigate("/student-onboarding");
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              O link de convite não contém um token válido.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <LoadingScreen message="Validando convite..." />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Convite Não Encontrado</CardTitle>
            <CardDescription>
              Este convite não existe ou já foi utilizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <CardTitle>Convite Expirado</CardTitle>
            <CardDescription>
              Este convite expirou ou foi cancelado. Entre em contato com seu
              treinador para solicitar um novo convite.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in - show accept button
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain" />
              ) : (
                <Dumbbell className="w-8 h-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">{branding?.appName || "Convite de Treinador"}</CardTitle>
            <CardDescription>
              Você foi convidado para ser aluno de
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Academy Info (if applicable) */}
            {invite.academy && (
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    {invite.academy.logo_url ? (
                      <img
                        src={invite.academy.logo_url}
                        alt={invite.academy.name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{invite.academy.name}</p>
                    <p className="text-xs text-muted-foreground">Academia</p>
                  </div>
                </div>
              </div>
            )}

            {/* Inviter Info */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-lg">
                {invite.inviter?.full_name || "Convidado por"}
              </p>
              <p className="text-sm text-muted-foreground">
                {invite.inviter?.email}
              </p>
              {invite.target_role && (
                <div className="mt-2">
                  <AcademyBadge
                    role={
                      invite.target_role === "personal_trainer" ? "trainer" :
                        invite.target_role === "nutritionist" ? "nutritionist" :
                          invite.target_role === "content_creator" ? "content_creator" :
                            "student"
                    }
                  />
                </div>
              )}
            </div>

            {/* Message */}
            {invite.message && (
              <div className="bg-accent/30 border border-accent rounded-lg p-4">
                <p className="text-sm italic">"{invite.message}"</p>
              </div>
            )}

            {/* Benefits */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Treinos personalizados
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Dietas sob medida
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Acompanhamento de progresso
              </p>
            </div>

            {/* Accept Button */}
            <Button
              onClick={handleAcceptInvite}
              disabled={isAccepting}
              className="w-full"
              size="lg"
            >
              {isAccepting ? (
                "Processando..."
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Aceitar Convite
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao aceitar, seu treinador poderá ver seu progresso e atribuir
              conteúdos exclusivos para você.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not logged in - show auth form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 overflow-hidden">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain" />
            ) : (
              <Dumbbell className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">{branding?.appName || "Convite de Treinador"}</CardTitle>
          <CardDescription>
            {invite.trainer?.full_name || "Seu treinador"} convidou você!
            <br />
            {isLogin ? "Faça login" : "Crie sua conta"} para aceitar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Preview */}
          {invite.message && (
            <div className="bg-accent/30 border border-accent rounded-lg p-3">
              <p className="text-sm italic">"{invite.message}"</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                "Processando..."
              ) : (
                <>
                  {isLogin ? "Entrar" : "Criar Conta"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Não tem conta?" : "Já tem conta?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Após {isLogin ? "entrar" : "criar sua conta"}, você poderá aceitar
            o convite e começar seu acompanhamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
