import { useState, useEffect, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Inbox,
  Check,
  BarChart3,
  LayoutDashboard,
  Zap,
  Tag,
  MessageSquare,
  Send,
  User,
  Clock,
  XCircle,
  Filter,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  ArrowLeft,
  Calendar,
  History,
  TrendingUp,
  AlertTriangle,
  ThumbsDown
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { CloseSupportTicketDialog } from "@/components/admin/support/CloseSupportTicketDialog";
import { SupportKPIs } from "@/components/admin/support/SupportKPIs";
import { SupportCharts } from "@/components/admin/support/SupportCharts";
import { TicketMetadataEditor } from "@/components/admin/support/TicketMetadataEditor";
import {
  useAdminSupportTickets,
  useAdminSupportMessages,
  useSupportAnalytics,
  SupportTicketSummary,
  TicketStatusFilter,
  SupportTicket
} from "@/hooks/useSupport";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ==========================================
// STATUS CONFIG
// ==========================================

const STATUS_CONFIG = {
  open: {
    label: "Aberto",
    variant: "destructive" as const,
    icon: AlertCircle,
    color: "text-destructive",
  },
  pending: {
    label: "Pendente",
    variant: "outline" as const,
    icon: Clock,
    color: "text-warning",
  },
  replied: {
    label: "Respondido",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-primary",
  },
  closed: {
    label: "Encerrado",
    variant: "secondary" as const,
    icon: XCircle,
    color: "text-muted-foreground",
  },
};

// ==========================================
// TICKET ROW COMPONENT
// ==========================================

function TicketRow({
  ticket,
  isSelected,
  onClick,
}: {
  ticket: SupportTicketSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = status.icon;

  const timeAgo = ticket.last_message_at
    ? formatDistanceToNow(new Date(ticket.last_message_at), { addSuffix: true, locale: ptBR })
    : formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR });

  const hasUnreadUserMessage = ticket.last_message_sender === "user" && ticket.status === "open";

  return (
    <button
      className={cn(
        "w-full p-4 text-left transition-colors border-b border-border last:border-0",
        isSelected ? "bg-muted" : "hover:bg-muted/50",
        hasUnreadUserMessage && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={ticket.user_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {ticket.user_name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-medium text-sm truncate">{ticket.subject}</p>
            <Badge variant={status.variant} className="flex-shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="truncate">{ticket.user_name || ticket.user_email || "Usuário"}</span>
          </div>

          {ticket.last_message && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {ticket.last_message_sender === "admin" && "Você: "}
              {ticket.last_message}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {ticket.message_count}
            </span>
            {ticket.priority && ticket.priority !== 'medium' && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] py-0 px-1.5 h-4",
                  ticket.priority === 'urgent' && "border-destructive text-destructive bg-destructive/5",
                  ticket.priority === 'high' && "border-orange-500 text-orange-500 bg-orange-500/5",
                  ticket.priority === 'low' && "border-blue-500 text-blue-500 bg-blue-500/5"
                )}
              >
                {ticket.priority === 'urgent' && <Zap className="h-2 w-2 mr-1 fill-current" />}
                {ticket.priority === 'urgent' ? 'Urgente' :
                  ticket.priority === 'high' ? 'Alta' : 'Baixa'}
              </Badge>
            )}
          </div>
        </div>

        {hasUnreadUserMessage && (
          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
}

// ==========================================
// CONVERSATION VIEW COMPONENT
// ==========================================

function ConversationView({
  ticket,
  onBack,
}: {
  ticket: SupportTicketSummary;
  onBack: () => void;
}) {
  const { messages, isLoading, sendReply, isSending } = useAdminSupportMessages(ticket.id);
  const { closeTicket } = useAdminSupportTickets();
  const [replyMessage, setReplyMessage] = useState("");
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    sendReply(
      {
        message: replyMessage,
        userId: ticket.user_id,
        subject: ticket.subject
      },
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
    <Card className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="border-b py-4 flex-shrink-0">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Avatar className="h-10 w-10">
            <AvatarImage src={ticket.user_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {ticket.user_name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{ticket.subject}</CardTitle>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{ticket.user_name || ticket.user_email || "Usuário"}</span>
              <span>·</span>
              <span>
                {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </CardDescription>
          </div>

          {ticket.status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCloseDialogOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Encerrar
            </Button>
          )}

          <CloseSupportTicketDialog
            open={isCloseDialogOpen}
            onOpenChange={setIsCloseDialogOpen}
            onConfirm={(data) => {
              closeTicket({
                ticketId: ticket.id,
                notes: data.notes,
                resolved: data.resolved,
              });
              setIsCloseDialogOpen(false);
            }}
          />
        </div>
      </CardHeader>

      {/* Metadata Editor */}
      <TicketMetadataEditor ticket={ticket as unknown as SupportTicket} />

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
                    msg.sender_type === "admin" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] p-3 rounded-2xl",
                      msg.sender_type === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className="flex items-center justify-between gap-4 mt-1.5">
                      <p
                        className={cn(
                          "text-[10px]",
                          msg.sender_type === "admin"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </p>
                      {msg.sender_type === "admin" && (
                        <Check className="h-3 w-3 text-primary-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Reply Input */}
      {ticket.status !== "closed" && (
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua resposta... (Enter para enviar)"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
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
      )}
    </Card>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");

  const { start, end } = useMemo(() => {
    const end = new Date();
    let start = subDays(end, 30);

    if (period === "today") start = startOfDay(end);
    else if (period === "7d") start = subDays(end, 7);
    else if (period === "30d") start = subDays(end, 30);
    else if (period === "90d") start = subDays(end, 90);

    return { start, end };
  }, [period]);

  const { tickets, isLoading, openCount } = useAdminSupportTickets(statusFilter);
  const { data: analytics, isLoading: isAvgLoading } = useSupportAnalytics(start, end);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  return (
    <AdminLayout title="Suporte">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <SupportKPIs data={analytics?.kpis} isLoading={isAvgLoading} />

          <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm self-start md:self-auto">
            <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-8 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="operational" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-2 w-[300px]">
              <TabsTrigger value="operational" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversas
              </TabsTrigger>
              <TabsTrigger value="strategic" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Estatísticas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="operational" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-21rem)]">
              {/* Tickets List */}
              <Card className={cn("lg:col-span-1 flex flex-col", selectedTicket && "hidden lg:flex")}>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5" />
                      Tickets
                    </CardTitle>
                    {openCount > 0 && (
                      <Badge variant="destructive" className="px-2 py-0.5">
                        {openCount} aberto{openCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as TicketStatusFilter)}
                  >
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="open">Abertos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="replied">Respondidos</SelectItem>
                      <SelectItem value="closed">Encerrados</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    {isLoading ? (
                      <div className="p-4 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Nenhum ticket encontrado</p>
                        <p className="text-sm mt-1">
                          {statusFilter === "all"
                            ? "Quando usuários enviarem mensagens, elas aparecerão aqui"
                            : "Tente outro filtro"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {tickets.map((ticket) => (
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            isSelected={selectedTicketId === ticket.id}
                            onClick={() => setSelectedTicketId(ticket.id)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Conversation Panel */}
              <div className={cn("lg:col-span-2 h-full", !selectedTicketId && "hidden lg:block")}>
                {selectedTicket ? (
                  <ConversationView
                    ticket={selectedTicket}
                    onBack={() => setSelectedTicketId(null)}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Selecione um ticket</p>
                      <p className="text-sm mt-1">
                        Clique em um ticket à esquerda para ver a conversa
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategic" className="mt-0">
            <ScrollArea className="h-[calc(100vh-21rem)] pr-4">
              <SupportCharts data={analytics} isLoading={isAvgLoading} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
