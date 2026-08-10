import { ReactNode, isValidElement, createElement } from "react";
import {
  Inbox,
  Search,
  Calendar,
  FileText,
  Users,
  Award,
  Target,
  TrendingUp,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

type EmptyStateType =
  | "default"
  | "search"
  | "calendar"
  | "documents"
  | "users"
  | "achievements"
  | "habits"
  | "progress";

interface EmptyStateProps {
  /** Type determines the icon shown */
  type?: EmptyStateType;
  /** Main title */
  title?: string;
  /** Description text */
  description?: string;
  /** Primary action */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom icon - can be a ReactNode or a LucideIcon component */
  icon?: ReactNode | LucideIcon;
  /** Additional classes */
  className?: string;
}

const iconMap: Record<EmptyStateType, typeof Inbox> = {
  default: Inbox,
  search: Search,
  calendar: Calendar,
  documents: FileText,
  users: Users,
  achievements: Award,
  habits: Target,
  progress: TrendingUp,
};

export function EmptyState({
  type = "default",
  title,
  description,
  action,
  secondaryAction,
  icon,
  className,
}: EmptyStateProps) {
  const { t } = useI18n();
  const DefaultIcon = iconMap[type];

  const displayTitle = title || t("states.empty");

  // Render icon - handle both ReactNode and LucideIcon component
  const renderIcon = () => {
    if (!icon) {
      return <DefaultIcon className="h-10 w-10 text-muted-foreground" />;
    }

    // Check if it's a valid React element (already rendered JSX)
    if (isValidElement(icon)) {
      return icon;
    }

    // Check if it's a component (function)
    if (typeof icon === "function") {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-10 w-10 text-muted-foreground" />;
    }

    // Fallback
    return <DefaultIcon className="h-10 w-10 text-muted-foreground" />;
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-6",
      className
    )}>
      {/* Icon */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center">
          {renderIcon()}
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-3xl ring-8 ring-muted/30 -z-10" />
      </div>

      {/* Title */}
      <h3 className="text-heading-3 text-foreground mb-2">
        {displayTitle}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-body-sm text-muted-foreground max-w-xs mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} size="lg">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} size="lg">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Preset empty states for common scenarios
 */
export function EmptyHabits({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="habits"
      title={t("states.empty")}
      description="Comece sua jornada adicionando seu primeiro hábito de saúde."
      action={{ label: t("actions.add"), onClick: onAdd }}
    />
  );
}

export function EmptyProgress() {
  const { t } = useI18n();
  return (
    <EmptyState
      type="progress"
      title={t("states.empty")}
      description="Complete check-ins diários para ver seu progresso aqui."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="search"
      title={t("states.noResults")}
      description={`Não encontramos resultados para "${query}". Tente outra busca.`}
    />
  );
}
