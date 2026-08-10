import { useState, useEffect } from "react";
import { X, Download, Share, MoreVertical, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePWA } from "@/hooks/usePWA";
import { useI18n } from "@/hooks/useI18n";

interface InstallPromptProps {
  variant?: "banner" | "modal" | "inline";
  onDismiss?: () => void;
}

export function InstallPrompt({ variant = "banner", onDismiss }: InstallPromptProps) {
  const { t } = useI18n();
  const {
    isInstalled,
    isInstallable,
    isIOS,
    isSafari,
    canPromptInstall,
    promptInstall,
    getInstallInstructions,
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check local storage for dismissal
  useEffect(() => {
    const dismissedUntil = localStorage.getItem("pwa-install-dismissed");
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setDismissed(true);
      } else {
        localStorage.removeItem("pwa-install-dismissed");
      }
    }
  }, []);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // Don't show banner if not installable and not iOS Safari
  if (variant === "banner" && !isInstallable && !(isIOS && isSafari)) {
    return null;
  }

  const handleDismiss = () => {
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem("pwa-install-dismissed", dismissUntil.toISOString());
    setDismissed(true);
    onDismiss?.();
  };

  const handleInstall = async () => {
    if (canPromptInstall) {
      await promptInstall();
    } else if (isIOS && isSafari) {
      setShowInstructions(true);
    }
  };

  const instructions = getInstallInstructions();

  if (showInstructions) {
    return (
      <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md shadow-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {instructions.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInstructions(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ol className="space-y-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          
          <div className="mt-4 flex justify-center">
            {instructions.icon === "share" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share className="h-5 w-5" />
                <span>Procure por este ícone</span>
              </div>
            )}
            {instructions.icon === "menu" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MoreVertical className="h-5 w-5" />
                <span>Procure por este ícone</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "banner") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent pb-safe">
        <Card className="mx-auto max-w-md shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Download className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  {t("pwa.installTitle")}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("pwa.installDescription")}
                </p>
                
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    className="flex-1"
                  >
                    {t("pwa.installButton")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                  >
                    {t("pwa.later")}
                  </Button>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant for install page
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          {t("pwa.installTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {t("pwa.installDescription")}
        </p>
        
        {canPromptInstall ? (
          <Button onClick={handleInstall} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {t("pwa.installButton")}
          </Button>
        ) : (
          <>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">{instructions.title}</h4>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-primary">{index + 1}.</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
