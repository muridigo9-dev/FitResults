import { Droplets, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WaterCardProps {
    current: number;
    goal: number;
    onAddClick?: () => void;
}

export function WaterCard({ current, goal, onAddClick }: WaterCardProps) {

    // Ensure goal is at least 1 to avoid division by zero
    const effectiveGoal = goal || 2000;
    const percentage = Math.min(100, (current / effectiveGoal) * 100);

    return (
        <Card className="overflow-hidden border-blue-500/10 bg-blue-500/[0.02] shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Droplets className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Hidratação</h3>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Meta Diária</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 rounded-full p-0 text-blue-500 hover:bg-blue-500/10 active:scale-95 transition-all bg-blue-500/5 border border-blue-500/10"
                        onClick={onAddClick}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-end justify-between mb-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-600">{current}</span>
                        <span className="text-xs text-muted-foreground font-bold">/ {effectiveGoal}ml</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600/80">{Math.round(percentage)}%</span>
                </div>

                <div className="relative h-2.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
