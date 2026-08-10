import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import {
  useMyTrainerConversation,
  useChatMessages,
  useTrainerChatEnabled,
  ChatMessage,
} from "@/hooks/useTrainerChat";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string | null | undefined) {
  if (type?.startsWith("image/")) return ImageIcon;
  return FileText;
}

function isImageType(type: string | null | undefined): boolean {
  return type?.startsWith("image/") || false;
}

function formatMessageDate(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

// ============================================================================
// Attachment Preview Component
// ============================================================================

interface AttachmentPreviewProps {
  url: string;
  type: string | null | undefined;
  name: string | null | undefined;
  size: number | null | undefined;
  isOwn: boolean;
}

function AttachmentPreview({ url, type, name, size, isOwn }: AttachmentPreviewProps) {
  const FileIcon = getFileIcon(type);

  if (isImageType(type)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={name || "Attachment"}
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border",
        isOwn ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-muted border-border"
      )}
    >
      <FileIcon className="h-8 w-8 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name || "Arquivo"}</p>
        {size && <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>}
      </div>
      <Download className="h-4 w-4" />
    </a>
  );
}

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showDate: boolean;
}

function MessageBubble({ message, isOwn, showDate }: MessageBubbleProps) {
  const messageDate = new Date(message.created_at);

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-4">
          <Badge variant="secondary" className="text-xs">
            {formatMessageDate(messageDate)}
          </Badge>
        </div>
      )}
      <div className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {message.attachment_url && (
            <div className="mb-2">
              <AttachmentPreview
                url={message.attachment_url}
                type={message.attachment_type}
                name={message.attachment_name}
                size={message.attachment_size}
                isOwn={isOwn}
              />
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
            <span className={cn("text-xs", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {format(messageDate, "HH:mm")}
            </span>
            {message.read_at && isOwn && (
              <span className="text-xs text-primary-foreground/70">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Main Component: StudentChatTab
// ============================================================================

export function StudentChatTab() {
  const { isChatEnabled, isLoading: isFeatureLoading } = useTrainerChatEnabled();
  const { conversation, isLoading: isConversationLoading, hasConversation } = useMyTrainerConversation();
  const conversationId = conversation?.conversation_id;
  const {
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
    isSending,
    markAsRead,
    uploadAttachment,
    userId,
  } = useChatMessages(conversationId || null);

  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && conversation?.unread_count && conversation.unread_count > 0) {
      markAsRead();
    }
  }, [conversationId, conversation?.unread_count, markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup attachment preview
  useEffect(() => {
    return () => {
      if (pendingAttachment?.preview) {
        URL.revokeObjectURL(pendingAttachment.preview);
      }
    };
  }, [pendingAttachment]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    if (pendingAttachment?.preview) {
      URL.revokeObjectURL(pendingAttachment.preview);
    }

    setPendingAttachment({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = () => {
    if (pendingAttachment?.preview) {
      URL.revokeObjectURL(pendingAttachment.preview);
    }
    setPendingAttachment(null);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || isSending || isUploading) return;

    try {
      let attachmentData = {};

      if (pendingAttachment) {
        setIsUploading(true);
        const uploaded = await uploadAttachment(pendingAttachment.file);
        attachmentData = {
          attachmentUrl: uploaded.url,
          attachmentType: uploaded.type,
          attachmentName: uploaded.name,
          attachmentSize: uploaded.size,
        };
        removePendingAttachment();
        setIsUploading(false);
      }

      sendMessage({
        message: newMessage.trim() || (pendingAttachment ? "📎 Anexo" : ""),
        ...attachmentData,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (isFeatureLoading || isConversationLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Feature disabled
  if (!isChatEnabled) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            type="documents"
            title="Chat não disponível"
            description="O sistema de mensagens ainda não está ativo."
          />
        </CardContent>
      </Card>
    );
  }

  // No trainer/conversation
  if (!hasConversation) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            type="documents"
            title="Sem conversas"
            description="Você ainda não tem um treinador vinculado. Quando tiver, poderá trocar mensagens aqui."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={conversation?.trainer_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation?.trainer_name?.charAt(0) || "T"}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">
              {conversation?.trainer_name || "Seu Treinador"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {conversation?.trainer_email}
            </p>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {isMessagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <Skeleton className="h-16 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nenhuma mensagem ainda. Envie a primeira!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDate =
                !prevMsg ||
                !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === userId}
                  showDate={showDate}
                />
              );
            })
          )}
        </ScrollArea>
      </CardContent>

      {/* Pending Attachment */}
      {pendingAttachment && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex items-center gap-2">
            {pendingAttachment.preview ? (
              <img
                src={pendingAttachment.preview}
                alt="Preview"
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingAttachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(pendingAttachment.file.size)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={removePendingAttachment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,video/*,audio/*"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !pendingAttachment) || isSending || isUploading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
