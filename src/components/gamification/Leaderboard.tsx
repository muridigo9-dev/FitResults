/**
 * Leaderboard Component - Ranking of users by XP
 */

import { cn } from "@/lib/utils";
import { Crown, TrendingUp, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  level: number;
  totalXP: number;
  streak: number;
  rank: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

export function Leaderboard({ entries, currentUserId, className }: LeaderboardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Ranking</h3>
            <p className="text-xs text-muted-foreground">Top usuários por XP</p>
          </div>
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum usuário ainda</p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === currentUserId}
                index={index}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  index: number;
}) {
  const { rank, userName, level, totalXP, streak } = entry;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all",
        isCurrentUser
          ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30"
          : "bg-secondary/30 hover:bg-secondary/50"
      )}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        {rank <= 3 ? (
          <div className="flex items-center justify-center">
            {rank === 1 && <Medal className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
            {rank === 2 && <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />}
            {rank === 3 && <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />}
          </div>
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="w-10 h-10">
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
          {userName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("font-semibold text-sm truncate", isCurrentUser && "text-purple-600 dark:text-purple-400")}>
            {userName}
            {isCurrentUser && " (Você)"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>Nível {level}</span>
          {streak > 0 && (
            <>
              <span>•</span>
              <span>🔥 {streak} dias</span>
            </>
          )}
        </div>
      </div>

      {/* XP */}
      <div className="text-right">
        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
          {totalXP.toLocaleString()} XP
        </p>
      </div>
    </motion.div>
  );
}
