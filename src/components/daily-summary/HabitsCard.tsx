import { Target, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HabitsCardProps {
    data: any[];
}

export function HabitsCard({ data }: HabitsCardProps) {
    if (data.length === 0) return null;

    const completed = data.filter(h => h.completed).length;
    const total = data.length;
    const percentage = Math.round((completed / total) * 100);

    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        Hábitos Diários
                    </CardTitle>
                    <span className="text-xs font-bold text-blue-600">
                        {completed}/{total}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {data.map((habit) => (
                        <div
                            key={habit.id}
                            className={cn(
                                "flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl w-20 transition-all",
                                habit.completed
                                    ? "bg-blue-500/10 border border-blue-500/20"
                                    : "bg-muted/40 border border-border/50 opacity-60"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-sm border",
                                habit.completed ? "bg-blue-500 text-white border-blue-600" : "bg-background border-border"
                            )}>
                                {habit.icon || "✨"}
                            </div>
                            <span className="text-[10px] font-bold text-center truncate w-full leading-tight uppercase tracking-tighter">
                                {habit.name}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
