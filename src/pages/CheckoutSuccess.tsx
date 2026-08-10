import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Mail, 
  ArrowRight,
  Clock,
  Shield
} from "lucide-react";
import { Link } from "react-router-dom";

export default function CheckoutSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-soft via-background to-background p-4">
      <div className="max-w-md w-full">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-700 dark:text-green-400">
              Pagamento confirmado!
            </CardTitle>
            <CardDescription className="text-base">
              Sua conta está quase pronta para uso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Step */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Verifique seu e-mail
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviamos um link para você definir sua senha e acessar sua conta.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                  1
                </div>
                <span className="text-muted-foreground">
                  Abra o email com assunto <strong>"Bem-vindo(a)"</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                  2
                </div>
                <span className="text-muted-foreground">
                  Clique no botão <strong>"Definir minha senha"</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                  3
                </div>
                <span className="text-muted-foreground">
                  Crie uma senha segura e comece a usar o app
                </span>
              </div>
            </div>

            {/* Timer Warning */}
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700 dark:text-yellow-500">
                O link expira em <strong>24 horas</strong>
              </span>
            </div>

            {/* Action */}
            <Button asChild className="w-full" size="lg">
              <Link to="/auth">
                Ir para o login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pagamento seguro processado pelo Stripe</span>
            </div>

            {/* Help Text */}
            <p className="text-center text-xs text-muted-foreground">
              Não recebeu o email?{" "}
              <a href="/profile/help" className="text-primary hover:underline">
                Entre em contato com o suporte
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
