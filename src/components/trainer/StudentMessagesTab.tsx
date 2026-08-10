import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states";
import {
  useStudentChat,
  useTrainerChatEnabled,
  ChatMessage,
} from "@/hooks/useTrainerChat";
import { 
  Send, 
  MessageCircle, 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Download,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface StudentMessagesTabProps {
  studentId: string;
  studentName?: string;
}

interface PendingAttachment {
  file: File;
  preview?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | null | undefined) {
  if (type?.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileText;
  return File;
}

function formatMessageDate(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

// ============================================================================
// Attachment Preview Component
// ============================================================================

function AttachmentPreview({ 
  message, 
  isMe 
}: { 
  message: ChatMessage; 
  isMe: boolean;
}) {
  if (!message.attachment_url) return null;

  const isImage = message.attachment_type?.startsWith("image/");
  const FileIcon = getFileIcon(message.attachment_type);

  if (isImage) {
    return (
      <a 
        href={message.attachment_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block mb-2"
      >
        <img 
          src={message.attachment_url} 
          alt={message.attachment_name || "Anexo"} 
          className="max-w-full max-h-48 rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={message.attachment_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors",
        isMe 
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
          : "bg-background/50 hover:bg-background/80"
      )}
    >
      <FileIcon className="h-8 w-8 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {message.attachment_name}
        </p>
        <p className={cn(
          "text-xs",
          isMe ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {formatFileSize(message.attachment_size || 0)}
        </p>
      </div>
      <Download className="h-4 w-4 flex-shrink-0" />
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
              : "bg-muted rounded-bl-sm"
          )}
        >
          <AttachmentPreview message={message} isMe={isOwn} />
          {message.message && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message}
            </p>
          )}
          <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
            <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {format(messageDate, "HH:mm")}
            </span>
            {message.read_at && isOwn && (
              <span className="text-[10px] text-primary-foreground/70">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StudentMessagesTab({ studentId, studentName }: StudentMessagesTabProps) {
  const { isChatEnabled, isLoading: isFeatureLoading } = useTrainerChatEnabled();
  const {
    conversation,
    conversationId,
    isLoadingConversation,
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
    isSending,
    markAsRead,
    uploadAttachment,
    userId,
  } = useStudentChat(studentId);

  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const hasUnread = messages.some(m => m.sender_id !== userId && !m.read_at);
      if (hasUnread) {
        markAsRead();
      }
    }
  }, [conversationId, messages, userId, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup preview URL on unmount
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
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    setPendingAttachment({ file, preview });
    
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
      }

      sendMessage({ 
        message: newMessage.trim() || (pendingAttachment ? `📎 ${pendingAttachment.file.name}` : ""),
        ...attachmentData,
      });
      
      setNewMessage("");
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (isFeatureLoading || isLoadingConversation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Feature disabled
  if (!isChatEnabled) {
    return (
      <EmptyState
        type="documents"
        title="Chat não disponível"
        description="O sistema de mensagens ainda não está ativo."
      />
    );
  }

  // No conversation available
  if (!conversationId) {
    return (
      <EmptyState
        type="documents"
        title="Conversa não disponível"
        description="Não foi possível criar uma conversa com este aluno. Verifique se ele está vinculado corretamente."
      />
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages Area */}
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-[380px] p-4" ref={scrollRef}>
          {isMessagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <Skeleton className="h-16 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-center">
                Nenhuma mensagem ainda.
                <br />
                Inicie uma conversa com {studentName || "o aluno"}!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDate = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));

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
      </Card>

      {/* Pending Attachment Preview */}
      {pendingAttachment && (
        <Card className="mt-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              {pendingAttachment.preview ? (
                <img 
                  src={pendingAttachment.preview} 
                  alt="Preview" 
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                  <File className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {pendingAttachment.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pendingAttachment.file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removePendingAttachment}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      <Card className="mt-3">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,video/mp4,audio/mpeg,audio/mp3"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isSending || isUploading}
            />
            <Button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !pendingAttachment) || isSending || isUploading}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pressione Enter para enviar • Anexos até 10MB
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentMessagesTab;
