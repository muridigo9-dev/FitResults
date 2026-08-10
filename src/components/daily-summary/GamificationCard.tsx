import { Trophy, Flame, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GamificationCardProps {
    data: {
        streak: number;
        level: number;
        levelName: string;
        totalXP: number;
        minXP: number;
        maxXP: number;
        pointsToday: number;
    } | null;
}

export function GamificationCard({ data }: GamificationCardProps) {
    if (!data) return null;

    const currentLevelXP = data.totalXP - data.minXP;
    const levelTargetXP = data.maxXP - data.minXP;
    const progressPercent = Math.min(100, Math.max(0, (currentLevelXP / levelTargetXP) * 100));

    return (
        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm leading-none">Nível {data.level}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{data.levelName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/10">
                        <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                        <span className="text-xs font-bold">{data.streak} dias</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground italic">
                        <span>{currentLevelXP} / {levelTargetXP} XP</span>
                        <span className="text-primary">+{data.pointsToday} XP hoje</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-primary/10" />
                </div>
            </CardContent>
        </Card>
    );
}
