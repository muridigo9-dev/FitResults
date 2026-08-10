import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StudentInvite, InviteFormData } from "@/types/personalTrainer";

/**
 * Hook for managing student invites (Personal Trainer / Academy)
 */
export function useStudentInvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch trainer's invites
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["student-invites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("student_invites")
        .select("*")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StudentInvite[];
    },
    enabled: !!user?.id,
  });

  // Send invite
  const sendInvite = useMutation({
    mutationFn: async (formData: InviteFormData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("student_invites")
        .insert({
          invited_by: user.id,
          email: formData.email.toLowerCase().trim(),
          group_id: formData.group_id || null,
          message: formData.message || null,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes("duplicate")) {
          throw new Error("Já existe um convite pendente para este email");
        }
        throw error;
      }

      // Get trainer profile for email
      const { data: trainerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send invite email
      try {
        const inviteUrl = `${window.location.origin}/accept-invite?token=${data.token}`;
        
        await supabase.functions.invoke("send-email", {
          body: {
            to: data.email,
            template_type: "student_invite",
            subject: `${trainerProfile?.full_name || "Seu treinador"} convidou você!`,
            variables: {
              trainer_name: trainerProfile?.full_name || "Personal Trainer",
              trainer_initial: (trainerProfile?.full_name || "P").charAt(0).toUpperCase(),
              trainer_email: trainerProfile?.email || "",
              invite_message: formData.message || "Aceite o convite para começar seu acompanhamento personalizado.",
              invite_url: inviteUrl,
              student_email: data.email,
            },
          },
        });
      } catch (emailError) {
        console.warn("Failed to send invite email:", emailError);
        // Don't throw - invite was created successfully
      }

      return data as StudentInvite;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
      toast.success(`Convite enviado para ${data.email}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cancel invite
  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await (supabase as any)
        .from("student_invites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
      toast.success("Convite cancelado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Resend invite (create new token)
  const resendInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      // Get original invite
      const { data: original, error: fetchError } = await (supabase as any)
        .from("student_invites")
        .select("*")
        .eq("id", inviteId)
        .single();

      if (fetchError) throw fetchError;

      // Cancel old invite
      await (supabase as any)
        .from("student_invites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

      // Create new invite
      const { data, error } = await (supabase as any)
        .from("student_invites")
        .insert({
          invited_by: original.invited_by,
          academy_id: original.academy_id,
          email: original.email,
          group_id: original.group_id,
          message: original.message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
      toast.success(`Novo convite enviado para ${data.email}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Filter helpers
  const pendingInvites = invites.filter((i) => i.status === "pending");
  const acceptedInvites = invites.filter((i) => i.status === "accepted");
  const expiredInvites = invites.filter((i) => 
    i.status === "expired" || (i.status === "pending" && new Date(i.expires_at) < new Date())
  );

  return {
    invites,
    pendingInvites,
    acceptedInvites,
    expiredInvites,
    isLoading,
    sendInvite: sendInvite.mutate,
    isSending: sendInvite.isPending,
    cancelInvite: cancelInvite.mutate,
    isCancelling: cancelInvite.isPending,
    resendInvite: resendInvite.mutate,
    isResending: resendInvite.isPending,
  };
}

/**
 * Hook for accepting an invite (for students)
 */
export function useAcceptInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const acceptInvite = useMutation({
    mutationFn: async (token: string) => {
      if (!user?.id) throw new Error("Você precisa estar logado para aceitar o convite");

      const { data, error } = await (supabase as any).rpc("accept_student_invite", {
        p_token: token,
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao aceitar convite");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-trainer"] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Convite aceito! Você agora está vinculado ao seu treinador.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    acceptInvite: acceptInvite.mutate,
    isAccepting: acceptInvite.isPending,
    error: acceptInvite.error,
  };
}

/**
 * Hook for validating invite token (public)
 */
export function useValidateInvite(token: string | null) {
  return useQuery({
    queryKey: ["validate-invite", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await (supabase as any)
        .from("student_invites")
        .select(`
          id,
          email,
          status,
          expires_at,
          message,
          invited_by,
          trainer:profiles!invited_by(full_name, email)
        `)
        .eq("token", token)
        .single();

      if (error) return null;

      // Check if expired
      if (data.status !== "pending" || new Date(data.expires_at) < new Date()) {
        return { ...data, valid: false, reason: "expired" };
      }

      return { ...data, valid: true };
    },
    enabled: !!token,
    staleTime: 0, // Always refetch
  });
}
