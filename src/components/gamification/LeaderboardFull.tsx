import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLeaderboard,
  useUserLeaderboardPosition,
  useLeaderboardAroundUser,
  type LeaderboardPeriod,
} from "@/hooks/useLeaderboard";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { cn } from "@/lib/utils";

export function LeaderboardFull() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const { data: leaderboard, isLoading } = useLeaderboard(period, 100);
  const { data: userPosition } = useUserLeaderboardPosition();
  const { data: contextualRanking } = useLeaderboardAroundUser(5);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <AnimatedLoader type="community" message="Carregando ranking..." />
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            type="noCommunity"
            title="Ranking vazio"
            description="Seja o primeiro a aparecer no ranking!"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Position Card */}
      {userPosition && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">
                    #{userPosition.rank}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sua Posição</p>
                  <p className="text-lg font-bold">{userPosition.full_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">XP Total</p>
                <p className="text-2xl font-bold">{userPosition.total_xp}</p>
                {userPosition.rank_change !== 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-semibold",
                      userPosition.rank_change > 0 && "text-green-600",
                      userPosition.rank_change < 0 && "text-red-600"
                    )}
                  >
                    {userPosition.rank_change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(userPosition.rank_change)} posições
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="daily">Diário</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="all_time">Geral</TabsTrigger>
            </TabsList>

            <TabsContent value={period} className="mt-6 space-y-2">
              {/* Top 3 Podium */}
              {leaderboard.slice(0, 3).length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* 2nd Place */}
                  {leaderboard[1] && (
                    <PodiumCard entry={leaderboard[1]} position={2} />
                  )}
                  {/* 1st Place */}
                  {leaderboard[0] && (
                    <PodiumCard entry={leaderboard[0]} position={1} />
                  )}
                  {/* 3rd Place */}
                  {leaderboard[2] && (
                    <PodiumCard entry={leaderboard[2]} position={3} />
                  )}
                </div>
              )}

              {/* Rest of Rankings */}
              <div className="space-y-2">
                {leaderboard.slice(3).map((entry, index) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    position={index + 4}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Contextual Ranking (Around User) */}
      {contextualRanking && contextualRanking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking ao Seu Redor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contextualRanking.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                position={entry.rank}
                compact
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Podium Card for Top 3
interface PodiumCardProps {
  entry: any;
  position: 1 | 2 | 3;
}

function PodiumCard({ entry, position }: PodiumCardProps) {
  const colors = {
    1: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/50",
    2: "from-gray-400/20 to-gray-500/20 border-gray-400/50",
    3: "from-orange-500/20 to-orange-600/20 border-orange-500/50",
  };

  const icons = {
    1: <Crown className="w-6 h-6 text-yellow-500" />,
    2: <Medal className="w-5 h-5 text-gray-400" />,
    3: <Award className="w-5 h-5 text-orange-500" />,
  };

  const heights = {
    1: "h-32",
    2: "h-24 mt-8",
    3: "h-20 mt-12",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={cn(
        "relative rounded-lg border-2 bg-gradient-to-b p-4 text-center",
        colors[position],
        heights[position]
      )}
    >
      {/* Icon */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        {icons[position]}
      </div>

      {/* Avatar */}
      <Avatar className="mx-auto mb-2 w-12 h-12">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback>{entry.full_name[0]}</AvatarFallback>
      </Avatar>

      {/* Name */}
      <p className="text-sm font-semibold truncate">{entry.full_name}</p>

      {/* XP */}
      <div className="flex items-center justify-center gap-1 mt-1">
        <Flame className="w-3 h-3 text-orange-500" />
        <span className="text-xs font-bold">{entry.total_xp} XP</span>
      </div>
    </motion.div>
  );
}

// Leaderboard Row
interface LeaderboardRowProps {
  entry: any;
  position: number;
  compact?: boolean;
}

function LeaderboardRow({ entry, position, compact = false }: LeaderboardRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: position * 0.02 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        entry.is_current_user
          ? "bg-primary/10 border border-primary/20"
          : "bg-muted/50 hover:bg-muted"
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
          position <= 10 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {position}
      </div>

      {/* Avatar */}
      <Avatar className={compact ? "w-8 h-8" : "w-10 h-10"}>
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback>{entry.full_name[0]}</AvatarFallback>
      </Avatar>

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold truncate", compact ? "text-sm" : "text-base")}>
          {entry.full_name}
          {entry.is_current_user && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Você
            </Badge>
          )}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground">Nível {entry.level}</p>
        )}
      </div>

      {/* XP */}
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className={cn("font-bold", compact ? "text-sm" : "text-base")}>
            {entry.total_xp}
          </span>
        </div>
        {!compact && entry.rank_change !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              entry.rank_change > 0 && "text-green-600",
              entry.rank_change < 0 && "text-red-600"
            )}
          >
            {entry.rank_change > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : entry.rank_change < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(entry.rank_change)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
