/**
 * NavigationGuard Component
 * 
 * Intercepta TODA navegação no aplicativo e valida se o destino
 * é permitido para o role atual do usuário.
 * 
 * Previne:
 * - Botão voltar levando para rotas de outro role
 * - URLs diretas para rotas não autorizadas
 * - Deep links inválidos
 * - Navegação via histórico do browser
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// Role-specific route patterns
const ROLE_ROUTE_PATTERNS = {
  admin: /^\/(admin|profile)/,
  academy_admin: /^\/(academy|profile)/,
  multi_academy_admin: /^\/(academy|profile)/,
  personal_trainer: /^\/(trainer|profile)/,
  nutritionist: /^\/(trainer|profile)/,
  content_creator: /^\/(admin\/content|profile)/,
  moderator: /^\/(admin\/(support|cancellations)|profile)/,
  aluno: /^\/(dashboard|daily-summary|checkin|progress|profile|health|nutrition|diets|workouts|workout-execution|exercises|challenges|my-|onboarding|student-onboarding)/,
  user: /^\/(dashboard|daily-summary|checkin|progress|profile|health|nutrition|diets|workouts|workout-execution|exercises|challenges|my-|onboarding|student-onboarding)/,
};

// Public routes (no validation needed)
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/checkout",
  "/checkout/success",
  "/accept-invite",
  "/student-onboarding",
  "/install",
  "/reactivate",
  "/subscription",
  "/account-inactive",
  "/privacy",
  "/terms",
];

// Role home pages
const ROLE_HOMES = {
  admin: "/admin",
  academy_admin: "/academy/dashboard",
  multi_academy_admin: "/academy/dashboard",
  personal_trainer: "/trainer/dashboard",
  nutritionist: "/trainer/dashboard",
  content_creator: "/admin/content",
  moderator: "/admin/support",
  aluno: "/dashboard",
  user: "/dashboard",
};

export function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip if no user
    if (!user || !role) {
      console.log('[NavigationGuard] No user/role, skipping');
      return;
    }

    console.log('[NavigationGuard] Path:', location.pathname, 'Role:', role);

    // Skip public routes
    const isPublic = PUBLIC_ROUTES.includes(location.pathname);
    console.log('[NavigationGuard] Is public?', isPublic);
    if (isPublic) {
      return;
    }

    // Get role pattern
    const rolePattern = ROLE_ROUTE_PATTERNS[role as keyof typeof ROLE_ROUTE_PATTERNS];
    const roleHome = ROLE_HOMES[role as keyof typeof ROLE_HOMES] || "/dashboard";

    // Validate current path
    if (rolePattern && !rolePattern.test(location.pathname)) {
      console.warn(
        `[NavigationGuard] Blocked unauthorized navigation: Role "${role}" attempted to access "${location.pathname}". Redirecting to ${roleHome}`
      );

      // Replace history to prevent back button from returning here
      navigate(roleHome, { replace: true });
    }
  }, [user, role, location.pathname, navigate]);

  // Intercept browser back/forward buttons
  useEffect(() => {
    if (!user || !role) return;

    const handlePopState = (event: PopStateEvent) => {
      const rolePattern = ROLE_ROUTE_PATTERNS[role as keyof typeof ROLE_ROUTE_PATTERNS];
      const roleHome = ROLE_HOMES[role as keyof typeof ROLE_HOMES] || "/dashboard";

      // Check if the destination is valid for this role
      if (rolePattern && !rolePattern.test(window.location.pathname)) {
        console.warn(
          `[NavigationGuard] Blocked back/forward navigation: Role "${role}" attempted to navigate to "${window.location.pathname}". Redirecting to ${roleHome}`
        );

        // Prevent the navigation
        event.preventDefault();

        // Navigate to safe home
        navigate(roleHome, { replace: true });
      }
    };

    // Listen to popstate (back/forward buttons)
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user, role, navigate]);

  return <>{children}</>;
}

/**
 * Clear navigation history when switching contexts
 * (e.g., after login, role change)
 */
export function clearNavigationHistory() {
  // Replace current history entry
  window.history.replaceState(null, "", window.location.href);

  // Clear forward history by pushing a new state
  window.history.pushState(null, "", window.location.href);
}

/**
 * Navigate to role-specific home and clear history
 */
export function navigateToRoleHome(role: string, navigate: (path: string, options?: any) => void) {
  const roleHome = ROLE_HOMES[role as keyof typeof ROLE_HOMES] || "/dashboard";

  // Clear history
  clearNavigationHistory();

  // Navigate to home
  navigate(roleHome, { replace: true });
}
