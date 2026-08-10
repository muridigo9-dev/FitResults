import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/useI18n";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function MagicLinkButton({ redirectTo }: { redirectTo?: string }) {
    const { signInWithMagicLink } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const { isEnabled: isFlagEnabled } = useFeatureFlag("magic_link_enabled");
    const { t } = useI18n();

    // Only shows if feature flag is ON
    if (!isFlagEnabled) {
        return null;
    }

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            // Se não houver redirectTo, usamos a URL atual para que o usuário volte para onde estava (ex: Checkout)
            const finalRedirectUrl = redirectTo || window.location.href;
            const { error } = await signInWithMagicLink(email, finalRedirectUrl);

            if (error) {
                toast.error(t("auth.errors.magicLinkAuth") + ": " + error.message);
            } else {
                toast.success(t("auth.success.accountCreated")); // This is also used for login success in some contexts
                setSent(true);
            }
        } catch (error) {
            toast.error(t("auth.errors.unexpected"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog onOpenChange={(open) => { if (!open) { setSent(false); setEmail(""); } }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    className="w-full flex items-center justify-center gap-2 h-11 border-purple-500/30 hover:bg-purple-500/5 hover:text-purple-600 transition-colors"
                >
                    <Mail className="h-5 w-5" />
                    {t("auth.magicLinkLogin")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("auth.magicLinkDialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("auth.magicLinkDialogDescription")}
                    </DialogDescription>
                </DialogHeader>

                {!sent ? (
                    <form onSubmit={handleMagicLink} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="magic-email">{t("auth.magicLinkEmailLabel")}</Label>
                            <Input
                                id="magic-email"
                                type="email"
                                placeholder={t("auth.emailPlaceholder")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {t("auth.magicLinkSendButton")} <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-lg">{t("auth.magicLinkSentTitle")}</h4>
                            <p className="text-sm text-muted-foreground px-4">
                                {t("auth.magicLinkSentDescription")}
                            </p>
                        </div>
                        <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                            {t("auth.magicLinkTryAnother")}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
