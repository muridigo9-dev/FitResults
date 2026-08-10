import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTrainerConversations,
  useTrainerChatEnabled,
  TrainerConversation,
} from "@/hooks/useTrainerChat";
import {
  MessageCircle,
  Search,
  Filter,
  Clock,
  MessageSquare,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrainerConversationsListProps {
  onSelectConversation?: (conversation: TrainerConversation) => void;
  selectedConversationId?: string;
}

type FilterType = "all" | "unread" | "today" | "week";

function formatLastMessageTime(dateString: string | null): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  
  if (isYesterday(date)) {
    return "Ontem";
  }
  
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

function ConversationRow({
  conversation,
  onClick,
  isSelected,
}: {
  conversation: TrainerConversation;
  onClick: () => void;
  isSelected: boolean;
}) {
  const hasUnread = (conversation.unread_count || 0) > 0;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
        isSelected
          ? "bg-primary/10 border-primary/30"
          : "bg-card hover:bg-muted/50 border-border",
        hasUnread && !isSelected && "border-primary/20"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12 border border-border">
          <AvatarImage src={conversation.student_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {conversation.student_name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("font-medium truncate", hasUnread && "font-semibold")}>
            {conversation.student_name || "Aluno"}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatLastMessageTime(conversation.last_message_at)}
          </span>
        </div>
        <p
          className={cn(
            "text-sm truncate mt-0.5",
            hasUnread ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {conversation.last_message_preview || "Nenhuma mensagem ainda"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {conversation.student_email}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

export function TrainerConversationsList({
  onSelectConversation,
  selectedConversationId,
}: TrainerConversationsListProps) {
  const { isChatEnabled, isLoading: isFeatureLoading } = useTrainerChatEnabled();
  const { conversations, isLoading, totalUnread } = useTrainerConversations();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.student_name?.toLowerCase().includes(query) ||
          c.student_email?.toLowerCase().includes(query) ||
          c.last_message_preview?.toLowerCase().includes(query)
      );
    }

    // Filter type
    switch (filter) {
      case "unread":
        result = result.filter((c) => (c.unread_count || 0) > 0);
        break;
      case "today":
        result = result.filter((c) => c.last_message_at && isToday(new Date(c.last_message_at)));
        break;
      case "week": {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter(
          (c) => c.last_message_at && new Date(c.last_message_at) >= weekAgo
        );
        break;
      }
    }

    // Sort by last message date (most recent first)
    result.sort((a, b) => {
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [conversations, searchQuery, filter]);

  // Loading state
  if (isFeatureLoading || isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Conversas
            {totalUnread > 0 && (
              <Badge variant="default" className="ml-2">
                {totalUnread} não lidas
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {conversations.length} alunos
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="py-12 text-center">
            {conversations.length === 0 ? (
              <>
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">Nenhuma conversa</p>
                <p className="text-muted-foreground text-sm">
                  Quando você tiver alunos vinculados, as conversas aparecerão aqui.
                </p>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">Nenhum resultado</p>
                <p className="text-muted-foreground text-sm">
                  Tente outro filtro ou termo de busca.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {filteredConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.conversation_id || conversation.student_id}
                  conversation={conversation}
                  onClick={() => onSelectConversation?.(conversation)}
                  isSelected={
                    selectedConversationId === conversation.conversation_id ||
                    selectedConversationId === conversation.student_id
                  }
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Stats Footer */}
        {filteredConversations.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>
              {filteredConversations.length} conversa{filteredConversations.length !== 1 ? "s" : ""}
              {filter !== "all" && " (filtrado)"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Última atualização: agora
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrainerConversationsList;
