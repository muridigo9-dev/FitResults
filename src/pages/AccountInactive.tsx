import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, XCircle, Clock, Shield, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/hooks/useBranding";

type AccountStatus = "cancelled" | "canceled" | "expired" | "suspended" | null;

const STATUS_CONFIG: Record<string, {
    icon: typeof XCircle;
    variant: "destructive" | "default";
}> = {
    cancelled: { icon: XCircle, variant: "destructive" },
    canceled: { icon: XCircle, variant: "destructive" },
    expired: { icon: Clock, variant: "default" },
    suspended: { icon: Shield, variant: "destructive" },
};

export default function AccountInactive() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const { branding } = useBranding();

    // Get the reason from navigation state or default to cancelled
    const reason = (location.state?.reason as AccountStatus) || "cancelled";

    // Normalize 'canceled' to 'cancelled' for consistency
    const normalizedReason = reason === "canceled" ? "cancelled" : reason;

    const config = STATUS_CONFIG[normalizedReason] || STATUS_CONFIG.cancelled;
    const Icon = config.icon;

    const handleChoosePlan = () => {
        // Navigate to reactivate instead of subscription to avoid loop
        navigate("/reactivate");
    };

    const handleLogout = async () => {
        await signOut();
        navigate("/auth", { replace: true });
    };

    useEffect(() => {
        // If user is not logged in, redirect to auth
        if (!user) {
            navigate("/auth", { replace: true });
        }
    }, [user, navigate]);

    const handleContactSupport = () => {
        // Use dynamic support email from branding
        const supportEmail = branding.supportEmail || "support@fitresults.com";
        window.location.href = `mailto:${supportEmail}`;
    };

    const handlePrimaryAction = () => {
        if (normalizedReason === "suspended") {
            handleContactSupport();
        } else {
            handleChoosePlan();
        }
    };

    // Get translated content based on reason
    const getContent = () => {
        if (normalizedReason === "suspended") {
            return {
                title: t("accountInactive.suspended.title"),
                message: t("accountInactive.suspended.message"),
                primaryAction: t("accountInactive.contactSupport"),
            };
        }

        if (normalizedReason === "expired") {
            return {
                title: t("accountInactive.expired.title"),
                message: t("accountInactive.expired.message"),
                primaryAction: t("accountInactive.renewSubscription"),
            };
        }

        // Default to cancelled
        return {
            title: t("accountInactive.cancelled.title"),
            message: t("accountInactive.cancelled.message"),
            primaryAction: t("accountInactive.choosePlan"),
        };
    };

    const content = getContent();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Icon className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">{content.title}</CardTitle>
                    <CardDescription className="text-base">{content.message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Primary Action */}
                    <Button
                        onClick={handlePrimaryAction}
                        className="w-full"
                        size="lg"
                    >
                        {content.primaryAction}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    {/* Secondary Actions */}
                    {normalizedReason !== "suspended" && (
                        <Button
                            onClick={handleContactSupport}
                            variant="outline"
                            className="w-full"
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {t("accountInactive.contactSupport")}
                        </Button>
                    )}

                    {/* Logout */}
                    <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("accountInactive.logout")}
                    </Button>

                    {/* Info Box */}
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm text-muted-foreground">
                            {content.message}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
