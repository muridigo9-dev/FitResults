import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bell,
    MessageSquare,
    Check,
    CheckCheck,
    Trash2,
    Clock,
    ChevronRight,
    Inbox
} from "lucide-react";
import { useNotifications, InAppNotification } from "@/hooks/useNotifications";
import { useNotificationsEnabled } from "@/hooks/useSupportEnabled";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NotificationDrawer() {
    const navigate = useNavigate();
    const { isNotificationsEnabled, isLoading: isFlagLoading } = useNotificationsEnabled();

    // Don't render anything if notifications are disabled
    if (!isNotificationsEnabled) {
        return null;
    }

    const {
        unreadNotifications,
        readNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        isLoading
    } = useNotifications();
    const [open, setOpen] = useState(false);

    const handleNotificationClick = (notification: InAppNotification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }

        if (notification.action_url) {
            setOpen(false);
            navigate(notification.action_url);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "success":
                return <Check className="h-4 w-4 text-green-500" />;
            case "support":
            case "support_response":
                return <MessageSquare className="h-4 w-4 text-primary" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const NotificationItem = ({ notification }: { notification: InAppNotification }) => (
        <div
            className={cn(
                "group relative flex gap-3 p-4 border-b border-border/40 hover:bg-muted/50 transition-colors cursor-pointer",
                !notification.read_at && "bg-primary/5 border-l-2 border-l-primary"
            )}
            onClick={() => handleNotificationClick(notification)}
        >
            <div className="mt-1 flex-shrink-0">
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    !notification.read_at ? "bg-primary/10" : "bg-muted"
                )}>
                    {getIcon(notification.type)}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={cn(
                        "text-sm font-semibold truncate",
                        !notification.read_at ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {notification.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>
            </div>

            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full hover:bg-muted"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-[10px] animate-in zoom-in duration-300"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 border-l border-border/50">
                <SheetHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        Notificações
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="font-normal">
                                {unreadCount} novas
                            </Badge>
                        )}
                    </SheetTitle>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => markAllAsRead()}
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Ler todas
                        </Button>
                    )}
                </SheetHeader>

                <Tabs defaultValue="unread" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/30 border-b border-border/40 rounded-none h-12">
                        <TabsTrigger
                            value="unread"
                            className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            Não lidas
                        </TabsTrigger>
                        <TabsTrigger
                            value="read"
                            className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            Anteriores
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="unread" className="flex-1 mt-0 min-h-0">
                        <ScrollArea className="h-full">
                            {unreadNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                    <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                        <Inbox className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">Tudo em dia!</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Você não tem notificações não lidas no momento.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/20">
                                    {unreadNotifications.map((n) => (
                                        <NotificationItem key={n.id} notification={n} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="read" className="flex-1 mt-0 min-h-0">
                        <ScrollArea className="h-full">
                            {readNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                    <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                        <Clock className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma notificação anterior.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/20">
                                    {readNotifications.map((n) => (
                                        <NotificationItem key={n.id} notification={n} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="p-4 bg-muted/10 border-t border-border/40">
                    <Button
                        variant="outline"
                        className="w-full text-xs h-9 font-medium"
                        onClick={() => {
                            setOpen(false);
                            navigate("/profile/notifications");
                        }}
                    >
                        Configurações de notificação
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
