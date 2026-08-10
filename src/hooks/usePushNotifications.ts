import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "./usePWAInstall";

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isEnabled: boolean; // Feature flag from admin
  permission: NotificationPermission;
  isLoading: boolean;
  autoRequestOnPWA: boolean; // Auto-request after PWA install
}

// Get VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Local storage key for auto-request flag
const AUTO_REQUEST_KEY = "pwa_auto_request_push";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { isPWA } = usePWAInstall();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isEnabled: false,
    permission: "default",
    isLoading: true,
    autoRequestOnPWA: false,
  });

  // Check support, feature flag, and current subscription status
  useEffect(() => {
    async function checkStatus() {
      const isSupported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        !!VAPID_PUBLIC_KEY;

      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          isEnabled: false,
          permission: "default",
          isLoading: false,
          autoRequestOnPWA: false,
        });
        return;
      }

      const permission = Notification.permission;

      // Check feature flag from database
      let isEnabled = false;
      try {
        const { data } = await (supabase as any)
          .from("app_settings")
          .select("value")
          .eq("key", "push_notifications_enabled")
          .single();
        
        isEnabled = data?.value === "true";
      } catch (error) {
        console.error("Error checking push notification feature flag:", error);
        // Default to enabled if we can't check
        isEnabled = true;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        // Check if should auto-request on PWA
        const autoRequest = localStorage.getItem(AUTO_REQUEST_KEY) === "true";

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isEnabled,
          permission,
          isLoading: false,
          autoRequestOnPWA: autoRequest,
        });
      } catch (error) {
        console.error("Error checking push status:", error);
        setState({
          isSupported: true,
          isSubscribed: false,
          isEnabled,
          permission,
          isLoading: false,
          autoRequestOnPWA: false,
        });
      }
    }

    checkStatus();
  }, []);

  // Auto-request push permission when PWA is installed
  useEffect(() => {
    async function autoRequestOnPWAInstall() {
      if (
        !user ||
        !isPWA ||
        !state.isSupported ||
        !state.isEnabled ||
        state.isLoading ||
        state.isSubscribed ||
        state.permission !== "default"
      ) {
        return;
      }

      // Check if we already auto-requested
      const alreadyRequested = localStorage.getItem(AUTO_REQUEST_KEY) === "requested";
      if (alreadyRequested) {
        return;
      }

      console.log("[usePushNotifications] Auto-requesting push on PWA install");

      // Set flag to prevent multiple requests
      localStorage.setItem(AUTO_REQUEST_KEY, "requested");

      // Small delay to avoid overwhelming user right after PWA install
      setTimeout(async () => {
        try {
          const success = await subscribe();
          if (success) {
            console.log("[usePushNotifications] Auto-subscribed successfully");
          }
        } catch (error) {
          console.error("[usePushNotifications] Auto-subscribe failed:", error);
        }
      }, 3000); // 3 second delay
    }

    autoRequestOnPWAInstall();
  }, [user, isPWA, state.isSupported, state.isEnabled, state.isLoading, state.isSubscribed, state.permission]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.isEnabled || !user) return false;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Save subscription to database
      const { error } = await (supabase as any).from("push_subscriptions").upsert(
        {
          user_id: user.id,
          subscription: subscription.toJSON(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        await subscription.unsubscribe();
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isSupported: true,
        isSubscribed: true,
        isEnabled: true,
        permission: "granted",
        isLoading: false,
      }));

      console.log("[usePushNotifications] Successfully subscribed");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, state.isEnabled, user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user) return false;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      await (supabase as any)
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
