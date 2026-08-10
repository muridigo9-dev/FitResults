import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        // State variants
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",
        // Soft variants
        soft: "border-transparent bg-primary/10 text-primary",
        "soft-success": "border-transparent bg-success/10 text-success",
        "soft-warning": "border-transparent bg-warning/10 text-warning",
        "soft-destructive": "border-transparent bg-destructive/10 text-destructive",
        // Gamification level variants
        bronze: "border-level-bronze/30 bg-level-bronze/10 text-level-bronze",
        silver: "border-level-silver/30 bg-level-silver/10 text-level-silver",
        gold: "border-level-gold/30 bg-level-gold/10 text-level-gold",
        platinum: "border-level-platinum/30 bg-level-platinum/10 text-level-platinum",
        diamond: "border-level-diamond/30 bg-level-diamond/10 text-level-diamond",
        // Habit variants
        water: "border-habit-water/30 bg-habit-water/10 text-habit-water",
        sleep: "border-habit-sleep/30 bg-habit-sleep/10 text-habit-sleep",
        workout: "border-habit-workout/30 bg-habit-workout/10 text-habit-workout",
        meals: "border-habit-meals/30 bg-habit-meals/10 text-habit-meals",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "soft" | "soft-success" | "soft-warning" | "soft-destructive" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "water" | "sleep" | "workout" | "meals";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
