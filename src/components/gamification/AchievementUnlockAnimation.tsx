import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Award, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import type { Achievement } from "@/hooks/useAchievements";

interface AchievementUnlockAnimationProps {
  show: boolean;
  achievement: Achievement | null;
  onComplete?: () => void;
}

export function AchievementUnlockAnimation({
  show,
  achievement,
  onComplete,
}: AchievementUnlockAnimationProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show && achievement) {
      setIsVisible(true);

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#8B00FF"],
      });

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, achievement, onComplete]);

  if (!achievement) return null;

  const rarityColors = {
    common: "from-gray-500 to-gray-600",
    uncommon: "from-green-500 to-green-600",
    rare: "from-blue-500 to-blue-600",
    epic: "from-purple-500 to-purple-600",
    legendary: "from-yellow-500 to-orange-500",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => {
            setIsVisible(false);
            onComplete?.();
          }}
        >
          <motion.div
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -100 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative max-w-md w-full mx-4"
          >
            {/* Glow Effect */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute inset-0 bg-gradient-to-r ${
                rarityColors[achievement.rarity as keyof typeof rarityColors]
              } rounded-2xl blur-2xl opacity-50`}
            />

            {/* Main Card */}
            <div className="relative bg-card border-2 border-primary rounded-2xl p-6 shadow-2xl">
              {/* Floating Sparkles */}
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-3 -right-3"
              >
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </motion.div>

              {/* Header */}
              <div className="text-center mb-4">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                >
                  <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                </motion.div>

                <h3 className="text-2xl font-bold mb-1">
                  Conquista Desbloqueada!
                </h3>

                <p className="text-sm text-muted-foreground">
                  Você conquistou um novo achievement
                </p>
              </div>

              {/* Achievement Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center justify-center mb-4"
              >
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${
                    rarityColors[achievement.rarity as keyof typeof rarityColors]
                  } flex items-center justify-center text-4xl shadow-lg`}
                >
                  {achievement.icon || <Award className="w-12 h-12 text-white" />}
                </div>
              </motion.div>

              {/* Achievement Details */}
              <div className="text-center space-y-2">
                <h4 className="text-xl font-bold">{achievement.name}</h4>

                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>

                {/* Rarity Badge */}
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${
                      rarityColors[achievement.rarity as keyof typeof rarityColors]
                    }`}
                  >
                    {achievement.rarity.toUpperCase()}
                  </span>
                </div>

                {/* XP Reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="pt-4 border-t border-border"
                >
                  <p className="text-2xl font-bold text-primary">
                    +{achievement.xp_reward} XP
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recompensa de XP
                  </p>
                </motion.div>
              </div>

              {/* Tap to dismiss hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="text-center text-xs text-muted-foreground mt-4"
              >
                Toque para fechar
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
