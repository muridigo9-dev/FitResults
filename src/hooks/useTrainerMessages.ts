import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface Message {
  id: string;
  trainer_id: string;
  student_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
}

export interface SendMessageParams {
  message: string;
  attachment?: MessageAttachment;
}

export function useTrainerMessages(studentId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["trainer-messages", studentId],
    queryFn: async () => {
      if (!user?.id || !studentId) return [];

      const { data: directData, error: directError } = await supabase
        .from("trainer_student_messages" as any)
        .select("*")
        .or(`and(trainer_id.eq.${user.id},student_id.eq.${studentId}),and(trainer_id.eq.${studentId},student_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (directError) {
        console.error("Error fetching messages:", directError);
        return [];
      }

      return (directData || []) as unknown as Message[];
    },
    enabled: !!user?.id && !!studentId,
    refetchInterval: 10000,
  });

  const uploadAttachment = async (file: File): Promise<MessageAttachment> => {
    if (!user?.id) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading attachment:", uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from("message-attachments")
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      type: file.type,
      name: file.name,
      size: file.size,
    };
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachment }: SendMessageParams) => {
      if (!user?.id || !studentId) throw new Error("Missing user or student ID");

      const messageData: any = {
        trainer_id: user.id,
        student_id: studentId,
        sender_id: user.id,
        message: message.trim(),
      };

      if (attachment) {
        messageData.attachment_url = attachment.url;
        messageData.attachment_type = attachment.type;
        messageData.attachment_name = attachment.name;
        messageData.attachment_size = attachment.size;
      }

      const { data, error } = await supabase
        .from("trainer_student_messages" as any)
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      return data as unknown as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-messages", studentId] });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Erro ao enviar mensagem");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !studentId) return;

      const { error } = await supabase
        .from("trainer_student_messages" as any)
        .update({ is_read: true })
        .eq("student_id", user.id)
        .eq("trainer_id", studentId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking messages as read:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-messages", studentId] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    uploadAttachment,
  };
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("trainer_student_messages" as any)
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("is_read", false)
        .or(`trainer_id.eq.${user.id},student_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}
