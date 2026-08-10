import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18n } from "@/hooks/useI18n";

export function GoogleAuthButton({ redirectTo }: { redirectTo?: string }) {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { isEnabled: isFlagEnabled } = useFeatureFlag("google_auth_enabled");
    const { t } = useI18n();

    // Button only shows if feature flag is ON
    if (!isFlagEnabled) {
        return null;
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await signInWithGoogle(redirectTo);
            if (error) {
                toast.error(t("auth.errors.googleAuth") + ": " + error.message);
            }
        } catch (error) {
            toast.error(t("auth.errors.unexpected"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            type="button"
            className="w-full flex items-center justify-center gap-2 h-11"
            onClick={handleGoogleLogin}
            disabled={isLoading}
        >
            {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
                <>
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
                    {t("auth.googleLogin")}
                </>
            )}
        </Button>
    );
}
