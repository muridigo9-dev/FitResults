/**
 * useImpersonation Hook
 * 
 * Gerencia impersonação de usuários pelo SUPER ADMIN
 * com auditoria completa e conformidade LGPD
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImpersonationLog {
  id: string;
  admin_email: string;
  admin_name: string;
  impersonated_email: string;
  impersonated_name: string;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  duration: string | null;
  status: string;
  ip_address: string | null;
}

interface StartImpersonationParams {
  targetUserId: string;
  reason?: string;
}

interface ImpersonationSession {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedEmail: string | null;
  sessionToken: string | null;
  expiresAt: string | null;
}

const IMPERSONATION_STORAGE_KEY = "impersonation_session";

/**
 * Get current impersonation session from localStorage
 */
export function getImpersonationSession(): ImpersonationSession | null {
  try {
    const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as ImpersonationSession;

    // Check if expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      clearImpersonationSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error getting impersonation session:", error);
    return null;
  }
}

/**
 * Save impersonation session to localStorage
 */
function saveImpersonationSession(session: ImpersonationSession) {
  localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear impersonation session from localStorage
 */
export function clearImpersonationSession() {
  localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}

/**
 * Check if user can be impersonated
 */
export function useCanImpersonate(targetUserId: string | null) {
  return useQuery({
    queryKey: ["can-impersonate", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { can_impersonate: false, reason: "Usuário não especificado" };

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.rpc("can_impersonate_user", {
        p_admin_id: currentUser.user.id,
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      return data[0] || { can_impersonate: false, reason: "Erro ao verificar permissões" };
    },
    enabled: !!targetUserId,
    staleTime: 0, // Always fresh
  });
}

/**
 * Start impersonation
 */
export function useStartImpersonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, reason }: StartImpersonationParams) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error("Usuário não autenticado");
      }

      // Get IP address (best effort)
      let ipAddress = null;
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.warn("Could not get IP address:", error);
      }

      const { data, error } = await supabase.rpc("start_impersonation", {
        p_admin_id: currentUser.user.id,
        p_target_user_id: targetUserId,
        p_reason: reason || null,
        p_ip_address: ipAddress,
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message);
      }

      // Get target user email
      const { data: targetUser } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", targetUserId)
        .single();

      // Save session to localStorage
      const session: ImpersonationSession = {
        isImpersonating: true,
        impersonatedUserId: targetUserId,
        impersonatedEmail: targetUser?.email || null,
        sessionToken: result.session_token,
        expiresAt: result.expires_at,
      };

      saveImpersonationSession(session);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impersonation-logs"] });
      toast.success("Impersonação iniciada", {
        description: "Você está navegando como outro usuário. Lembre-se de encerrar ao finalizar.",
      });

      // Reload page to apply impersonation context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: Error) => {
      toast.error("Erro ao iniciar impersonação", {
        description: error.message,
      });
    },
  });
}

/**
 * End impersonation
 */
export function useEndImpersonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = getImpersonationSession();
      if (!session || !session.sessionToken) {
        throw new Error("Nenhuma sessão de impersonação ativa");
      }

      const { data, error } = await supabase.rpc("end_impersonation", {
        p_session_token: session.sessionToken,
      });

      if (error) throw error;

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message);
      }

      // Clear session from localStorage
      clearImpersonationSession();

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impersonation-logs"] });
      toast.success("Impersonação encerrada", {
        description: "Você voltou ao seu usuário original.",
      });

      // Reload page to remove impersonation context
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1000);
    },
    onError: (error: Error) => {
      toast.error("Erro ao encerrar impersonação", {
        description: error.message,
      });
    },
  });
}

/**
 * Get impersonation logs
 */
export function useImpersonationLogs(adminId?: string) {
  return useQuery<ImpersonationLog[]>({
    queryKey: ["impersonation-logs", adminId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_impersonation_logs", {
        p_admin_id: adminId || null,
        p_limit: 100,
      });

      if (error) throw error;

      return data || [];
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get current impersonation status
 */
export function useImpersonationStatus() {
  return useQuery({
    queryKey: ["impersonation-status"],
    queryFn: () => {
      const session = getImpersonationSession();
      return session || {
        isImpersonating: false,
        impersonatedUserId: null,
        impersonatedEmail: null,
        sessionToken: null,
        expiresAt: null,
      };
    },
    staleTime: 0, // Always check
    refetchInterval: 60000, // Refetch every minute to check expiration
  });
}

/**
 * Combined hook for impersonation (aggregates start and status)
 */
export function useImpersonation() {
  const startMutation = useStartImpersonation();
  const { data: status } = useImpersonationStatus();

  return {
    startImpersonation: startMutation.mutate,
    isStarting: startMutation.isPending,
    isImpersonating: status?.isImpersonating || false,
    impersonatedEmail: status?.impersonatedEmail || null,
  };
}
