/**
 * XP Bar Component - Modern animated XP progress bar
 */

import { cn } from "@/lib/utils";
import { Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface XPBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  levelName: string;
  className?: string;
  showDetails?: boolean;
}

export function XPBar({
  currentXP,
  requiredXP,
  level,
  levelName,
  className,
  showDetails = true,
}: XPBarProps) {
  const progress = Math.min((currentXP / requiredXP) * 100, 100);
  const remainingXP = Math.max(requiredXP - currentXP, 0);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Level Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <span className="text-xl font-bold text-white">{level}</span>
            </div>
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </motion.div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{levelName}</p>
            <p className="text-xs text-muted-foreground">Nível {level}</p>
          </div>
        </div>

        {showDetails && (
          <div className="text-right">
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {currentXP} / {requiredXP} XP
            </p>
            <p className="text-xs text-muted-foreground">
              {remainingXP > 0 ? `${remainingXP} XP restantes` : "Nível máximo!"}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        {/* Background */}
        <div className="h-4 rounded-full bg-secondary/50 backdrop-blur-sm overflow-hidden shadow-inner">
          {/* Animated Progress */}
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>

        {/* XP Icon */}
        <motion.div
          className="absolute -right-1 -top-1 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Zap className="w-3 h-3 text-white fill-white" />
        </motion.div>
      </div>

      {/* Progress Percentage */}
      {showDetails && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <div className="h-1 w-1 rounded-full bg-purple-500" />
          <span>{progress.toFixed(0)}% completo</span>
          <div className="h-1 w-1 rounded-full bg-purple-500" />
        </div>
      )}
    </div>
  );
}
