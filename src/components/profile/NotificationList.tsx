import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, ChevronRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { enUS, es } from 'date-fns/locale';

interface NotificationListProps {
    notifications: any[];
    maxItems?: number;
}

export function NotificationList({ notifications, maxItems = 5 }: NotificationListProps) {
    const { t, language } = useI18n();
    const displayNotifs = notifications.slice(0, maxItems);

    const dateLocales: Record<string, any> = {
        'pt-BR': ptBR,
        'en-US': enUS,
        'es-ES': es
    };

    const dateLocale = dateLocales[language] || ptBR;

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("profile.noNotifications")}</p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-3">
            {displayNotifs.map((notif) => (
                <Card key={notif.id} className={cn(
                    "border-none shadow-none bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer group",
                    !notif.read_at && "bg-primary/5 border-l-4 border-l-primary"
                )}>
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <div className={cn(
                                "h-10 w-10 shrink-0 rounded-full flex items-center justify-center",
                                !notif.read_at ? "bg-primary/10" : "bg-background shadow-sm"
                            )}>
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h4 className={cn(
                                        "text-sm font-semibold truncate text-foreground",
                                        !notif.read_at && "text-primary"
                                    )}>
                                        {notif.title}
                                    </h4>
                                    <span className="text-[10px] whitespace-nowrap text-muted-foreground font-medium uppercase tracking-tighter">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: dateLocale })}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {notif.message}
                                </p>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all ml-1">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {notifications.length > maxItems && (
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t("profile.viewAllNotifications")} ({notifications.length})
                </Button>
            )}
        </div>
    );
}
