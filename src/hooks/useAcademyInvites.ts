import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// =====================================================
// TYPES
// =====================================================

export type InviteType = 
  | "academy_trainer" 
  | "academy_nutritionist" 
  | "academy_student" 
  | "academy_content_creator"
  | "trainer_student";

export type InviteStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled";

export interface Invite {
  id: string;
  token: string;
  invited_email: string;
  invited_by: string;
  invite_type: InviteType;
  target_role: string;
  academy_id?: string;
  trainer_id?: string;
  message?: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at: string;
  // Relations
  inviter?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  academy?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

export interface CreateInvitePayload {
  invited_email: string;
  invite_type: InviteType;
  target_role: string;
  academy_id?: string;
  message?: string;
}

export interface AcceptInvitePayload {
  token: string;
  user_data?: {
    full_name: string;
    password: string;
  };
}

// =====================================================
// FETCH INVITES
// =====================================================

export function useAcademyInvites(academyId?: string) {
  return useQuery({
    queryKey: ["academy-invites", academyId],
    queryFn: async () => {
      if (!academyId) return [];

      const { data, error } = await (supabase
        .from("invites" as any)
        .select(`
          *,
          inviter:invited_by (
            id,
            full_name,
            email,
            avatar_url
          ),
          academy:academy_id (
            id,
            name,
            logo_url
          )
        `)
        .eq("academy_id", academyId)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as Invite[];
    },
    enabled: !!academyId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMyInvites() {
  return useQuery({
    queryKey: ["my-invites"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from("invites" as any)
        .select(`
          *,
          academy:academy_id (
            id,
            name,
            logo_url
          )
        `)
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50) as any);

      if (error) throw error;
      return (data || []) as Invite[];
    },
    staleTime: 30 * 1000,
  });
}

// =====================================================
// CREATE INVITE
// =====================================================

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvitePayload) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invite`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao criar convite");
      }

      return result;
    },
    onSuccess: (data, variables) => {
      toast.success("Convite criado com sucesso!", {
        description: `Um email foi enviado para ${variables.invited_email}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["academy-invites", variables.academy_id] });
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      queryClient.invalidateQueries({ queryKey: ["academy-stats", variables.academy_id] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar convite", {
        description: error.message,
      });
    },
  });
}

// =====================================================
// VALIDATE INVITE
// =====================================================

export function useValidateInvite(token?: string | null) {
  return useQuery({
    queryKey: ["validate-invite", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await (supabase.rpc("get_invite_details" as any, {
        _token: token,
      }) as any);

      if (error) throw error;
      if (!data || (data as any[]).length === 0) return null;

      const invite = (data as any[])[0];

      // Check if valid
      const isValid = await (supabase.rpc("is_invite_valid" as any, {
        _token: token,
      }) as any);

      return {
        ...invite,
        valid: isValid.data || false,
      };
    },
    enabled: !!token,
    retry: false,
  });
}

// =====================================================
// ACCEPT INVITE
// =====================================================

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: AcceptInvitePayload) => {
      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao aceitar convite");
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.code === "INVITE_ACCEPTED") {
        toast.success("Convite aceito com sucesso!", {
          description: "Bem-vindo à equipe!",
        });

        // Invalidate all academy-related queries
        queryClient.invalidateQueries({ queryKey: ["user-academies"] });
        queryClient.invalidateQueries({ queryKey: ["academy-members"] });
        queryClient.invalidateQueries({ queryKey: ["academy-stats"] });
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao aceitar convite", {
        description: error.message,
      });
    },
  });

  return {
    acceptInvite: mutation.mutateAsync,
    isAccepting: mutation.isPending,
  };
}

// =====================================================
// CANCEL INVITE
// =====================================================

export function useCancelInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await (supabase
        .from("invites" as any)
        .update({ status: "cancelled" })
        .eq("id", inviteId) as any);

      if (error) throw error;
    },
    onSuccess: (_, inviteId) => {
      toast.success("Convite cancelado");
      queryClient.invalidateQueries({ queryKey: ["academy-invites"] });
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao cancelar convite", {
        description: error.message,
      });
    },
  });
}

// =====================================================
// RESEND INVITE
// =====================================================

export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      // Fetch invite details
      const { data: invite, error: fetchError } = await (supabase
        .from("invites" as any)
        .select("*")
        .eq("id", inviteId)
        .single() as any);

      if (fetchError) throw fetchError;
      if (!invite) throw new Error("Convite não encontrado");

      // Call send-email Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const appUrl = window.location.origin;
      const acceptUrl = `${appUrl}/accept-invite?token=${(invite as any).token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: (invite as any).invited_email,
            template_type: "invite",
            variables: {
              accept_url: acceptUrl,
              expires_at: new Date((invite as any).expires_at).toLocaleDateString("pt-BR"),
              // Add more variables as needed
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao reenviar email");
      }

      return { inviteId };
    },
    onSuccess: () => {
      toast.success("Convite reenviado!");
      queryClient.invalidateQueries({ queryKey: ["academy-invites"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao reenviar convite", {
        description: error.message,
      });
    },
  });
}
