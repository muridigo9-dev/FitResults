import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
  });

  useEffect(() => {
    // Detect platform and browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);

    // Check if already installed
    const isInstalled = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setState(prev => ({
      ...prev,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isInstalled,
    }));

    // Listen for install prompt (Chrome/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error prompting install:", error);
      return false;
    }
  }, [deferredPrompt]);

  const getInstallInstructions = useCallback(() => {
    if (state.isIOS && state.isSafari) {
      return {
        title: "Instalar no iPhone/iPad",
        steps: [
          "Toque no botão de compartilhar (quadrado com seta para cima)",
          "Role para baixo e toque em 'Adicionar à Tela Inicial'",
          "Toque em 'Adicionar' para confirmar"
        ],
        icon: "share"
      };
    }

    if (state.isAndroid && state.isChrome) {
      return {
        title: "Instalar no Android",
        steps: [
          "Toque nos três pontos no canto superior direito",
          "Selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'",
          "Confirme a instalação"
        ],
        icon: "menu"
      };
    }

    return {
      title: "Instalar Aplicativo",
      steps: [
        "Abra o menu do navegador",
        "Procure por 'Instalar' ou 'Adicionar à tela inicial'",
        "Confirme a instalação"
      ],
      icon: "download"
    };
  }, [state]);

  return {
    ...state,
    promptInstall,
    getInstallInstructions,
    canPromptInstall: !!deferredPrompt,
  };
}
