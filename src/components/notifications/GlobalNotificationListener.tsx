import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificationsEnabled } from "@/hooks/useSupportEnabled";

export function GlobalNotificationListener() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isNotificationsEnabled } = useNotificationsEnabled();

    useEffect(() => {
        if (!user || !isNotificationsEnabled) return;

        // Listen for new in-app notifications
        const channel = supabase
            .channel(`global-notifications-${user.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "insert",
                    schema: "public",
                    table: "in_app_notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    const { title, message, action_url } = payload.new;

                    toast(title, {
                        description: message,
                        icon: <Bell className="h-4 w-4 text-primary" />,
                        action: action_url ? {
                            label: "Ver",
                            onClick: () => navigate(action_url)
                        } : undefined,
                        duration: 5000,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, navigate, isNotificationsEnabled]);

    return null; // This component doesn't render anything
}
