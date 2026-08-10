/**
 * PWA Install Button - Floating action button
 * 
 * Shows a floating button to install PWA with:
 * - Smart visibility rules
 * - Close (X) button
 * - Animated entrance
 * - Responsive design
 */

import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePWAInstall, getPlatform } from "@/hooks/usePWAInstall";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface PWAInstallButtonProps {
  className?: string;
}

export function PWAInstallButton({ className }: PWAInstallButtonProps) {
  const { user } = useAuth();
  const {
    isInstallable,
    canInstall,
    userDismissedButton,
    isLoading,
    install,
    dismissButton,
  } = usePWAInstall();

  const platform = getPlatform();

  // Visibility rules
  const shouldShow =
    !!user && // User is logged in
    isInstallable && // App is not installed
    !userDismissedButton && // User hasn't dismissed
    !isLoading; // Not loading preferences

  if (!shouldShow) {
    return null;
  }

  const handleInstall = async () => {
    await install();
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await dismissButton();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={cn(
          "fixed bottom-24 left-4 right-4 z-[55]",
          "md:left-auto md:right-8 md:bottom-8 md:max-w-sm",
          className
        )}
      >
        <Card className="relative overflow-hidden shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="p-4 pr-10">
            {/* Icon */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                {platform === "ios" ? (
                  <Smartphone className="h-5 w-5 text-white" />
                ) : (
                  <Download className="h-5 w-5 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground mb-1">
                  Instalar aplicativo
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {platform === "ios"
                    ? "Adicione à tela inicial para acesso rápido"
                    : "Instale para melhor experiência"}
                </p>

                {/* Install button */}
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="w-full h-8 text-xs font-semibold"
                  disabled={!canInstall && platform !== "ios"}
                >
                  {platform === "ios" ? (
                    <>
                      <Smartphone className="h-3 w-3 mr-1.5" />
                      Ver instruções
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1.5" />
                      Instalar agora
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 border-2 border-primary rounded-lg opacity-50 -z-10"
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
