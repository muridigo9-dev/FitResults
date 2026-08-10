import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InAppNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    action_url: string | null;
    read_at: string | null;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch all notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from("in_app_notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as InAppNotification[];
        },
        enabled: !!user,
    });

    // Mark a single notification as read
    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("in_app_notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        },
    });

    // Mark all as read
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const { error } = await supabase.rpc("mark_all_notifications_read");
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
            toast.success("Todas as notificações marcadas como lidas");
        },
    });

    // Delete notification
    const deleteNotification = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("in_app_notifications")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        },
    });

    const unreadNotifications = notifications.filter((n) => !n.read_at);
    const readNotifications = notifications.filter((n) => n.read_at);

    return {
        notifications,
        unreadNotifications,
        readNotifications,
        unreadCount: unreadNotifications.length,
        isLoading,
        markAsRead: markAsRead.mutate,
        markAllAsRead: markAllAsRead.mutate,
        deleteNotification: deleteNotification.mutate,
    };
}
