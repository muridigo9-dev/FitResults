import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "./useFeatureFlags";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface TrainerConversation {
  conversation_id: string;
  trainer_id: string;
  student_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  trainer_name?: string;
  trainer_avatar?: string;
  trainer_email?: string;
  student_name?: string;
  student_avatar?: string;
  student_email?: string;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "trainer" | "student";
  message: string;
  read_at: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

export interface SendMessageParams {
  message: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  attachmentSize?: number;
}

// ============================================================================
// Hook: useTrainerChatEnabled
// ============================================================================

export function useTrainerChatEnabled() {
  const { isEnabled, isLoading } = useFeatureFlags();
  
  return {
    isChatEnabled: isEnabled("trainer_chat_enabled"),
    isPushEnabled: isEnabled("trainer_chat_push_enabled"),
    isLoading,
  };
}

// ============================================================================
// Hook: useMyTrainerConversation (for students)
// ============================================================================

export function useMyTrainerConversation() {
  const { user } = useAuth();
  const { isChatEnabled } = useTrainerChatEnabled();

  const conversationQuery = useQuery({
    queryKey: ["my-trainer-conversation", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("my_trainer_conversation" as any)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching trainer conversation:", error);
        return null;
      }

      return data as unknown as TrainerConversation | null;
    },
    enabled: !!user?.id && isChatEnabled,
    refetchInterval: 30000,
  });

  return {
    conversation: conversationQuery.data,
    isLoading: conversationQuery.isLoading,
    hasConversation: !!conversationQuery.data,
  };
}

// ============================================================================
// Hook: useTrainerConversations (for trainers)
// ============================================================================

export function useTrainerConversations() {
  const { user } = useAuth();
  const { isChatEnabled } = useTrainerChatEnabled();

  const conversationsQuery = useQuery({
    queryKey: ["trainer-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trainer_conversations_list" as any)
        .select("*");

      if (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }

      return (data || []) as unknown as TrainerConversation[];
    },
    enabled: !!user?.id && isChatEnabled,
    refetchInterval: 30000,
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    totalUnread: (conversationsQuery.data || []).reduce(
      (sum, c) => sum + (c.unread_count || 0),
      0
    ),
  };
}

// ============================================================================
// Hook: useChatMessages
// ============================================================================

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isChatEnabled } = useTrainerChatEnabled();

  // Fetch messages
  const messagesQuery = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("trainer_messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }

      return (data || []) as unknown as ChatMessage[];
    },
    enabled: !!conversationId && isChatEnabled,
    refetchInterval: 5000,
  });

  // Send message mutation with push notification integration
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      attachmentUrl,
      attachmentType,
      attachmentName,
      attachmentSize,
    }: SendMessageParams) => {
      if (!conversationId) throw new Error("No conversation");

      const { data, error } = await supabase.rpc("send_trainer_message" as any, {
        _conversation_id: conversationId,
        _message: message.trim(),
        _attachment_url: attachmentUrl || null,
        _attachment_type: attachmentType || null,
        _attachment_name: attachmentName || null,
        _attachment_size: attachmentSize || null,
      });

      if (error) throw error;
      return { messageId: data, message: message.trim() };
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["my-trainer-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });

      // Trigger push notification after successful send
      // We need to determine recipient based on conversation details
      // This will be handled by the trigger in the database, but we can also
      // call it explicitly for more control
    },
    onError: (error) => {
      console.error("Send message error:", error);
      toast.error("Erro ao enviar mensagem");
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;

      const { error } = await supabase.rpc("mark_conversation_messages_read" as any, {
        _conversation_id: conversationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-trainer-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
    },
  });

  // Upload attachment helper
  const uploadAttachment = async (file: File) => {
    if (!user?.id) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

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

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    uploadAttachment,
    userId: user?.id,
  };
}

// ============================================================================
// Hook: useChatUnreadCount
// ============================================================================

export function useChatUnreadCount() {
  const { user } = useAuth();
  const { isChatEnabled } = useTrainerChatEnabled();

  return useQuery({
    queryKey: ["chat-unread-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data, error } = await supabase.rpc(
        "get_user_unread_messages_count" as any
      );

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }

      return (data as number) || 0;
    },
    enabled: !!user?.id && isChatEnabled,
    refetchInterval: 30000,
  });
}

// ============================================================================
// Hook: useStudentChat (for trainers viewing a specific student)
// ============================================================================

export function useStudentChat(studentId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isChatEnabled } = useTrainerChatEnabled();

  // Get or create conversation for this student
  const conversationQuery = useQuery({
    queryKey: ["student-conversation", user?.id, studentId],
    queryFn: async () => {
      if (!user?.id || !studentId) return null;

      // First try to get existing conversation
      const { data: existing, error: existingError } = await supabase
        .from("trainer_conversations" as any)
        .select("*")
        .eq("trainer_id", user.id)
        .eq("student_id", studentId)
        .maybeSingle();

      if (existingError && existingError.code !== "PGRST116") {
        console.error("Error fetching conversation:", existingError);
      }

      if (existing) {
        return existing as unknown as TrainerConversation;
      }

      // Create new conversation
      try {
        const { data: conversationId, error: createError } = await supabase.rpc(
          "get_or_create_conversation" as any,
          {
            _trainer_id: user.id,
            _student_id: studentId,
          }
        );

        if (createError) {
          console.error("Error creating conversation:", createError);
          return null;
        }

        // Fetch the created conversation
        const { data: newConv } = await supabase
          .from("trainer_conversations" as any)
          .select("*")
          .eq("id", conversationId)
          .single();

        return newConv as unknown as TrainerConversation;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return null;
      }
    },
    enabled: !!user?.id && !!studentId && isChatEnabled,
  });

  const conversationId = conversationQuery.data?.conversation_id || (conversationQuery.data as any)?.id;
  
  const messagesHook = useChatMessages(conversationId);

  return {
    conversation: conversationQuery.data,
    conversationId,
    isLoadingConversation: conversationQuery.isLoading,
    ...messagesHook,
  };
}

// ============================================================================
// Trigger push notification (to be called after sending message)
// ============================================================================

export async function triggerMessagePushNotification(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  senderRole: "trainer" | "student"
) {
  try {
    const title =
      senderRole === "trainer"
        ? "Nova mensagem do seu treinador"
        : `Nova mensagem de ${senderName}`;

    const response = await supabase.functions.invoke("send-push-notification", {
      body: {
        userId: recipientId,
        title,
        body: messagePreview.substring(0, 100),
        data: {
          type: "trainer_message",
          url: senderRole === "trainer" ? "/my-trainer?tab=messages" : "/trainer",
        },
      },
    });

    return response;
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}

// ============================================================================
// Hook: useSendMessageWithPush - Enhanced message sending with push notifications
// ============================================================================

export function useSendMessageWithPush(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPushEnabled } = useTrainerChatEnabled();

  return useMutation({
    mutationFn: async ({
      message,
      recipientId,
      recipientName,
      senderName,
      senderRole,
      attachmentUrl,
      attachmentType,
      attachmentName,
      attachmentSize,
    }: SendMessageParams & {
      recipientId: string;
      recipientName?: string;
      senderName?: string;
      senderRole: "trainer" | "student";
    }) => {
      if (!conversationId) throw new Error("No conversation");

      // Send the message
      const { data, error } = await supabase.rpc("send_trainer_message" as any, {
        _conversation_id: conversationId,
        _message: message.trim(),
        _attachment_url: attachmentUrl || null,
        _attachment_type: attachmentType || null,
        _attachment_name: attachmentName || null,
        _attachment_size: attachmentSize || null,
      });

      if (error) throw error;

      // Trigger push notification if enabled
      if (isPushEnabled && recipientId) {
        await triggerMessagePushNotification(
          recipientId,
          senderName || "Usuário",
          message.trim(),
          senderRole
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["my-trainer-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
    },
    onError: (error) => {
      console.error("Send message with push error:", error);
      toast.error("Erro ao enviar mensagem");
    },
  });
}
