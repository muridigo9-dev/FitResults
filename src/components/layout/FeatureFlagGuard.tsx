import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useFeatureFlagsContext } from "@/contexts/FeatureFlagsContext";
import { Loader2 } from "lucide-react";

interface FeatureFlagGuardProps {
    flag: string;
    redirectTo?: string;
    fallback?: React.ReactNode;
    children?: React.ReactNode;
}

export function FeatureFlagGuard({
    flag,
    redirectTo = "/dashboard",
    fallback,
    children
}: FeatureFlagGuardProps) {
    const { isEnabled, isLoading } = useFeatureFlagsContext();

    if (isLoading) {
        return (
            <div className="h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        );
    }

    if (!isEnabled(flag)) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children || <Outlet />}</>;
}
