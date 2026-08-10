/**
 * PWA Install Hook
 * 
 * Centralized logic for PWA installation with:
 * - Detection of PWA mode
 * - beforeinstallprompt handling
 * - User preference persistence
 * - Cross-browser compatibility
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallState {
  // Detection
  isPWA: boolean;
  canInstall: boolean;
  isInstallable: boolean;

  // User preferences
  userDismissedButton: boolean;
  isLoading: boolean;

  // Actions
  install: () => Promise<void>;
  dismissButton: () => Promise<void>;
  resetDismissal: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "pwa_install_dismissed";

/**
 * Detect if app is running as PWA
 */
function detectPWAMode(): boolean {
  // Check display-mode
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check if running as PWA on iOS
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Check if opened from home screen (Android)
  if (document.referrer.includes("android-app://")) {
    return true;
  }

  return false;
}

/**
 * Hook for PWA installation
 */
export function usePWAInstall(): PWAInstallState {
  const { user } = useAuth();
  const [isPWA, setIsPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [userDismissedButton, setUserDismissedButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detect PWA mode on mount
  useEffect(() => {
    const isPWAMode = detectPWAMode();
    setIsPWA(isPWAMode);
    console.log("[usePWAInstall] PWA mode detected:", isPWAMode);
  }, []);

  // Load user preference from database
  useEffect(() => {
    async function loadUserPreference() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to load from user_preferences table
        const { data, error } = await supabase
          .from("user_preferences")
          .select("pwa_install_dismissed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows returned (not an error)
          console.error("[usePWAInstall] Error loading preference:", error);
        }

        if (data?.pwa_install_dismissed) {
          setUserDismissedButton(true);
          console.log("[usePWAInstall] User dismissed button (from DB)");
        } else {
          // Fallback to localStorage for backward compatibility
          const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
          setUserDismissedButton(dismissed);
          if (dismissed) {
            console.log("[usePWAInstall] User dismissed button (from localStorage)");
          }
        }
      } catch (error) {
        console.error("[usePWAInstall] Error loading preference:", error);
        // Fallback to localStorage
        const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
        setUserDismissedButton(dismissed);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserPreference();
  }, [user]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      console.log("[usePWAInstall] beforeinstallprompt event captured");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log("[usePWAInstall] App installed successfully");
      setIsPWA(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Install function
  const install = useCallback(async () => {
    // If already installed, show message
    if (isPWA) {
      alert("O aplicativo já está instalado! Você está usando a versão PWA.");
      return;
    }

    // If prompt is available, use it
    if (deferredPrompt) {
      try {
        console.log("[usePWAInstall] Showing install prompt");
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        console.log("[usePWAInstall] User choice:", choiceResult.outcome);

        if (choiceResult.outcome === "accepted") {
          console.log("[usePWAInstall] User accepted installation");
          setIsPWA(true);
        } else {
          console.log("[usePWAInstall] User dismissed installation");
        }

        setDeferredPrompt(null);
      } catch (error) {
        console.error("[usePWAInstall] Error during installation:", error);
      }
      return;
    }

    // No prompt available - show platform-specific instructions
    const userAgent = navigator.userAgent;

    if (/iPhone|iPad|iPod/.test(userAgent)) {
      // iOS Safari
      alert(
        'Para instalar no iOS:\n\n' +
        '1. Toque no botão "Compartilhar" (ícone de seta para cima)\n' +
        '2. Role para baixo e toque em "Adicionar à Tela de Início"\n' +
        '3. Toque em "Adicionar"'
      );
    } else if (/Android/.test(userAgent)) {
      // Android Chrome
      alert(
        'Para instalar no Android:\n\n' +
        '1. Toque no menu (3 pontos) no canto superior\n' +
        '2. Selecione "Adicionar à tela inicial" ou "Instalar app"\n' +
        '3. Confirme a instalação'
      );
    } else {
      // Desktop Chrome/Edge
      alert(
        'Para instalar o aplicativo:\n\n' +
        '1. No Chrome/Edge, clique no menu (3 pontos)\n' +
        '2. Selecione "Instalar FitResults..."\n\n' +
        'Ou clique no ícone de instalação na barra de endereço (se disponível).\n\n' +
        'Nota: Em localhost (desenvolvimento), a instalação pode não estar disponível.'
      );
    }
  }, [deferredPrompt, isPWA]);

  // Dismiss button (hide it)
  const dismissButton = useCallback(async () => {
    console.log("[usePWAInstall] User dismissed install button");
    setUserDismissedButton(true);

    // Save to localStorage immediately
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");

    // Try to save to database
    if (user) {
      try {
        const { error } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              pwa_install_dismissed: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("[usePWAInstall] Error saving preference:", error);
        } else {
          console.log("[usePWAInstall] Preference saved to database");
        }
      } catch (error) {
        console.error("[usePWAInstall] Error saving preference:", error);
      }
    }
  }, [user]);

  // Reset dismissal (for testing/admin purposes)
  const resetDismissal = useCallback(async () => {
    console.log("[usePWAInstall] Resetting dismissal");
    setUserDismissedButton(false);

    // Clear localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    // Clear from database
    if (user) {
      try {
        const { error } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              pwa_install_dismissed: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("[usePWAInstall] Error resetting preference:", error);
        }
      } catch (error) {
        console.error("[usePWAInstall] Error resetting preference:", error);
      }
    }
  }, [user]);

  // Computed states
  const canInstall = !isPWA && !!deferredPrompt;
  const isInstallable = !isPWA; // Can show install option even without prompt (iOS)

  return {
    isPWA,
    canInstall,
    isInstallable,
    userDismissedButton,
    isLoading,
    install,
    dismissButton,
    resetDismissal,
  };
}

/**
 * Utility: Check if browser supports PWA
 */
export function browserSupportsPWA(): boolean {
  return (
    "serviceWorker" in navigator &&
    ("BeforeInstallPromptEvent" in window || /iPhone|iPad|iPod/.test(navigator.userAgent))
  );
}

/**
 * Utility: Get platform name
 */
export function getPlatform(): "ios" | "android" | "desktop" {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return "ios";
  }
  if (/Android/.test(navigator.userAgent)) {
    return "android";
  }
  return "desktop";
}
