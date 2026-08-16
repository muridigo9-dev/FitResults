/**
 * Empty State - Estados vazios elegantes e contextuais
 * 
 * Componentes para quando não há dados a exibir
 */

import { motion } from "framer-motion";
import {
  Heart,
  Dumbbell,
  Apple,
  Trophy,
  Users,
  CheckCircle2,
  FileQuestion,
  Inbox,
  Search,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";

export type EmptyStateType =
  | "health"
  | "workout"
  | "diet"
  | "challenge"
  | "community"
  | "noCommunity"
  | "checkin"
  | "search"
  | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const typeIcons: Record<EmptyStateType, ReactNode> = {
  health: <Heart className="h-16 w-16 text-red-500/20" />,
  workout: <Dumbbell className="h-16 w-16 text-primary/20" />,
  diet: <Apple className="h-16 w-16 text-green-500/20" />,
  challenge: <Trophy className="h-16 w-16 text-yellow-500/20" />,
  community: <Users className="h-16 w-16 text-blue-500/20" />,
  noCommunity: <Users className="h-16 w-16 text-blue-500/20" />,
  checkin: <CheckCircle2 className="h-16 w-16 text-primary/20" />,
  search: <Search className="h-16 w-16 text-muted-foreground/20" />,
  generic: <Inbox className="h-16 w-16 text-muted-foreground/20" />,
};

export function EmptyState({
  type = "generic",
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Icon with subtle animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-4"
      >
        {icon || typeIcons[type]}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground max-w-md mb-6"
        >
          {description}
        </motion.p>
      )}

      {/* Action button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={action.onClick} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// PRE-CONFIGURED EMPTY STATES
// ============================================

export function NoWorkoutsEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="workout"
      title={t("states.emptyStates.workouts.title")}
      description={t("states.emptyStates.workouts.description")}
      action={
        onCreateClick
          ? {
              label: t("workouts.createWorkout"),
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoDietsEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="diet"
      title={t("states.emptyStates.diets.title")}
      description={t("states.emptyStates.diets.description")}
      action={
        onCreateClick
          ? {
              label: t("states.emptyStates.diets.action"),
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoChallengesEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="challenge"
      title={t("states.emptyStates.challenges.title")}
      description={t("states.emptyStates.challenges.description")}
      action={
        onCreateClick
          ? {
              label: t("states.emptyStates.challenges.action"),
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoHealthDataEmptyState() {
  const { t } = useI18n();
  return (
    <EmptyState
      type="health"
      title={t("states.emptyStates.health.title")}
      description={t("states.emptyStates.health.description")}
    />
  );
}

export function NoCheckinsEmptyState() {
  const { t } = useI18n();
  return (
    <EmptyState
      type="checkin"
      title={t("states.emptyStates.checkins.title")}
      description={t("states.emptyStates.checkins.description")}
    />
  );
}

export function NoCommunityDataEmptyState() {
  const { t } = useI18n();
  return (
    <EmptyState
      type="community"
      title={t("states.emptyStates.community.title")}
      description={t("states.emptyStates.community.description")}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query?: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="search"
      title={t("states.noResults")}
      description={
        query
          ? t("states.emptyStates.search.withQuery", { query })
          : t("states.emptyStates.search.noQuery")
      }
    />
  );
}

// ============================================
// ERROR STATE
// ============================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <motion.div
        animate={{
          rotate: [0, -5, 5, -5, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: 2,
        }}
      >
        <FileQuestion className="h-16 w-16 text-destructive/30 mb-4" />
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title ?? t("states.error")}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description ?? t("states.errorDescription")}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {t("actions.retry")}
        </Button>
      )}
    </motion.div>
  );
}
