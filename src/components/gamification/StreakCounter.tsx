/**
 * Streak Counter Component - Shows current streak with fire animation
 */

import { cn } from "@/lib/utils";
import { Flame, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  className,
}: StreakCounterProps) {
  const isOnFire = currentStreak >= 7;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative p-6">
        {/* Background gradient for hot streaks */}
        {isOnFire && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10" />
        )}

        <div className="relative space-y-4">
          {/* Current Streak */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                animate={
                  isOnFire
                    ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0],
                      }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Flame
                  className={cn(
                    "w-8 h-8",
                    isOnFire
                      ? "text-orange-500 fill-orange-500"
                      : "text-muted-foreground"
                  )}
                />
              </motion.div>
            </div>

            <motion.div
              key={currentStreak}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"
            >
              {currentStreak}
            </motion.div>

            <p className="text-sm text-muted-foreground mt-1">
              {currentStreak === 0
                ? "Comece sua sequência!"
                : currentStreak === 1
                ? "dia de sequência"
                : "dias de sequência"}
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 text-xs text-muted-foreground bg-background">
                recorde
              </span>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <Award className="w-4 h-4 text-yellow-500" />
            <span className="text-muted-foreground">Maior sequência:</span>
            <span className="font-bold text-foreground">{longestStreak} dias</span>
          </div>

          {/* Motivational Message */}
          {currentStreak > 0 && (
            <div className="pt-4 text-center">
              <p className="text-sm font-medium text-foreground">
                {getMotivatonalMessage(currentStreak)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function getMotivatonalMessage(streak: number): string {
  if (streak >= 30) return "🎉 Você é uma lenda! Continue assim!";
  if (streak >= 21) return "🔥 Hábito formado! Incrível!";
  if (streak >= 14) return "💪 Duas semanas! Você é imparável!";
  if (streak >= 7) return "⚡ Uma semana inteira! Fantástico!";
  if (streak >= 3) return "🌟 Pegando ritmo! Continue!";
  return "✨ Ótimo começo! Mantenha o foco!";
}
