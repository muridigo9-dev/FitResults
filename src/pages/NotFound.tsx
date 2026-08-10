import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Sugestões de páginas baseadas no estado de autenticação
  const suggestedPages = user
    ? [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Meu Perfil", href: "/profile", icon: Search },
        { label: "Suporte", href: "/profile/help", icon: HelpCircle },
      ]
    : [
        { label: "Página Inicial", href: "/", icon: Home },
        { label: "Entrar", href: "/auth", icon: Search },
        { label: "Criar Conta", href: "/auth?mode=signup", icon: HelpCircle },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      {/* Ilustração animada */}
      <div className="relative mb-8">
        <div className="text-[10rem] md:text-[14rem] font-bold text-primary/10 leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl md:text-8xl animate-bounce">🔍</div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <Card className="max-w-md w-full text-center border-none shadow-xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Página não encontrada
            </h1>
            <p className="text-muted-foreground">
              A página que você está procurando não existe ou foi movida.
            </p>
          </div>

          {/* Rota tentada */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Rota acessada:</p>
            <code className="text-sm font-mono text-primary break-all">
              {location.pathname}
            </code>
          </div>

          {/* Botões de ação principais */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button className="flex-1" asChild>
              <Link to={user ? "/dashboard" : "/"}>
                <Home className="h-4 w-4 mr-2" />
                {user ? "Dashboard" : "Início"}
              </Link>
            </Button>
          </div>

          {/* Sugestões de páginas */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">
              Talvez você esteja procurando:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedPages.map((page) => (
                <Button
                  key={page.href}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  asChild
                >
                  <Link to={page.href}>
                    <page.icon className="h-3 w-3 mr-1" />
                    {page.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de ajuda */}
      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        Se você acredita que isso é um erro, entre em contato com nosso{" "}
        <Link to="/profile/help" className="text-primary hover:underline">
          suporte
        </Link>
        .
      </p>
    </div>
  );
};

export default NotFound;
