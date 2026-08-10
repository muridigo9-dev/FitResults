import { useUserContent } from "@/contexts/UserContentContext";
import { useLocation, Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireDietCreation?: boolean;
  requireWorkoutCreation?: boolean;
}

/**
 * Protects routes based on feature flags
 * Redirects to dashboard if user tries to access disabled features
 */
export function ProtectedRoute({ 
  children, 
  requireDietCreation,
  requireWorkoutCreation 
}: ProtectedRouteProps) {
  const { settings } = useUserContent();

  if (requireDietCreation && !settings.allowUserDietCreation) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireWorkoutCreation && !settings.allowUserWorkoutCreation) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Hook to check if a route should be visible based on feature flags
 */
export function useRouteAccess() {
  const { settings } = useUserContent();

  const canAccessMyDiets = settings.allowUserDietCreation;
  const canAccessMyWorkouts = settings.allowUserWorkoutCreation;

  return {
    canAccessMyDiets,
    canAccessMyWorkouts,
  };
}
