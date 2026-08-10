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
  return (
    <EmptyState
      type="workout"
      title="Nenhum treino encontrado"
      description="Comece criando seu primeiro treino personalizado ou aguarde seu personal atribuir um para você."
      action={
        onCreateClick
          ? {
              label: "Criar Treino",
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoDietsEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      type="diet"
      title="Nenhuma dieta encontrada"
      description="Monte sua primeira dieta ou aguarde seu nutricionista criar uma para você."
      action={
        onCreateClick
          ? {
              label: "Criar Dieta",
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoChallengesEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      type="challenge"
      title="Nenhum desafio ativo"
      description="Desafios são uma ótima forma de manter a motivação! Crie um novo ou participe de desafios da comunidade."
      action={
        onCreateClick
          ? {
              label: "Criar Desafio",
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoHealthDataEmptyState() {
  return (
    <EmptyState
      type="health"
      title="Sem dados de saúde"
      description="Comece registrando suas métricas de saúde para acompanhar sua evolução."
    />
  );
}

export function NoCheckinsEmptyState() {
  return (
    <EmptyState
      type="checkin"
      title="Nenhum check-in registrado"
      description="Faça seu primeiro check-in diário para começar a acompanhar seu progresso!"
    />
  );
}

export function NoCommunityDataEmptyState() {
  return (
    <EmptyState
      type="community"
      title="Nenhum usuário no ranking"
      description="A comunidade ainda está crescendo. Seja um dos primeiros a participar!"
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      type="search"
      title="Nenhum resultado encontrado"
      description={
        query
          ? `Não encontramos resultados para "${query}". Tente outros termos de busca.`
          : "Refine sua busca para encontrar o que procura."
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
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
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

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Tentar Novamente
        </Button>
      )}
    </motion.div>
  );
}
