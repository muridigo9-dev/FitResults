import { useState, useEffect, useRef } from "react";
import { useAdminSupportMessages, useUserSupportMessages, SupportMessage } from "@/hooks/useSupport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SupportChatContentProps {
    ticketId: string;
    userId: string;
    subject: string;
    isAdmin?: boolean;
}

export function SupportChatContent({
    ticketId,
    userId,
    subject,
    isAdmin = false,
}: SupportChatContentProps) {
    const adminHook = useAdminSupportMessages(isAdmin ? ticketId : null);
    const userHook = useUserSupportMessages(!isAdmin ? ticketId : null);

    const { messages, isLoading, sendReply, isSending } = isAdmin ? adminHook : userHook;
    const [replyMessage, setReplyMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendReply = () => {
        if (!replyMessage.trim()) return;

        if (isAdmin) {
            (sendReply as any)({
                message: replyMessage,
                userId: userId,
                subject: subject
            }, {
                onSuccess: () => setReplyMessage(""),
            });
        } else {
            (sendReply as any)({
                message: replyMessage
            }, {
                onSuccess: () => setReplyMessage(""),
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Messages */}
            <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full p-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className={cn("h-16 w-3/4", i % 2 === 0 && "ml-auto")} />
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma mensagem ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg: SupportMessage) => {
                                const isFromMe = isAdmin ? msg.sender_type === "admin" : msg.sender_type === "user";
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            isFromMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[85%] p-3 rounded-2xl shadow-sm",
                                                isFromMe
                                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                                    : "bg-muted rounded-bl-md"
                                            )}
                                        >
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                            <div className="flex items-center justify-between gap-4 mt-1.5">
                                                <p
                                                    className={cn(
                                                        "text-[10px]",
                                                        isFromMe
                                                            ? "text-primary-foreground/70"
                                                            : "text-muted-foreground"
                                                    )}
                                                >
                                                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                                </p>
                                                {isFromMe && (
                                                    <Check className="h-3 w-3 text-primary-foreground/50" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t flex-shrink-0 bg-background">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Digite sua resposta..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[80px] max-h-[150px] resize-none"
                        disabled={isSending}
                    />
                    <Button
                        onClick={handleSendReply}
                        disabled={!replyMessage.trim() || isSending}
                        className="self-end h-10 w-10 shrink-0 p-0"
                    >
                        {isSending ? (
                            <Skeleton className="h-4 w-4 rounded-full" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
