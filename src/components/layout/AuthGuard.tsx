import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/states/LoadingState";
import { isTestUserPattern } from "@/lib/testUsers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthGuardProps {
  children: ReactNode;
  requireSubscription?: boolean;
  allowCancelled?: boolean; // Allow cancelled users to access (for reactivation pages)
}

interface SubscriptionCheckResult {
  isActive: boolean;
  isAdmin: boolean;
  isTestUser: boolean;
  status: string | null;
  loading: boolean;
}

/**
 * AuthGuard - Protects routes from unauthorized access
 * 
 * Features:
 * - Redirects unauthenticated users to /auth
 * - Optionally checks for active subscription (ONLY for non-admin users)
 * - Admins and test users bypass subscription checks
 * - Never renders protected content before auth check completes
 */
export function AuthGuard({ children, requireSubscription = false, allowCancelled = false }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checkResult, setCheckResult] = useState<SubscriptionCheckResult>({
    isActive: false,
    isAdmin: false,
    isTestUser: false,
    status: null,
    loading: true,
  });
  const [isReactivating, setIsReactivating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { data: status, isLoading: statusLoading } = useSubscriptionStatus();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const justReactivated = searchParams.get("reactivated") === "true";

    if (justReactivated && !isReactivating) {
      setIsReactivating(true);
    }

    if (!statusLoading && status) {
      const activeStatuses = ["active", "trialing"];
      const isActive = activeStatuses.includes(status.status || "") && status.account_status === "active";

      // IF NOT ACTIVE BUT JUST REACTIVATED: Wait instead of failing immediately
      if (!isActive && justReactivated && retryCount < 10) {
        console.log(`[AuthGuard] Not active yet, retrying... (${retryCount + 1}/10)`);
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
        return () => clearTimeout(timer);
      }

      setCheckResult({
        isActive,
        isAdmin: status.isAdmin,
        isTestUser: status.isTestUser,
        status: status.status || status.account_status,
        loading: false,
      });
    }
  }, [user?.id, status, statusLoading, retryCount, location.search, location.pathname]);

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Verificando autenticação..." />;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Force password change if required (except when already on reset page)
  if (user.user_metadata?.must_change_password && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  // Still loading user status check
  if (checkResult.loading) {
    const loadingMsg = isReactivating
      ? "Confirmando sua assinatura... Isso pode levar alguns segundos."
      : "Verificando permissões...";
    return <LoadingScreen message={loadingMsg} />;
  }

  // Admin always has access (even if technically cancelled)
  if (checkResult.isAdmin) {
    return <>{children}</>;
  }

  // Test users have access UNLESS explicitly blocked (cancelled/suspended)
  if (checkResult.isTestUser && checkResult.isActive) {
    return <>{children}</>;
  }

  // If account is explicitly blocked (cancelled, expired, suspended), redirect to inactive page
  // EXCEPT if allowCancelled=true (for reactivation pages)
  if (!checkResult.isActive && (
    checkResult.status === "cancelled" ||
    checkResult.status === "expired" ||
    checkResult.status === "suspended"
  )) {
    // Allow access if specifically allowed (e.g., reactivation pages)
    if (allowCancelled) {
      return <>{children}</>;
    }

    return (
      <Navigate
        to="/account-inactive"
        state={{ reason: checkResult.status }}
        replace
      />
    );
  }

  // Non-admin: If subscription is required but not active, redirect...
  if (requireSubscription && !checkResult.isActive) {
    // If they never had a plan (none), send them to the initial checkout
    if (checkResult.status === "none") {
      return (
        <Navigate
          to="/checkout"
          state={{ from: location.pathname }}
          replace
        />
      );
    }

    // If they have a status like 'cancelled', 'expired', or 'suspended', send to inactive page
    return (
      <Navigate
        to="/account-inactive"
        state={{ reason: checkResult.status || "cancelled" }}
        replace
      />
    );
  }

  // All checks passed - render protected content
  return <>{children}</>;
}

/**
 * Hook to check if user has active subscription or is admin
 */
export function useSubscriptionStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["subscription-status", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    queryFn: async () => {
      const { data: profile, error } = await (supabase as any)
        .from("profiles")
        .select("subscription_status, account_status, stripe_customer_id")
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();

      const isAdmin = !!roleData;
      const userEmail = user!.email?.toLowerCase() || "";
      const isTestUser = isTestUserPattern(userEmail);

      return {
        isActive: (profile.subscription_status === "active" || profile.subscription_status === "trialing") && profile.account_status === "active",
        isAdmin,
        isTestUser,
        status: profile.subscription_status,
        account_status: profile.account_status,
        loading: false,
      };
    },
  });
}
