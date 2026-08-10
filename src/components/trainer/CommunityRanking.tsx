import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityRanking, getRankingPeriodLabel, RankingPeriod, RankingEntry } from "@/hooks/useCommunityRanking";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Medal, TrendingUp, Star, Crown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CommunityRankingProps {
  trainerId?: string;
  className?: string;
  compact?: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const POSITION_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-level-gold/20 to-level-gold/10 border-level-gold/30",
  2: "bg-gradient-to-r from-level-silver/20 to-level-silver/10 border-level-silver/30",
  3: "bg-gradient-to-r from-level-bronze/20 to-level-bronze/10 border-level-bronze/30",
};

function RankingPosition({ position }: { position: number }) {
  if (position <= 3) {
    return (
      <div className="flex items-center justify-center w-10 h-10 text-2xl">
        {MEDALS[position - 1]}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold">
      {position}
    </div>
  );
}

function RankingRow({ entry, isCurrentUser }: { entry: RankingEntry; isCurrentUser: boolean }) {
  const positionStyle = POSITION_STYLES[entry.position] || "";
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        positionStyle,
        isCurrentUser && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        !positionStyle && "bg-card hover:bg-muted/50"
      )}
    >
      <RankingPosition position={entry.position} />
      
      <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
        <AvatarImage src={entry.avatar_url || undefined} alt={entry.full_name || "User"} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {entry.full_name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium truncate",
            isCurrentUser && "text-primary"
          )}>
            {entry.full_name || "Usuário"}
          </p>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">Você</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-habit-workout" />
            {entry.workouts} treinos
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-level-gold" />
            {entry.habits} hábitos
          </span>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-bold text-lg text-primary">{entry.points}</p>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </div>
  );
}

function RankingRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-3 w-10 mt-1" />
      </div>
    </div>
  );
}

function UserPositionCard({ 
  position, 
  totalParticipants, 
  points, 
  pointsToNext 
}: { 
  position: number; 
  totalParticipants: number; 
  points: number; 
  pointsToNext: number;
}) {
  const percentile = Math.round((1 - (position / totalParticipants)) * 100);
  
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              {position <= 3 ? (
                <span className="text-2xl">{MEDALS[position - 1]}</span>
              ) : (
                <Trophy className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sua posição</p>
              <p className="text-2xl font-bold">{position}º</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Pontuação</p>
            <p className="text-2xl font-bold text-primary">{points}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Medal className="h-4 w-4" />
            <span>Top {percentile > 0 ? percentile : 1}%</span>
          </div>
          {pointsToNext > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>{pointsToNext} pts para subir</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CommunityRanking({ trainerId, className, compact = false }: CommunityRankingProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<RankingPeriod>("weekly");
  const { ranking, myPosition, isLoading, isCommunityModeEnabled } = useCommunityRanking(trainerId, period);

  if (!isCommunityModeEnabled) {
    return null;
  }

  const displayRanking = compact ? ranking.slice(0, 5) : ranking;

  return (
    <div className={cn("space-y-4", className)}>
      {/* User's Position Card */}
      {myPosition && !compact && (
        <UserPositionCard
          position={myPosition.position}
          totalParticipants={myPosition.total_participants}
          points={myPosition.points}
          pointsToNext={myPosition.points_to_next}
        />
      )}

      {/* Ranking Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-level-gold" />
              Ranking da Comunidade
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Period Tabs */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as RankingPeriod)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">Semana</TabsTrigger>
              <TabsTrigger value="monthly">Mês</TabsTrigger>
              <TabsTrigger value="all_time">Geral</TabsTrigger>
            </TabsList>

            <TabsContent value={period} className="mt-4 space-y-2">
              {isLoading ? (
                <>
                  <RankingRowSkeleton />
                  <RankingRowSkeleton />
                  <RankingRowSkeleton />
                </>
              ) : displayRanking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Nenhum participante ainda</p>
                  <p className="text-sm">Complete check-ins para aparecer no ranking!</p>
                </div>
              ) : (
                displayRanking.map((entry) => (
                  <RankingRow
                    key={entry.user_id}
                    entry={entry}
                    isCurrentUser={entry.user_id === user?.id}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>

          {compact && ranking.length > 5 && (
            <p className="text-center text-sm text-muted-foreground">
              + {ranking.length - 5} participantes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CommunityRanking;
