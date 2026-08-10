import { AlertCircle, RefreshCw, WifiOff, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

type ErrorType = "default" | "network" | "server" | "notFound";

interface ErrorStateProps {
  /** Error type determines icon and default message */
  type?: ErrorType;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Retry action */
  onRetry?: () => void;
  /** Go back action */
  onBack?: () => void;
  /** Additional classes */
  className?: string;
  /** Compact mode for inline errors */
  compact?: boolean;
}

export function ErrorState({
  type = "default",
  title,
  description,
  onRetry,
  onBack,
  className,
  compact = false,
}: ErrorStateProps) {
  const { t } = useI18n();

  const errorConfig: Record<ErrorType, { icon: typeof AlertCircle; title: string; description: string }> = {
    default: {
      icon: AlertCircle,
      title: t("states.error"),
      description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    },
    network: {
      icon: WifiOff,
      title: t("states.noConnection"),
      description: "Verifique sua conexão com a internet e tente novamente.",
    },
    server: {
      icon: ServerOff,
      title: t("states.serverUnavailable"),
      description: "Nossos servidores estão temporariamente indisponíveis. Tente novamente em alguns minutos.",
    },
    notFound: {
      icon: AlertCircle,
      title: t("states.notFound"),
      description: "O conteúdo que você procura não existe ou foi removido.",
    },
  };

  const config = errorConfig[type];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20",
        className
      )}>
        <Icon className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">
            {title || config.title}
          </p>
          {description && (
            <p className="text-xs text-destructive/80 truncate">
              {description}
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-6",
      className
    )}>
      {/* Icon */}
      <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-destructive" />
      </div>

      {/* Title */}
      <h3 className="text-heading-3 text-foreground mb-2">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="text-body-sm text-muted-foreground max-w-xs mb-6">
        {description || config.description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <Button onClick={onRetry} size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("actions.retry")}
          </Button>
        )}
        {onBack && (
          <Button variant="outline" onClick={onBack} size="lg">
            {t("actions.back")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error message for forms
 */
export function InlineError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-destructive mt-1.5">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}
