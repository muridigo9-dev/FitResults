/**
 * RoleGuard Component
 * 
 * Garante isolamento total de navegação por role.
 * Previne acesso cruzado entre diferentes perfis de usuário.
 * Intercepta navegação via botão voltar, URLs diretas, e deep links.
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// Define role domains - cada role tem seu próprio domínio de navegação
const ROLE_DOMAINS = {
  admin: {
    prefix: "/admin",
    home: "/admin",
    allowedPaths: ["/admin"],
  },
  academy_admin: {
    prefix: "/academy",
    home: "/academy/dashboard",
    allowedPaths: ["/academy", "/profile"],
  },
  multi_academy_admin: {
    prefix: "/academy",
    home: "/academy/dashboard",
    allowedPaths: ["/academy", "/profile"],
  },
  personal_trainer: {
    prefix: "/trainer",
    home: "/trainer/dashboard",
    allowedPaths: ["/trainer", "/profile"],
  },
  nutritionist: {
    prefix: "/trainer", // Nutritionists use trainer dashboard
    home: "/trainer/dashboard",
    allowedPaths: ["/trainer", "/profile"],
  },
  content_creator: {
    prefix: "/admin",
    home: "/admin/content",
    allowedPaths: ["/admin/content", "/profile"],
  },
  aluno: {
    prefix: "/app",
    home: "/dashboard",
    allowedPaths: [
      "/dashboard",
      "/checkin",
      "/progress",
      "/profile",
      "/health",
      "/nutrition",
      "/diets",
      "/workouts",
      "/challenges",
      "/my-diets",
      "/my-workouts",
      "/my-trainer",
    ],
  },
  user: {
    prefix: "/app",
    home: "/dashboard",
    allowedPaths: [
      "/dashboard",
      "/checkin",
      "/progress",
      "/profile",
      "/health",
      "/nutrition",
      "/diets",
      "/workouts",
      "/challenges",
      "/my-diets",
      "/my-workouts",
    ],
  },
  moderator: {
    prefix: "/admin",
    home: "/admin/support",
    allowedPaths: ["/admin/support", "/admin/cancellations", "/profile"],
  },
} as const;

// Public routes accessible to everyone
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
];

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectOnFail?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  redirectOnFail,
}: RoleGuardProps) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip validation for public routes
    if (PUBLIC_ROUTES.some((route) => location.pathname === route)) {
      return;
    }

    // Skip if no user (will be handled by AuthGuard)
    if (!user || !role) {
      return;
    }

    // Check if specific roles are required
    if (allowedRoles && !allowedRoles.includes(role)) {
      const roleDomain = ROLE_DOMAINS[role as keyof typeof ROLE_DOMAINS];
      const fallback = redirectOnFail || roleDomain?.home || "/dashboard";

      console.warn(
        `[RoleGuard] Access denied: User with role "${role}" attempted to access "${location.pathname}". Redirecting to ${fallback}`
      );

      navigate(fallback, { replace: true });
      return;
    }

    // Validate role domain
    const roleDomain = ROLE_DOMAINS[role as keyof typeof ROLE_DOMAINS];

    if (!roleDomain) {
      console.error(`[RoleGuard] Unknown role: ${role}`);
      navigate("/dashboard", { replace: true });
      return;
    }

    // Check if current path is allowed for this role
    const isAllowed = roleDomain.allowedPaths.some((allowedPath) =>
      location.pathname.startsWith(allowedPath)
    );

    if (!isAllowed) {
      console.warn(
        `[RoleGuard] Role "${role}" attempted to access unauthorized path: ${location.pathname}. Redirecting to ${roleDomain.home}`
      );

      navigate(roleDomain.home, { replace: true });
    }
  }, [user, role, location.pathname, navigate, allowedRoles, redirectOnFail]);

  return <>{children}</>;
}

/**
 * Hook to get role-specific navigation info
 */
export function useRoleNavigation() {
  const { role } = useUserRole();
  const navigate = useNavigate();

  const roleDomain = role
    ? ROLE_DOMAINS[role as keyof typeof ROLE_DOMAINS]
    : null;

  const navigateToHome = () => {
    if (roleDomain) {
      navigate(roleDomain.home, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const canAccessPath = (path: string): boolean => {
    if (!roleDomain) return false;

    return roleDomain.allowedPaths.some((allowedPath) =>
      path.startsWith(allowedPath)
    );
  };

  const getSafeBackPath = (): string => {
    // Always return role's home as safe back path
    return roleDomain?.home || "/dashboard";
  };

  return {
    home: roleDomain?.home || "/dashboard",
    allowedPaths: roleDomain?.allowedPaths || [],
    navigateToHome,
    canAccessPath,
    getSafeBackPath,
  };
}

/**
 * Hook to handle safe back navigation
 * Prevents navigating to routes outside role domain
 */
export function useSafeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getSafeBackPath, canAccessPath } = useRoleNavigation();

  const goBack = () => {
    // Check if we can safely go back
    const historyLength = window.history.length;

    if (historyLength > 1) {
      // Try to go back, but we can't validate where we'll land
      // So we use a state flag to check after navigation
      const safeBack = getSafeBackPath();

      // Store current path
      const currentPath = location.pathname;

      // Attempt to go back
      window.history.back();

      // Set a timeout to check if navigation happened
      setTimeout(() => {
        // If we're still on the same path or on an invalid path, go to safe home
        if (
          location.pathname === currentPath ||
          !canAccessPath(location.pathname)
        ) {
          navigate(safeBack, { replace: true });
        }
      }, 100);
    } else {
      // No history, go to safe home
      navigate(getSafeBackPath(), { replace: true });
    }
  };

  return goBack;
}
