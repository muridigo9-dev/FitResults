import { ReactNode } from "react";
import { Check, Sparkles, Trophy, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type SuccessType = "default" | "achievement" | "streak" | "levelUp" | "complete";

interface SuccessStateProps {
  /** Type determines icon and styling */
  type?: SuccessType;
  /** Main title */
  title: string;
  /** Description */
  description?: string;
  /** Custom icon */
  icon?: ReactNode;
  /** Additional classes */
  className?: string;
  /** Auto-dismiss after ms (for toast-like usage) */
  autoDismiss?: number;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

const successConfig: Record<SuccessType, { icon: typeof Check; color: string; bgColor: string }> = {
  default: {
    icon: Check,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  achievement: {
    icon: Trophy,
    color: "text-level-gold",
    bgColor: "bg-level-gold/10",
  },
  streak: {
    icon: Flame,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  levelUp: {
    icon: Star,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  complete: {
    icon: Sparkles,
    color: "text-tertiary",
    bgColor: "bg-tertiary/10",
  },
};

export function SuccessState({
  type = "default",
  title,
  description,
  icon,
  className,
}: SuccessStateProps) {
  const config = successConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-8 px-6 animate-scale-in",
      className
    )}>
      {/* Animated icon container */}
      <div className={cn(
        "h-20 w-20 rounded-3xl flex items-center justify-center mb-4 relative",
        config.bgColor
      )}>
        {icon || <Icon className={cn("h-10 w-10", config.color)} />}
        
        {/* Celebration particles */}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-ping" />
        <span className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-primary animate-ping animation-delay-200" />
      </div>

      {/* Title */}
      <h3 className="text-heading-3 text-foreground mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-body-sm text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Compact success badge for inline feedback
 */
export function SuccessBadge({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
      "bg-success/10 text-success text-sm font-medium",
      "animate-scale-in",
      className
    )}>
      <Check className="h-4 w-4" />
      {children}
    </span>
  );
}

/**
 * Animated checkmark for completion
 */
export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <div className={cn(
      "h-12 w-12 rounded-full bg-success flex items-center justify-center",
      className
    )}>
      <Check className="h-6 w-6 text-success-foreground animate-check-bounce" />
    </div>
  );
}

/**
 * XP gain indicator
 */
export function XPGain({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-primary font-bold animate-slide-up",
      className
    )}>
      <Sparkles className="h-4 w-4" />
      +{amount} XP
    </span>
  );
}
