import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { 
  Crown, 
  Shield, 
  Dumbbell, 
  Apple, 
  GraduationCap, 
  PenTool,
  type LucideIcon 
} from "lucide-react";
import { AcademyRole } from "@/contexts/AcademyContext";

// =====================================================
// BADGE VARIANTS
// =====================================================

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105",
  {
    variants: {
      variant: {
        owner: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
        admin: "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30",
        trainer: "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30",
        nutritionist: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-400 border border-green-500/30",
        student: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30",
        content_creator: "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-700 dark:text-pink-400 border border-pink-500/30",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "student",
      size: "default",
    },
  }
);

// =====================================================
// ROLE TO ICON MAPPING
// =====================================================

const roleIcons: Record<AcademyRole, LucideIcon> = {
  owner: Crown,
  admin: Shield,
  trainer: Dumbbell,
  nutritionist: Apple,
  student: GraduationCap,
  content_creator: PenTool,
};

const roleLabels: Record<AcademyRole, string> = {
  owner: "Dono",
  admin: "Admin",
  trainer: "Personal",
  nutritionist: "Nutricionista",
  student: "Aluno",
  content_creator: "Criador",
};

// =====================================================
// COMPONENT
// =====================================================

export interface AcademyBadgeProps extends VariantProps<typeof badgeVariants> {
  role: AcademyRole;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  customLabel?: string;
}

export function AcademyBadge({
  role,
  size,
  className,
  showIcon = true,
  showLabel = true,
  customLabel,
}: AcademyBadgeProps) {
  const Icon = roleIcons[role];
  const label = customLabel || roleLabels[role];

  return (
    <span className={cn(badgeVariants({ variant: role, size }), className)}>
      {showIcon && <Icon className="w-3 h-3" />}
      {showLabel && <span>{label}</span>}
    </span>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        active: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30",
        pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
        suspended: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30",
        expired: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-500/30",
        cancelled: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-500/30",
        accepted: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30",
        rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30",
      },
    },
    defaultVariants: {
      status: "active",
    },
  }
);

const statusLabels: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  suspended: "Suspenso",
  expired: "Expirado",
  cancelled: "Cancelado",
  accepted: "Aceito",
  rejected: "Rejeitado",
};

export interface StatusBadgeProps extends VariantProps<typeof statusVariants> {
  status: "active" | "pending" | "suspended" | "expired" | "cancelled" | "accepted" | "rejected";
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  return (
    <span className={cn(statusVariants({ status }), className)}>
      {showDot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "active" && "bg-green-500 animate-pulse",
          status === "pending" && "bg-yellow-500",
          status === "suspended" && "bg-red-500",
          status === "expired" && "bg-gray-500",
          status === "cancelled" && "bg-gray-500",
          status === "accepted" && "bg-green-500",
          status === "rejected" && "bg-red-500"
        )} />
      )}
      <span>{statusLabels[status]}</span>
    </span>
  );
}

// =====================================================
// LIMIT BADGE (for displaying usage)
// =====================================================

export interface LimitBadgeProps {
  current: number;
  max: number;
  label?: string;
  className?: string;
}

export function LimitBadge({ current, max, label, className }: LimitBadgeProps) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
        isAtLimit && "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30",
        isNearLimit && !isAtLimit && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
        !isNearLimit && "bg-muted text-muted-foreground border border-border",
        className
      )}
    >
      {label && <span className="text-[10px] opacity-70">{label}</span>}
      <span className="font-bold">{current}</span>
      <span className="opacity-50">/</span>
      <span>{max}</span>
    </span>
  );
}
