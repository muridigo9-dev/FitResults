import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function DebugLogger({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const { user } = useAuth();

    useEffect(() => {
        console.log("========== NAVIGATION DEBUG ==========");
        console.log("Current Path:", location.pathname);
        console.log("User ID:", user?.id);
        console.log("User Email:", user?.email);
        console.log("Location State:", location.state);
        console.log("======================================");
    }, [location.pathname, user, location.state]);

    return <>{children}</>;
}
