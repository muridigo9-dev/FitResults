import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18n } from "@/hooks/useI18n";

export function FacebookAuthButton({ redirectTo }: { redirectTo?: string }) {
    const { signInWithFacebook } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { isEnabled: isFlagEnabled } = useFeatureFlag("facebook_auth_enabled");
    const { t } = useI18n();

    // Button only shows if feature flag is ON
    if (!isFlagEnabled) {
        return null;
    }

    const handleFacebookLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await signInWithFacebook(redirectTo);
            if (error) {
                toast.error(t("auth.errors.facebookAuth") + ": " + error.message);
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
            className="w-full flex items-center justify-center gap-2 h-11 border-[#1877F2]/30 hover:bg-[#1877F2]/5 hover:text-[#1877F2] transition-colors"
            onClick={handleFacebookLogin}
            disabled={isLoading}
        >
            {isLoading ? (
                <div className="h-5 w-5 border-2 border-[#1877F2]/30 border-t-[#1877F2] rounded-full animate-spin" />
            ) : (
                <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            fill="#1877F2"
                            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                        />
                    </svg>
                    {t("auth.facebookLogin")}
                </>
            )}
        </Button>
    );
}
