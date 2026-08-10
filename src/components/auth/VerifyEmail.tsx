import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2 } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";

interface VerifyEmailProps {
    email: string;
}

export function VerifyEmail({ email }: VerifyEmailProps) {
    const navigate = useNavigate();
    const { branding } = useBranding();
    const { t } = useI18n();

    const appName = branding?.appName || "FitResults";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft to-background">
            <div className="flex flex-col items-center mb-8 animate-in slide-in-from-top-4 duration-700">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-glow mb-4">
                    <Mail className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t("auth.verifyEmailTitle")}</h1>
                <p className="text-muted-foreground text-sm text-center max-w-[280px] mt-2">
                    {t("auth.verifyEmailSubtitle", { email })}
                </p>
            </div>

            <Card variant="elevated" className="w-full max-w-sm animate-in zoom-in-95 duration-500">
                <CardContent className="pt-6 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <CheckCircle2 className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold text-lg">{t("auth.almostThere")}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t("auth.securityWarning", { appName })}
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <Button
                            className="w-full"
                            size="lg"
                            variant="outline"
                            onClick={() => window.open(`https://${email.split('@')[1]}`, '_blank')}
                        >
                            {t("auth.openInbox")}
                        </Button>

                        <Button
                            variant="ghost"
                            className="text-muted-foreground text-xs"
                            onClick={() => navigate("/auth")}
                        >
                            {t("auth.backToLogin")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 text-xs text-muted-foreground text-center max-w-[250px] animate-in fade-in duration-1000">
                {t("auth.notReceived")} <button className="text-primary font-semibold hover:underline" onClick={() => toast.info(t("auth.tryResending"))}>{t("auth.tryResending")}</button>
            </div>
        </div>
    );
}
