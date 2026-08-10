import { motion } from "framer-motion";
import { Award, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useBadges,
  useUserBadges,
  useToggleBadgeDisplay,
  type Badge,
  type UserBadge,
} from "@/hooks/useBadges";
import { AnimatedLoader } from "@/components/loaders";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  showAll?: boolean; // Show all badges or only earned
  allowToggle?: boolean; // Allow user to toggle display
  compact?: boolean;
}

export function BadgeDisplay({
  showAll = false,
  allowToggle = false,
  compact = false,
}: BadgeDisplayProps) {
  const { data: allBadges, isLoading: isLoadingAll } = useBadges();
  const { data: userBadges, isLoading: isLoadingUser } = useUserBadges();
  const toggleDisplay = useToggleBadgeDisplay();

  const isLoading = isLoadingAll || isLoadingUser;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <AnimatedLoader type="default" message="Carregando badges..." />
        </CardContent>
      </Card>
    );
  }

  const earnedBadgeIds = new Set(userBadges?.map((ub) => ub.badge_id) || []);
  const badgesToShow = showAll
    ? allBadges
    : allBadges?.filter((badge) => earnedBadgeIds.has(badge.id));

  if (!badgesToShow || badgesToShow.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {showAll
              ? "Nenhum badge disponível"
              : "Você ainda não conquistou nenhum badge"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-4 md:grid-cols-6" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-6")}>
      {badgesToShow.map((badge) => {
        const userBadge = userBadges?.find((ub) => ub.badge_id === badge.id);
        const isEarned = !!userBadge;
        const isDisplayed = userBadge?.is_displayed || false;

        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            userBadge={userBadge}
            isEarned={isEarned}
            isDisplayed={isDisplayed}
            allowToggle={allowToggle && isEarned}
            compact={compact}
            onToggleDisplay={
              allowToggle && userBadge
                ? () =>
                    toggleDisplay.mutate({
                      userBadgeId: userBadge.id,
                      isDisplayed: !isDisplayed,
                    })
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

// Badge Card Component
interface BadgeCardProps {
  badge: Badge;
  userBadge?: UserBadge;
  isEarned: boolean;
  isDisplayed: boolean;
  allowToggle: boolean;
  compact: boolean;
  onToggleDisplay?: () => void;
}

function BadgeCard({
  badge,
  userBadge,
  isEarned,
  isDisplayed,
  allowToggle,
  compact,
  onToggleDisplay,
}: BadgeCardProps) {
  const rarityColors = {
    common: "from-gray-500/20 to-gray-600/20 border-gray-500/50",
    uncommon: "from-green-500/20 to-green-600/20 border-green-500/50",
    rare: "from-blue-500/20 to-blue-600/20 border-blue-500/50",
    epic: "from-purple-500/20 to-purple-600/20 border-purple-500/50",
    legendary: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/50",
  };

  const rarityTextColors = {
    common: "text-gray-600",
    uncommon: "text-green-600",
    rare: "text-blue-600",
    epic: "text-purple-600",
    legendary: "text-yellow-600",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          whileHover={isEarned ? { scale: 1.05 } : {}}
          whileTap={isEarned ? { scale: 0.95 } : {}}
          className={cn(
            "relative rounded-lg border-2 bg-gradient-to-b p-3 transition-all",
            isEarned
              ? rarityColors[badge.rarity as keyof typeof rarityColors]
              : "bg-muted/50 border-muted opacity-50 grayscale"
          )}
        >
          {/* Badge Icon/Emoji */}
          <div className="flex items-center justify-center mb-2">
            {badge.is_animated && badge.animation_url ? (
              <img
                src={badge.animation_url}
                alt={badge.name}
                className={cn("w-12 h-12", !isEarned && "opacity-30")}
              />
            ) : (
              <span className={cn("text-4xl", !isEarned && "opacity-30")}>
                {badge.icon}
              </span>
            )}
          </div>

          {/* Locked Overlay */}
          {!isEarned && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Badge Name */}
          {!compact && (
            <p className="text-xs font-semibold text-center truncate">
              {badge.name}
            </p>
          )}

          {/* Rarity Badge */}
          {!compact && isEarned && (
            <BadgeUI
              variant="secondary"
              className={cn(
                "mt-1 text-xs",
                rarityTextColors[badge.rarity as keyof typeof rarityTextColors]
              )}
            >
              {badge.rarity}
            </BadgeUI>
          )}

          {/* Display Toggle Button */}
          {allowToggle && onToggleDisplay && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 w-6 h-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDisplay();
              }}
            >
              {isDisplayed ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </Button>
          )}
        </motion.div>
      </TooltipTrigger>

      <TooltipContent>
        <div className="space-y-1">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          {isEarned && userBadge && (
            <p className="text-xs text-muted-foreground">
              Conquistado em:{" "}
              {new Date(userBadge.earned_at).toLocaleDateString("pt-BR")}
            </p>
          )}
          {!isEarned && <p className="text-xs text-muted-foreground">🔒 Bloqueado</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Displayed Badges Component (for profile)
export function DisplayedBadges() {
  const { data: displayedBadges, isLoading } = useUserBadges();

  if (isLoading) {
    return <div className="h-8 w-full bg-muted animate-pulse rounded" />;
  }

  const badges = displayedBadges?.filter((ub) => ub.is_displayed).slice(0, 5) || [];

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {badges.map((userBadge) => (
        <Tooltip key={userBadge.id}>
          <TooltipTrigger>
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
              <span className="text-lg">{userBadge.badge.icon}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{userBadge.badge.name}</p>
            <p className="text-xs text-muted-foreground">
              {userBadge.badge.description}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
