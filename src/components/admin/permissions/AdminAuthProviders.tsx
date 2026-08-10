import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Shield,
    Settings,
    ExternalLink,
    Mail,
    AlertCircle,
    CheckCircle2,
    Lock,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminAuthProviders() {
    const { flags, toggleFlag, isToggling } = useAdminFeatureFlags();

    const getFlagStatus = (key: string) => {
        return flags?.find(f => f.key === key);
    };

    const googleFlag = getFlagStatus("google_auth_enabled");
    const facebookFlag = getFlagStatus("facebook_auth_enabled");
    const magicLinkFlag = getFlagStatus("magic_link_enabled");

    const handleToggleProvider = async (flag: any, checked: boolean) => {
        if (!flag) {
            toast.error("Feature flag não encontrada no sistema.");
            return;
        }

        toggleFlag({ id: flag.id, enabled: checked });
    };

    return (
        <div className="space-y-6">
            <Card variant="outline" className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Informação Importante
                    </CardTitle>
                    <CardDescription className="text-primary/80">
                        A configuração das chaves de API é feita **exclusivamente** no painel do Supabase.
                        Esta tela serve apenas para habilitar ou ocultar os botões de login no aplicativo.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-6">
                {/* Google Provider Card */}
                <Card className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Google Authentication</h3>
                                        <p className="text-xs text-muted-foreground">Permite login e cadastro via Google OAuth</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground mr-2">
                                        {googleFlag?.enabled ? "Habilitado" : "Desabilitado"}
                                    </span>
                                    <Switch
                                        checked={googleFlag?.enabled ?? false}
                                        onCheckedChange={(checked) => handleToggleProvider(googleFlag, checked)}
                                        disabled={isToggling}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-dashed text-sm">
                                <p className="font-semibold flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Passos para configurar:
                                </p>
                                <ol className="space-y-2 list-decimal list-inside text-muted-foreground ml-1">
                                    <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">console do Google Cloud <ExternalLink className="h-3 w-3" /></a> e crie um projeto.</li>
                                    <li>Configure a tela de consentimento OAuth e gere um <b>Client ID</b> e <b>Client Secret</b>.</li>
                                    <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Painel do Supabase <ExternalLink className="h-3 w-3" /></a>.</li>
                                    <li>Vá em <b>Authentication &gt; Providers &gt; Google</b>.</li>
                                    <li>Cole as chaves e adicione a Redirect URI mostrada no Supabase ao projeto do Google Cloud.</li>
                                </ol>
                                <Button variant="outline" size="sm" className="w-full mt-2 gap-2" asChild>
                                    <a href="https://supabase.com/dashboard/project/_/auth/providers" target="_blank" rel="noopener noreferrer">
                                        Ir para Supabase Dashboard <ArrowRight className="h-3 w-3" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="md:w-64 bg-muted/20 border-l p-6 flex flex-col justify-center items-center text-center space-y-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${googleFlag?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {isToggling ? <Loader2 className="h-6 w-6 animate-spin" /> : (googleFlag?.enabled ? <CheckCircle2 className="h-6 w-6" /> : <Settings className="h-6 w-6" />)}
                            </div>
                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Status no App</p>
                            <p className="text-sm font-bold">
                                {googleFlag?.enabled ? "Botões Visíveis" : "Botões Ocultos"}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Facebook Provider Card */}
                <Card className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#1877F2"
                                                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Facebook Authentication</h3>
                                        <p className="text-xs text-muted-foreground">Permite login e cadastro via Facebook OAuth</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground mr-2">
                                        {facebookFlag?.enabled ? "Habilitado" : "Desabilitado"}
                                    </span>
                                    <Switch
                                        checked={facebookFlag?.enabled ?? false}
                                        onCheckedChange={(checked) => handleToggleProvider(facebookFlag, checked)}
                                        disabled={isToggling}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-dashed text-sm">
                                <p className="font-semibold flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Passos para configurar:
                                </p>
                                <ol className="space-y-2 list-decimal list-inside text-muted-foreground ml-1">
                                    <li>Acesse o <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Facebook for Developers <ExternalLink className="h-3 w-3" /></a> e crie um App.</li>
                                    <li>Adicione o produto "Facebook Login" e obtenha o <b>App ID</b> e <b>App Secret</b>.</li>
                                    <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Painel do Supabase <ExternalLink className="h-3 w-3" /></a>.</li>
                                    <li>Vá em <b>Authentication &gt; Providers &gt; Facebook</b>.</li>
                                    <li>Cole as chaves e adicione a Redirect URI do Supabase à lista de URIs válidas no painel do Facebook.</li>
                                </ol>
                                <Button variant="outline" size="sm" className="w-full mt-2 gap-2" asChild>
                                    <a href="https://supabase.com/dashboard/project/_/auth/providers" target="_blank" rel="noopener noreferrer">
                                        Ir para Supabase Dashboard <ArrowRight className="h-3 w-3" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="md:w-64 bg-muted/20 border-l p-6 flex flex-col justify-center items-center text-center space-y-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${facebookFlag?.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                {isToggling ? <Loader2 className="h-6 w-6 animate-spin" /> : (facebookFlag?.enabled ? <CheckCircle2 className="h-6 w-6" /> : <Settings className="h-6 w-6" />)}
                            </div>
                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Status no App</p>
                            <p className="text-sm font-bold">
                                {facebookFlag?.enabled ? "Botões Visíveis" : "Botões Ocultos"}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Magic Link Provider Card */}
                <Card className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-[#888888]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Magic Link</h3>
                                        <p className="text-xs text-muted-foreground">Login sem senha via link por e-mail</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground mr-2">
                                        {magicLinkFlag?.enabled ? "Habilitado" : "Desabilitado"}
                                    </span>
                                    <Switch
                                        checked={magicLinkFlag?.enabled ?? false}
                                        onCheckedChange={(checked) => handleToggleProvider(magicLinkFlag, checked)}
                                        disabled={isToggling}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-dashed text-sm">
                                <p className="font-semibold flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Recomendações:
                                </p>
                                <ul className="space-y-2 list-disc list-inside text-muted-foreground ml-1">
                                    <li>Configure um provedor de SMTP (como Resend ou SendGrid) no Supabase para evitar limites de envio.</li>
                                    <li>Personalize o template de e-mail em <b>Authentication &gt; Email Templates &gt; Magic Link</b>.</li>
                                    <li>Verifique o tempo de expiração do link nas configurações de autenticação.</li>
                                </ul>
                                <Button variant="outline" size="sm" className="w-full mt-2 gap-2" asChild>
                                    <a href="https://supabase.com/dashboard/project/_/auth/settings" target="_blank" rel="noopener noreferrer">
                                        Configurar Auth no Supabase <ArrowRight className="h-3 w-3" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="md:w-64 bg-muted/20 border-l p-6 flex flex-col justify-center items-center text-center space-y-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${magicLinkFlag?.enabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                                {isToggling ? <Loader2 className="h-6 w-6 animate-spin" /> : (magicLinkFlag?.enabled ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />)}
                            </div>
                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Status no App</p>
                            <p className="text-sm font-bold">
                                {magicLinkFlag?.enabled ? "Opção Visível" : "Opção Oculta"}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <p className="text-[10px] text-muted-foreground text-center italic">
                Nota: Novos provedores como Facebook, Apple e GitHub serão listados aqui assim que habilitados no sistema.
            </p>
        </div>
    );
}
