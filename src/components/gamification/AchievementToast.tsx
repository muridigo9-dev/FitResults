/**
 * Achievement Toast - Animated notification when user unlocks achievement
 */

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AchievementToastProps {
  isVisible: boolean;
  achievementName: string;
  achievementIcon: string;
  xpReward: number;
  onClose: () => void;
}

export function AchievementToast({
  isVisible,
  achievementName,
  achievementIcon,
  xpReward,
  onClose,
}: AchievementToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 right-4 z-50 max-w-sm"
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-[2px] shadow-2xl">
            <div className="relative bg-background rounded-xl p-4">
              {/* Background particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    initial={{
                      x: Math.random() * 100 + "%",
                      y: "100%",
                      opacity: 1,
                    }}
                    animate={{
                      y: "-100%",
                      opacity: 0,
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <span className="text-2xl">{achievementIcon}</span>
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                      Conquista Desbloqueada!
                    </p>
                  </div>
                  <h3 className="font-bold text-base text-foreground leading-tight mb-1">
                    {achievementName}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      +{xpReward} XP
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 -mt-1 -mr-1 h-6 w-6"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 -z-10 rounded-xl blur-xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-50"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
