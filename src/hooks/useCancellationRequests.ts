import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendCancellationRequestReceivedEmail, sendCancellationProcessedEmail } from "@/lib/email";

// ==========================================
// TYPES
// ==========================================

export interface CancellationRequest {
  id: string;
  user_id: string;
  status: "pending" | "in_review" | "completed" | "rejected";
  reason: string;
  details: string | null;
  admin_notes: string | null;
  stripe_subscription_id: string | null;
  stripe_cancellation_status: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  // From view join
  user_name?: string | null;
  user_email?: string | null;
  user_avatar?: string | null;
  subscription_status?: string | null;
  account_status?: string | null;
  processed_by_name?: string | null;
  // Legacy compatibility
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
  };
}

export interface CancellationRequestSummary {
  id: string;
  user_id: string;
  status: "pending" | "in_review" | "completed" | "rejected";
  reason: string;
  details: string | null;
  admin_notes: string | null;
  stripe_subscription_id: string | null;
  stripe_cancellation_status: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
  subscription_status: string | null;
  account_status: string | null;
  processed_by_name: string | null;
}

export interface CreateCancellationRequest {
  reason: string;
  details?: string;
}

// ==========================================
// USER HOOK
// ==========================================

export function useCancellationRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's own cancellation request
  const { data: userRequest, isLoading: userRequestLoading } = useQuery({
    queryKey: ["cancellation-request", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("account_cancellation_requests" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching cancellation request:", error);
        return null;
      }
      return data as CancellationRequest | null;
    },
    enabled: !!user?.id,
  });

  // Create cancellation request
  const createRequestMutation = useMutation({
    mutationFn: async (request: CreateCancellationRequest) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("account_cancellation_requests" as any)
        .insert({
          user_id: user.id,
          reason: request.reason,
          details: request.details || null,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellation-request", user?.id] });
      toast.success("Solicitação de cancelamento enviada! Nosso suporte entrará em contato.");

      // Send email notification
      if (user?.email) {
        sendCancellationRequestReceivedEmail(
          user.id,
          user.email,
          user.user_metadata?.full_name
        );
      }
    },
    onError: (error: any) => {
      console.error("Error creating cancellation request:", error);
      if (error.code === "23505") {
        toast.error("Você já possui uma solicitação de cancelamento em andamento.");
      } else {
        toast.error("Erro ao enviar solicitação. Tente novamente.");
      }
    },
  });

  return {
    userRequest,
    userRequestLoading,
    createRequest: createRequestMutation.mutate,
    isCreating: createRequestMutation.isPending,
  };
}

// ==========================================
// ADMIN HOOK
// ==========================================

export function useAdminCancellationRequests() {
  const queryClient = useQueryClient();

  // Fetch all cancellation requests using the summary view
  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-cancellation-requests"],
    queryFn: async () => {
      // Use the summary view which includes all user info
      const { data, error } = await supabase
        .from("cancellation_requests_summary" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cancellation requests:", error);
        throw error;
      }

      // Map to expected format with profiles for backward compatibility
      return (data || []).map((req: any) => ({
        ...req,
        profiles: {
          full_name: req.user_name,
          avatar_url: req.user_avatar,
          email: req.user_email,
        },
      })) as CancellationRequest[];
    },
  });

  // Get pending count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["cancellation-pending-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_cancellations_count" as any);
      if (error) {
        console.error("Error getting pending count:", error);
        return 0;
      }
      return data as number;
    },
  });

  // Update request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes
    }: {
      id: string;
      status: string;
      admin_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        status,
        admin_notes,
        updated_at: new Date().toISOString(),
      };

      if (status === "completed" || status === "rejected") {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = user?.id;
      }

      const { data, error } = await supabase
        .from("account_cancellation_requests" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cancellation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["cancellation-pending-count"] });
      toast.success("Solicitação atualizada!");
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast.error("Erro ao atualizar solicitação");
    },
  });

  // Process cancellation with Stripe
  const processCancellationMutation = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      cancelImmediately = false,
      adminNotes
    }: {
      requestId: string;
      userId: string;
      cancelImmediately?: boolean;
      adminNotes?: string;
    }) => {
      // Call edge function to process cancellation
      const { data, error } = await supabase.functions.invoke("process-cancellation", {
        body: {
          request_id: requestId,
          user_id: userId,
          cancel_immediately: cancelImmediately,
          admin_notes: adminNotes,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cancellation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["cancellation-pending-count"] });
      if (data?.stripe_cancelled) {
        toast.success("Assinatura cancelada no Stripe e conta marcada como cancelada!");
      } else {
        toast.success("Conta marcada como cancelada!");
      }
    },
    onError: (error: any) => {
      console.error("Error processing cancellation:", error);
      toast.error(error.message || "Erro ao processar cancelamento");
    },
  });

  return {
    requests,
    isLoading,
    error,
    refetch,
    pendingCount,
    updateRequest: updateRequestMutation.mutate,
    isUpdating: updateRequestMutation.isPending,
    processCancellation: processCancellationMutation.mutate,
    isProcessing: processCancellationMutation.isPending,
  };
}
