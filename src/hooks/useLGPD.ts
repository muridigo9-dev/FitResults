import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ==========================================
// TYPES
// ==========================================

export type LGPDRequestType =
  | "data_confirmation"
  | "data_access"
  | "data_correction"
  | "data_portability"
  | "data_anonymization"
  | "data_deletion"
  | "consent_revocation"
  | "confirmation" // Also allow short names for FE compatibility
  | "access"
  | "correction"
  | "portability"
  | "anonymization"
  | "deletion"
  | "revocation";

export type LGPDRequestStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "denied"
  | "completed"
  | "requires_info"
  | "cancelled"
  | "processing"
  | "failed";

export interface LGPDRequest {
  id: string;
  user_id: string;
  request_type: LGPDRequestType;
  status: LGPDRequestStatus;
  export_file_url: string | null;
  support_ticket_id: string | null;
  requested_at: string;
  deadline_at: string | null;
  resolved_at: string | null;
  handled_by: string | null;
  admin_notes: string | null;
  user_message: string | null; // Standardized from user_notes
  denial_reason: string | null;
  data_export_url: string | null;
}

export interface LGPDRequestWithUser extends LGPDRequest {
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
  handler_name: string | null;
}

export interface LGPDAuditLog {
  id: string;
  request_id: string | null;
  user_id: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  timestamp: string;
  actor_id: string | null;
  performer?: {
    full_name: string | null;
  };
}

export type LGPDStatusFilter = "all" | LGPDRequestStatus;

// ==========================================
// USER HOOKS
// ==========================================

/**
 * Hook for users to manage their LGPD requests
 */
export function useUserLGPDRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's LGPD requests
  const {
    data: requests = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-lgpd-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching LGPD requests:", error);
        throw error;
      }

      return (data || []) as unknown as LGPDRequest[];
    },
    enabled: !!user,
  });

  // Create new LGPD request using RPC for atomicity and notifications
  const createRequest = useMutation({
    mutationFn: async ({
      requestType,
      userMessage,
    }: {
      requestType: LGPDRequestType;
      userMessage?: string;
    }) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("[useLGPD] Creating request via RPC:", { requestType, userMessage });

      const { data, error } = await supabase.rpc("create_lgpd_request", {
        _user_id: user.id,
        _request_type: requestType,
        _user_notes: userMessage || null,
      });

      if (error) {
        console.error("[useLGPD] RPC Error:", error);
        throw error;
      }

      // 2. Fetch admins for notification
      const { data: admins } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:profiles!user_roles_user_id_fkey (
            email
          )
        `)
        .eq("role", "admin");

      const adminUserIds = admins?.map(a => a.user_id) || [];
      const adminEmails = admins?.map(a => (a.profiles as any)?.email).filter(Boolean) || [];

      // 3. Trigger Push Notification via Edge Function
      if (adminUserIds.length > 0) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              eventType: "lgpd_new_request",
              userId: adminUserIds,
              variables: {
                user_name: user.email || "Usuário",
                request_type: requestType,
              },
              metadata: { request_id: data }
            }
          });
        } catch (notifErr) {
          console.warn("[useLGPD] Admin push notification failed:", notifErr);
        }
      }

      // 4. Trigger Email Notification via Edge Function
      if (adminEmails.length > 0) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: adminEmails,
              template_type: "lgpd_new_request",
              variables: {
                user_name: user.email || "Usuário",
                request_type: requestType,
              },
              user_id: user.id
            }
          });
        } catch (emailErr) {
          console.warn("[useLGPD] Admin email notification failed:", emailErr);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lgpd-requests"] });
      toast.success("Solicitação LGPD enviada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar solicitação: ${error.message}`);
    },
  });

  // Get count of pending requests
  const pendingCount = requests.filter((r) =>
    r.status === "pending" || r.status === "requires_info"
  ).length;

  return {
    requests,
    isLoading,
    error,
    refetch,
    createRequest: createRequest.mutateAsync,
    isCreating: createRequest.isPending,
    pendingCount,
  };
}

// ==========================================
// ADMIN HOOKS
// ==========================================

/**
 * Hook for admin to manage all LGPD requests
 */
export function useAdminLGPDRequests(statusFilter: LGPDStatusFilter = "all") {
  const queryClient = useQueryClient();

  // Fetch all LGPD requests with user info
  const {
    data: requests = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-lgpd-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("lgpd_requests")
        .select(`
          *,
          user:profiles!lgpd_requests_user_id_fkey (
            full_name,
            email,
            avatar_url
          ),
          handler:profiles!lgpd_requests_handled_by_fkey (
            full_name
          ),
          support_ticket_id
        `)
        .order("requested_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching LGPD requests:", error);
        throw error;
      }

      // Transform the data to flatten the nested structure
      const transformedData = (data || []).map((request: any) => ({
        ...request,
        user_name: request.user?.full_name || null,
        user_email: request.user?.email || null,
        user_avatar: request.user?.avatar_url || null,
        handler_name: request.handler?.full_name || null,
        user: undefined,
        handler: undefined,
      }));

      return transformedData as unknown as LGPDRequestWithUser[];
    },
  });

  // Get counts by status
  const { data: statusCounts } = useQuery({
    queryKey: ["lgpd-status-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("status");

      if (error) {
        console.error("Error fetching status counts:", error);
        return { pending: 0, processing: 0, completed: 0, total: 0 };
      }

      const counts = {
        pending: 0,
        processing: 0,
        completed: 0,
        total: data.length,
      };

      data.forEach((req: any) => {
        if (req.status === "pending" || req.status === "requires_info") counts.pending++;
        if (req.status === "processing" || req.status === "under_review") counts.processing++;
        if (req.status === "completed") counts.completed++;
      });

      return counts;
    },
  });

  // Approve request
  const approveRequest = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      requestType,
      adminNotes,
    }: {
      requestId: string;
      userId: string;
      requestType: string;
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "process-lgpd-request",
        {
          body: {
            action: "approve",
            request_id: requestId,
            admin_notes: adminNotes,
          },
        }
      );

      if (error) throw error;

      // 2. Notify User (Explicit notification)
      const { notifyLGPDUpdate } = await import("@/lib/notifications");
      await notifyLGPDUpdate(userId, requestType, "approved", adminNotes);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lgpd-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-status-counts"] });
      toast.success("Solicitação aprovada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  // Deny request
  const denyRequest = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      requestType,
      justification,
    }: {
      requestId: string;
      userId: string;
      requestType: string;
      justification: string;
    }) => {
      if (!justification.trim()) {
        throw new Error("Justificativa é obrigatória");
      }

      const { data, error } = await supabase.functions.invoke(
        "process-lgpd-request",
        {
          body: {
            action: "deny",
            request_id: requestId,
            justification,
          },
        }
      );

      if (error) throw error;

      // 2. Notify User (Explicit notification)
      const { notifyLGPDUpdate } = await import("@/lib/notifications");
      await notifyLGPDUpdate(userId, requestType, "denied", justification);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lgpd-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-status-counts"] });
      toast.success("Solicitação negada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao negar: ${error.message}`);
    },
  });

  // Execute request
  const executeRequest = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      requestType,
      adminNotes,
    }: {
      requestId: string;
      userId: string;
      requestType: string;
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "process-lgpd-request",
        {
          body: {
            action: "execute",
            request_id: requestId,
            admin_notes: adminNotes,
          },
        }
      );

      if (error) throw error;

      // 2. Notify User (Explicit notification)
      const { notifyLGPDUpdate } = await import("@/lib/notifications");
      await notifyLGPDUpdate(userId, requestType, "completed", adminNotes);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lgpd-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-status-counts"] });
      toast.success("Solicitação executada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao executar: ${error.message}`);
    },
  });

  // Request more info
  const requestInfo = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      requestType,
      adminNotes,
    }: {
      requestId: string;
      userId: string;
      requestType: string;
      adminNotes: string;
    }) => {
      if (!adminNotes.trim()) {
        throw new Error("Informações solicitadas são obrigatórias");
      }

      const { error } = await supabase
        .from("lgpd_requests")
        .update({
          status: "requires_info", // Use unified DB name
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // 2. Notify User (Explicit notification)
      const { notifyLGPDUpdate } = await import("@/lib/notifications");
      await notifyLGPDUpdate(userId, requestType, "requires_info", adminNotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lgpd-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-status-counts"] });
      toast.success("Informações solicitadas ao usuário");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    requests,
    isLoading,
    error,
    refetch,
    statusCounts: statusCounts || { pending: 0, processing: 0, completed: 0, total: 0 },
    approveRequest: approveRequest.mutate,
    isApproving: approveRequest.isPending,
    denyRequest: denyRequest.mutate,
    isDenying: denyRequest.isPending,
    executeRequest: executeRequest.mutate,
    isExecuting: executeRequest.isPending,
    requestInfo: requestInfo.mutate,
    isRequestingInfo: requestInfo.isPending,
  };
}

/**
 * Hook for admin to view LGPD audit logs
 */
export function useAdminLGPDAuditLogs(requestId?: string) {
  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["lgpd-audit-logs", requestId],
    queryFn: async () => {
      let query = supabase
        .from("lgpd_audit_logs")
        .select(`
          *,
          performer:profiles!lgpd_audit_logs_performed_by_fkey (
            full_name
          )
        `)
        .order("timestamp", { ascending: false });

      if (requestId) {
        query = query.eq("request_id", requestId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
      }

      return (data || []) as unknown as LGPDAuditLog[];
    },
  });

  return {
    logs,
    isLoading,
    error,
  };
}

/**
 * Global master hook for LGPD feature management.
 * Provides centralized access to LGPD status and sub-features.
 */
import { useUserCapabilities } from "./useUserCapabilities";

export function useLGPD() {
  const { features, isLoading } = useUserCapabilities();

  const lgpd = features.lgpd;
  const isMasterEnabled = lgpd?.enabled || false;

  return {
    isLoading,
    /** Master Switch */
    enabled: isMasterEnabled,
    /** Sub-features (only true if master is enabled) */
    exportEnabled: isMasterEnabled && lgpd?.dataExport,
    anonymizationEnabled: isMasterEnabled && lgpd?.anonymization,
    hardDeleteEnabled: isMasterEnabled && lgpd?.hardDelete,
  };
}
