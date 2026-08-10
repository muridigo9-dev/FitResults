import { cn } from "@/lib/utils";
import { useI18nSafe } from "@/hooks/useI18nSafe";

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton shimmer effect
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted",
        className
      )}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for cards
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-border/50 p-4 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

/**
 * Skeleton for habit cards
 */
export function SkeletonHabitCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-border/50 p-4", className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

/**
 * Loading screen with centered spinner
 * Uses optional i18n - works even outside LanguageProvider
 */
export function LoadingScreen({ message }: { message?: string }) {
  const { t } = useI18nSafe();
  const displayMessage = message || t("states.loading");
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">{displayMessage}</p>
    </div>
  );
}

/**
 * Loading overlay for sections
 */
export function LoadingOverlay({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl",
      className
    )}>
      <div className="h-8 w-8 rounded-full border-3 border-muted animate-spin border-t-primary" />
    </div>
  );
}
