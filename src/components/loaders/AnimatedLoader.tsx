/**
 * Animated Loader - Sistema de carregamento contextual
 * 
 * Loaders animados e modernos para cada contexto do app
 * com suporte a acessibilidade e temas
 */

import { motion } from "framer-motion";
import { 
  Heart, 
  Dumbbell, 
  Apple, 
  Trophy, 
  Users, 
  CheckCircle2,
  Activity,
  Utensils,
  Medal,
  TrendingUp,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LoaderType = 
  | "health" 
  | "workout" 
  | "diet" 
  | "challenge" 
  | "community"
  | "checkin"
  | "progress"
  | "default";

export type LoaderSize = "sm" | "md" | "lg";

interface AnimatedLoaderProps {
  type?: LoaderType;
  size?: LoaderSize;
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const messageSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function AnimatedLoader({
  type = "default",
  size = "md",
  message,
  className,
  fullScreen = false,
}: AnimatedLoaderProps) {
  const containerClass = cn(
    "flex flex-col items-center justify-center gap-3",
    fullScreen && "min-h-[60vh]",
    className
  );

  return (
    <div 
      className={containerClass}
      role="status"
      aria-live="polite"
      aria-label={message || "Carregando conteúdo"}
    >
      {type === "health" && <HealthLoader size={size} />}
      {type === "workout" && <WorkoutLoader size={size} />}
      {type === "diet" && <DietLoader size={size} />}
      {type === "challenge" && <ChallengeLoader size={size} />}
      {type === "community" && <CommunityLoader size={size} />}
      {type === "checkin" && <CheckinLoader size={size} />}
      {type === "progress" && <ProgressLoader size={size} />}
      {type === "default" && <DefaultLoader size={size} />}
      
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "text-muted-foreground font-medium",
            messageSizeClasses[size]
          )}
        >
          {message}
        </motion.p>
      )}
      <span className="sr-only">{message || "Carregando"}</span>
    </div>
  );
}

// ============================================
// HEALTH LOADER - Batimento cardíaco
// ============================================
function HealthLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Heart className={cn(sizeClasses[size], "text-red-500 fill-red-500")} />
      </motion.div>
      
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-red-500/30"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
    </div>
  );
}

// ============================================
// WORKOUT LOADER - Halter com movimento
// ============================================
function WorkoutLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Dumbbell className={cn(sizeClasses[size], "text-primary")} />
      </motion.div>
      
      {/* Energy particles */}
      <motion.div
        className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: 0.2,
        }}
      />
      <motion.div
        className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-primary"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: 0.5,
        }}
      />
    </div>
  );
}

// ============================================
// DIET LOADER - Prato e talheres
// ============================================
function DietLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <Apple className={cn(sizeClasses[size], "text-green-500")} />
      </motion.div>
      
      {/* Fork and knife animation */}
      <motion.div
        className="absolute top-0 right-0"
        animate={{
          rotate: [0, 20, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <Utensils className="h-4 w-4 text-green-500/50" />
      </motion.div>
    </div>
  );
}

// ============================================
// CHALLENGE LOADER - Troféu brilhante
// ============================================
function ChallengeLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          y: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Trophy className={cn(sizeClasses[size], "text-yellow-500 fill-yellow-500")} />
      </motion.div>
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <div className="absolute top-0 left-1/2 h-full w-1 bg-gradient-to-b from-transparent via-white/50 to-transparent transform -translate-x-1/2 rotate-12" />
      </motion.div>
      
      {/* Medal particles */}
      <motion.div
        className="absolute top-0 right-0"
        animate={{
          y: [0, 20],
          opacity: [1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <Medal className="h-3 w-3 text-yellow-500" />
      </motion.div>
    </div>
  );
}

// ============================================
// COMMUNITY LOADER - Avatares circulando
// ============================================
function CommunityLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <Users className={cn(sizeClasses[size], "text-blue-500")} />
      
      {/* Orbiting dots */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div className="absolute top-0 left-1/2 h-2 w-2 rounded-full bg-blue-500 -translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 h-2 w-2 rounded-full bg-purple-500 -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 h-2 w-2 rounded-full bg-pink-500 -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 h-2 w-2 rounded-full bg-green-500 -translate-y-1/2" />
      </motion.div>
    </div>
  );
}

// ============================================
// CHECKIN LOADER - Checkmarks sequenciais
// ============================================
function CheckinLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        >
          <CheckCircle2 
            className={cn(
              size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8",
              "text-primary"
            )} 
          />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// PROGRESS LOADER - Gráfico crescente
// ============================================
function ProgressLoader({ size }: { size: LoaderSize }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <TrendingUp className={cn(sizeClasses[size], "text-emerald-500")} />
      </motion.div>
      
      {/* Activity pulse */}
      <motion.div
        className="absolute bottom-0 left-0"
        animate={{
          scale: [1, 1.5],
          opacity: [1, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      >
        <Activity className="h-4 w-4 text-emerald-500/50" />
      </motion.div>
    </div>
  );
}

// ============================================
// DEFAULT LOADER - Spinner padrão melhorado
// ============================================
function DefaultLoader({ size }: { size: LoaderSize }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <Loader2 className={cn(sizeClasses[size], "text-primary")} />
    </motion.div>
  );
}

// ============================================
// SKELETON LOADER - Para cards e listas
// ============================================
export function SkeletonLoader({ 
  count = 3, 
  type = "card" 
}: { 
  count?: number; 
  type?: "card" | "list" | "grid";
}) {
  if (type === "card") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 border rounded-lg space-y-3"
          >
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="aspect-square bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="h-12 bg-muted animate-pulse rounded"
        />
      ))}
    </div>
  );
}
