/**
 * Achievement Card Component - Beautiful achievement display
 */

import { cn } from "@/lib/utils";
import { Trophy, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface AchievementCardProps {
  name: string;
  description: string;
  icon?: string;
  color?: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; required: number };
  className?: string;
}

export function AchievementCard({
  name,
  description,
  icon = "🏆",
  color = "from-yellow-400 to-orange-500",
  xpReward,
  isUnlocked,
  unlockedAt,
  progress,
  className,
}: AchievementCardProps) {
  const progressPercent = progress
    ? Math.min((progress.current / progress.required) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          isUnlocked
            ? "bg-gradient-to-br from-background to-secondary/20 shadow-lg border-2 border-primary/20"
            : "bg-secondary/30 opacity-75 grayscale",
          className
        )}
      >
        {/* Background Glow */}
        {isUnlocked && (
          <div className="absolute inset-0 bg-gradient-to-br opacity-5" style={{ 
            background: `linear-gradient(to bottom right, var(--${color}))` 
          }} />
        )}

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg transition-all duration-300",
                  isUnlocked
                    ? `bg-gradient-to-br ${color}`
                    : "bg-secondary"
                )}
              >
                {isUnlocked ? (
                  <span className="text-3xl">{icon}</span>
                ) : (
                  <Lock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Sparkle Effect for Unlocked */}
              {isUnlocked && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </motion.div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  "font-bold text-base leading-tight truncate",
                  isUnlocked ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {name}
              </h3>
              <p
                className={cn(
                  "text-sm mt-1 line-clamp-2",
                  isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
                )}
              >
                {description}
              </p>
            </div>
          </div>

          {/* Progress Bar (if not unlocked) */}
          {!isUnlocked && progress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>
                  {progress.current} / {progress.required}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {/* XP Reward */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Trophy className="w-3 h-3 text-white" />
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isUnlocked ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                )}
              >
                +{xpReward} XP
              </span>
            </div>

            {/* Unlocked Date */}
            {isUnlocked && unlockedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(unlockedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}

            {/* Locked Badge */}
            {!isUnlocked && (
              <div className="px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground font-medium">
                Bloqueada
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
