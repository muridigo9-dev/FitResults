import { ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Skeleton } from "@/components/ui/skeleton";

interface OnboardingGuardProps {
    children: ReactNode;
}

// Public routes that don't require onboarding
const PUBLIC_ROUTES = [
    "/",
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/checkout",
    "/checkout/success",
    "/accept-invite",
    "/onboarding",
    "/install",
    "/debug",
    "/reactivate",
    "/subscription",
    "/account-inactive",
    "/privacy",
    "/terms",
];

// Admin routes that bypass onboarding
const ADMIN_ROUTES_PREFIX = ["/admin", "/trainer"];

export function OnboardingGuard({ children }: OnboardingGuardProps) {
    const { user } = useAuth();
    const { isCompleted, isLoading } = useOnboarding();
    const location = useLocation();

    // Check if current route is public or admin
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
    const isAdminRoute = ADMIN_ROUTES_PREFIX.some(prefix =>
        location.pathname.startsWith(prefix)
    );

    // If loading or we have a user but status is still unknown, wait
    if (isLoading || (user && isCompleted === undefined)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="space-y-4 w-full max-w-md p-4">
                    <div className="animate-pulse flex flex-col space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                        <div className="h-12 bg-muted rounded w-full"></div>
                        <div className="h-32 bg-muted rounded w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    // If user is logged in, onboarding not completed, and not on a public/admin route
    if (user && !isCompleted && !isPublicRoute && !isAdminRoute) {
        console.log('[OnboardingGuard] Redirecting to onboarding from:', location.pathname);
        return <Navigate to="/onboarding" replace />;
    }

    console.log('[OnboardingGuard] Allowing access to:', location.pathname);
    return <>{children}</>;
}
