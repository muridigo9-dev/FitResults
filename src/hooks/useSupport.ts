import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

// ==========================================
// TYPES
// ==========================================

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "pending" | "replied" | "closed";
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigned_admin_id: string | null;
  resolution_notes: string | null;
  is_resolved: boolean | null;
  satisfaction_score: number | null;
  satisfaction_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketSummary extends SupportTicket {
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
  assigned_admin_name: string | null;
  message_count: number;
  user_message_count: number;
  last_message: string | null;
  last_message_sender: "user" | "admin" | null;
  last_message_at: string | null;
  first_response_time: string | null;
  resolution_time: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_id: string | null;
  message: string;
  created_at: string;
}

export type TicketStatusFilter = "all" | "open" | "pending" | "replied" | "closed";

// ==========================================
// ADMIN HOOKS
// ==========================================

/**
 * Hook for admin to manage all support tickets
 */
export function useAdminSupportTickets(statusFilter: TicketStatusFilter = "all") {
  const queryClient = useQueryClient();

  // Fetch tickets with summary info
  const {
    data: tickets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets_summary" as any)
        .select("*")
        .order("updated_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
        throw error;
      }

      return (data || []) as unknown as SupportTicketSummary[];
    },
  });

  // Get open tickets count
  const { data: openCount = 0 } = useQuery({
    queryKey: ["support-open-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_open_tickets_count" as any);
      if (error) {
        console.error("Error getting open count:", error);
        return 0;
      }
      return data as number;
    },
  });

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: SupportTicket["status"];
    }) => {
      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-open-count"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Assign ticket to admin
  const assignTicket = useMutation({
    mutationFn: async ({
      ticketId,
      adminId,
    }: {
      ticketId: string;
      adminId: string | null;
    }) => {
      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ assigned_admin_id: adminId, updated_at: new Date().toISOString() } as any)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket atribuído!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir: ${error.message}`);
    },
  });

  // Real-time updates for tickets and open count
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
          queryClient.invalidateQueries({ queryKey: ["support-open-count"] });
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "insert", schema: "public", table: "support_messages" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
          queryClient.invalidateQueries({ queryKey: ["support-open-count"] });

          // Toast for new user message
          if (payload.new?.sender_type === "user") {
            toast.info("Nova mensagem de suporte recebida!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tickets,
    isLoading,
    error,
    refetch,
    openCount,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
    assignTicket: assignTicket.mutate,
    isAssigning: assignTicket.isPending,
    closeTicket: useMutation({
      mutationFn: async ({
        ticketId,
        notes,
        resolved,
      }: {
        ticketId: string;
        notes: string;
        resolved: boolean;
      }) => {
        const { error } = await supabase
          .from("support_tickets" as any)
          .update({
            status: "closed",
            resolution_notes: notes,
            is_resolved: resolved,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", ticketId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["support-open-count"] });
        toast.success("Ticket encerrado com sucesso!");
      },
      onError: (error: Error) => {
        toast.error(`Erro ao encerrar: ${error.message}`);
      },
    }).mutate,
    updateMetadata: useMutation({
      mutationFn: async ({
        ticketId,
        category,
        priority,
      }: {
        ticketId: string;
        category?: string;
        priority?: SupportTicket["priority"];
      }) => {
        const updates: any = { updated_at: new Date().toISOString() };
        if (category) updates.category = category;
        if (priority) updates.priority = priority;

        const { error } = await supabase
          .from("support_tickets" as any)
          .update(updates)
          .eq("id", ticketId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        toast.success("Informações atualizadas!");
      },
      onError: (error: Error) => {
        toast.error(`Erro ao atualizar: ${error.message}`);
      },
    }).mutate,
  };
}

/**
 * Hook for admin to manage messages in a ticket
 */
export function useAdminSupportMessages(ticketId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages for ticket
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("support_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SupportMessage[];
    },
    enabled: !!ticketId,
  });

  // Real-time updates for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`admin-ticket-messages-${ticketId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "insert",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  // Send reply
  const sendReply = useMutation({
    mutationFn: async ({
      message,
      userId,
      subject
    }: {
      message: string;
      userId: string;
      subject: string;
    }) => {
      if (!ticketId || !message.trim() || !user) {
        throw new Error("Dados inválidos");
      }

      // Insert message
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .insert({
          ticket_id: ticketId,
          sender_type: "admin",
          sender_id: user.id,
          message: message.trim(),
        } as any);

      if (msgError) throw msgError;

      // Update ticket status to replied
      const { error: ticketError } = await supabase
        .from("support_tickets" as any)
        .update({
          status: "replied",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // 3. Notify User (Explicit notification)
      const { notifySupportResponse } = await import("@/lib/notifications");
      await notifySupportResponse(userId, ticketId, subject, message.substring(0, 100));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-open-count"] });
      toast.success("Resposta enviada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendReply: (
      data: { message: string; userId: string; subject: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      sendReply.mutate(data, options);
    },
    isSending: sendReply.isPending,
  };
}

// ==========================================
// USER HOOKS
// ==========================================

/**
 * Hook for users to manage their support tickets
 */
export function useUserSupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's tickets
  const {
    data: tickets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-support-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("support_tickets" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SupportTicket[];
    },
    enabled: !!user,
  });

  // Real-time updates for user tickets
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-support-realtime-${user.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "insert",
          schema: "public",
          table: "support_messages",
        },
        (payload: any) => {
          // Check if this message is an admin reply
          if (payload.new?.sender_type === "admin") {
            // Note: In a production environment, we should verify if this ticket belongs to the user
            // but for simple real-time invalidation this is effective.
            queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
            toast.success("Você recebeu uma nova resposta do suporte!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Create new ticket
  const createTicket = useMutation({
    mutationFn: async ({
      subject,
      message,
    }: {
      subject: string;
      message: string;
    }) => {
      if (!user || !subject.trim() || !message.trim()) {
        throw new Error("Preencha todos os campos");
      }

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets" as any)
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          status: "open",
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      const ticketData = ticket as unknown as SupportTicket;

      // Add first message
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .insert({
          ticket_id: ticketData.id,
          sender_type: "user",
          sender_id: user.id,
          message: message.trim(),
        } as any);

      if (msgError) throw msgError;

      return ticketData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
      toast.success("Mensagem enviada! Responderemos em breve.");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Get count of tickets with replies user hasn't seen
  const unreadCount = tickets.filter((t) => t.status === "replied").length;

  return {
    tickets,
    isLoading,
    error,
    createTicket: createTicket.mutateAsync,
    isCreating: createTicket.isPending,
    unreadCount,
  };
}

/**
 * Hook for users to view/reply to messages in a ticket
 */
export function useUserSupportMessages(ticketId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-support-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("support_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SupportMessage[];
    },
    enabled: !!ticketId,
  });

  // Real-time updates for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`user-ticket-messages-${ticketId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "insert",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-support-messages", ticketId] });
          queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  // Send reply
  const sendReply = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!ticketId || !message.trim() || !user) {
        throw new Error("Dados inválidos");
      }

      // Insert message
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .insert({
          ticket_id: ticketId,
          sender_type: "user",
          sender_id: user.id,
          message: message.trim(),
        } as any);

      if (msgError) throw msgError;

      // Update ticket status to open (user is awaiting reply again)
      const { error: ticketError } = await supabase
        .from("support_tickets" as any)
        .update({
          status: "open",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // Notify Admins about new user message
      try {
        const { notifySupportResponse } = await import("@/lib/notifications");
        // We'll reuse the helper or create a specific one for admins
        // In this context, we notify admins
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (admins && admins.length > 0) {
          const adminIds = admins.map(a => a.user_id);
          const { sendDirectNotification } = await import("@/lib/notifications");
          await sendDirectNotification({
            userId: adminIds,
            title: "Nova mensagem de suporte",
            body: `Usuário enviou: ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`,
            actionUrl: "/admin/support",
            channel: "both"
          });
        }
      } catch (err) {
        console.warn("[useSupport] Admin notification failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-support-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
      toast.success("Mensagem enviada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  // Submit survey
  const submitSurvey = useMutation({
    mutationFn: async ({
      score,
      comment,
    }: {
      score: number;
      comment?: string;
    }) => {
      if (!ticketId) throw new Error("ID do ticket é obrigatório");

      const { error } = await supabase
        .from("support_tickets" as any)
        .update({
          satisfaction_score: score,
          satisfaction_comment: comment || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-support-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["user-support-tickets"] });
      toast.success("Obrigado pelo seu feedback!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar avaliação: ${error.message}`);
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendReply: (
      data: { message: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      sendReply.mutate(data, options);
    },
    isSending: sendReply.isPending,
    submitSurvey: (
      data: { score: number; comment?: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      submitSurvey.mutate(data, options);
    },
    isSubmittingSurvey: submitSurvey.isPending,
  };
}

// ==========================================
// ANALYTICS HOOKS
// ==========================================

export interface SupportAnalytics {
  kpis: {
    total_tickets: number;
    open_tickets: number;
    in_progress: number;
    closed_tickets: number;
    avg_frt_seconds: number | null;
    avg_mttr_seconds: number | null;
    csat_avg: number | null;
    resolved_within_sla_pct: number;
  };
  by_category: {
    category: string;
    count: number;
    avg_resolution_seconds: number | null;
  }[];
  csat_distribution: {
    score: number;
    count: number;
  }[];
  recent_low_scores: {
    id: string;
    subject: string;
    satisfaction_score: number;
    satisfaction_comment: string | null;
    created_at: string;
  }[];
  volume_trend: {
    date: string;
    count: number;
  }[];
}

export function useSupportAnalytics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["support-analytics", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_support_analytics", {
        _start_date: startDate?.toISOString() || null,
        _end_date: endDate?.toISOString() || null,
      });

      if (error) {
        console.error("Error fetching support analytics:", error);
        throw error;
      }

      return data as SupportAnalytics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
