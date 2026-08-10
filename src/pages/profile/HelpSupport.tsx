import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Plus,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Inbox,
  Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import {
  useUserSupportTickets,
  useUserSupportMessages,
  SupportTicket
} from "@/hooks/useSupport";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSupportEnabled } from "@/hooks/useSupportEnabled";
import { Mail } from "lucide-react";

// ==========================================
// STATUS CONFIG
// ==========================================

const STATUS_CONFIG = {
  open: {
    label: "Aguardando",
    variant: "outline" as const,
    icon: Clock,
    description: "Sua mensagem será respondida em breve",
  },
  pending: {
    label: "Pendente",
    variant: "outline" as const,
    icon: Clock,
    description: "Aguardando análise",
  },
  replied: {
    label: "Respondido",
    variant: "default" as const,
    icon: CheckCircle,
    description: "Você tem uma nova resposta!",
  },
  closed: {
    label: "Encerrado",
    variant: "secondary" as const,
    icon: CheckCircle,
    description: "Esta conversa foi encerrada",
  },
};

// ==========================================
// NEW TICKET DIALOG
// ==========================================

function NewTicketDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ticket: SupportTicket) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { createTicket, isCreating } = useUserSupportTickets();

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;

    const ticket = await createTicket({ subject, message });
    if (ticket) {
      setSubject("");
      setMessage("");
      onOpenChange(false);
      onSuccess(ticket);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Qual é o assunto?"
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua dúvida ou problema..."
              className="min-h-[120px]"
              disabled={isCreating}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!subject.trim() || !message.trim() || isCreating}
          >
            {isCreating ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// TICKET LIST ITEM
// ==========================================

function TicketListItem({
  ticket,
  onClick,
}: {
  ticket: SupportTicket;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = status.icon;

  const timeAgo = formatDistanceToNow(new Date(ticket.updated_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const hasNewReply = ticket.status === "replied";

  return (
    <button
      className={cn(
        "w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-b border-border last:border-0",
        hasNewReply && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm truncate">{ticket.subject}</p>
          <Badge variant={status.variant} className="flex-shrink-0">
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
        {hasNewReply && (
          <p className="text-xs text-primary mt-1 font-medium">
            Nova resposta do suporte!
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

// ==========================================
// CONVERSATION VIEW
// ==========================================

function ConversationView({
  ticket,
  onBack,
}: {
  ticket: SupportTicket;
  onBack: () => void;
}) {
  const {
    messages,
    isLoading,
    sendReply,
    isSending,
    submitSurvey,
    isSubmittingSurvey
  } = useUserSupportMessages(ticket.id);

  const [replyMessage, setReplyMessage] = useState("");
  const [surveyScore, setSurveyScore] = useState<number | null>(ticket.satisfaction_score);
  const [surveyComment, setSurveyComment] = useState(ticket.satisfaction_comment || "");
  const [showSurveyCompletion, setShowSurveyCompletion] = useState(false);

  // Sync survey state with ticket data updates
  useEffect(() => {
    if (ticket.satisfaction_score !== null) {
      setSurveyScore(ticket.satisfaction_score);
      setShowSurveyCompletion(true);
    }
    if (ticket.satisfaction_comment) {
      setSurveyComment(ticket.satisfaction_comment);
    }
  }, [ticket.satisfaction_score, ticket.satisfaction_comment]);

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    sendReply(
      { message: replyMessage },
      {
        onSuccess: () => setReplyMessage(""),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardHeader className="border-b py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 -ml-2 gap-1"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
          </div>
          <Badge variant={status.variant}>
            <status.icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-3/4" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.sender_type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] p-3 rounded-2xl",
                      msg.sender_type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1.5",
                        msg.sender_type === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {msg.sender_type === "admin" && "Suporte · "}
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}

              {ticket.status === "closed" && (
                <div className="pt-4 space-y-4">
                  <div className="bg-muted/50 p-4 rounded-2xl border border-dashed text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Este ticket foi encerrado</p>
                    {ticket.resolution_notes && (
                      <div className="mt-3 text-xs text-muted-foreground bg-background p-3 rounded-xl border italic">
                        "{ticket.resolution_notes}"
                      </div>
                    )}
                  </div>

                  {ticket.satisfaction_score === null && !showSurveyCompletion && (
                    <Card className="border-primary/20 bg-primary/5 rounded-2xl overflow-hidden mt-6">
                      <CardHeader className="pb-3 pt-4">
                        <CardTitle className="text-sm text-center font-bold">Como foi o seu atendimento?</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pb-4">
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <Button
                              key={score}
                              variant={surveyScore === score ? "default" : "outline"}
                              size="icon"
                              className={cn(
                                "h-11 w-11 rounded-full text-lg font-bold transition-all",
                                surveyScore === score ? "scale-110 shadow-lg" : "hover:bg-primary/10"
                              )}
                              onClick={() => setSurveyScore(score)}
                            >
                              {score}
                            </Button>
                          ))}
                        </div>
                        {surveyScore !== null && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Textarea
                              placeholder="Algum comentário adicional? (opcional)"
                              value={surveyComment}
                              onChange={(e) => setSurveyComment(e.target.value)}
                              className="text-xs min-h-[60px] rounded-xl bg-background"
                            />
                            <Button
                              className="w-full text-xs rounded-full font-bold h-10"
                              size="sm"
                              disabled={isSubmittingSurvey}
                              onClick={() => {
                                submitSurvey({
                                  score: surveyScore,
                                  comment: surveyComment,
                                });
                              }}
                            >
                              {isSubmittingSurvey ? "Enviando..." : "Enviar Avaliação"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {(ticket.satisfaction_score !== null || showSurveyCompletion) && (
                    <div className="text-center p-6 bg-green-500/10 rounded-3xl border border-green-500/20 mt-6 animate-in zoom-in-95 duration-300">
                      <div className="bg-green-500 text-white h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <ThumbsUp className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-green-700 mb-1">Feedback Recebido!</h4>
                      <div className="flex justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "h-4 w-4",
                              s <= (ticket.satisfaction_score || surveyScore || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mb-6">
                        Obrigado por nos ajudar a melhorar o suporte. Esta conversa agora está no seu histórico.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-full font-medium"
                        onClick={onBack}
                      >
                        Voltar para minhas mensagens
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Reply Input */}
      {
        ticket.status !== "closed" && (
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua mensagem... (Enter para enviar)"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[50px] resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || isSending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      }
    </Card >
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function HelpSupport() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // Check if support system is enabled
  const { isSupportEnabled, supportEmail, isLoading: isSupportLoading } = useSupportEnabled();

  const { tickets, isLoading, unreadCount } = useUserSupportTickets();

  // Handle deep-linking to a specific ticket via URL search params
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      const ticketIdFromUrl = searchParams.get("ticketId");
      if (ticketIdFromUrl) {
        const ticket = tickets.find((t) => t.id === ticketIdFromUrl);
        if (ticket) {
          setSelectedTicket(ticket);
        }
      }
    }
  }, [tickets, searchParams, selectedTicket]);

  const handleBack = () => {
    setSelectedTicket(null);
    // Remove ticketId from URL when going back to list
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("ticketId");
    setSearchParams(newParams);
  };

  // If support is disabled, show simple contact card
  if (!isSupportEnabled) {
    return (
      <AppLayout
        header={{
          title: t("profile.helpSupport"),
          showBack: true,
        }}
      >
        <div className="py-4 space-y-6 max-w-md mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Need Help?</CardTitle>
              <CardDescription className="text-base">
                Contact our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Send us an email and we'll get back to you as soon as possible.
                </p>
                <Button
                  className="w-full"
                  size="lg"
                  asChild
                >
                  <a href={`mailto:${supportEmail}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {supportEmail}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Full support system (existing functionality)
  return (
    <AppLayout
      header={{
        title: t("profile.helpSupport"),
        showBack: !selectedTicket,
      }}
    >
      <div className="py-4 space-y-6">
        {selectedTicket ? (
          <ConversationView
            ticket={selectedTicket}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* New Ticket Button */}
            <Button className="w-full" onClick={() => setIsNewTicketOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>

            <NewTicketDialog
              open={isNewTicketOpen}
              onOpenChange={setIsNewTicketOpen}
              onSuccess={(ticket) => setSelectedTicket(ticket)}
            />

            {/* Tickets List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Minhas Mensagens
                  </CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="default">
                      {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <CardDescription>Histórico de conversas com o suporte</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhuma mensagem ainda</p>
                    <p className="text-sm mt-1">
                      Clique em "Nova Mensagem" para entrar em contato
                    </p>
                  </div>
                ) : (
                  <div>
                    {tickets.map((ticket) => (
                      <TicketListItem
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
