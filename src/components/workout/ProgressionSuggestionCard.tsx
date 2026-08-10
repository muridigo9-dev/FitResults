
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Check, X, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateProgression } from "@/lib/progression";
import type { ProgressionSuggestion } from "@/lib/progression";
import type { SessionExercise } from "@/types/workout";

interface ProgressionSuggestionCardProps {
    history: SessionExercise[];
    currentExerciseName: string;
    onApply: (suggestion: ProgressionSuggestion) => void;
    onIgnore: () => void;
    className?: string;
}

export function ProgressionSuggestionCard({
    history,
    currentExerciseName,
    onApply,
    onIgnore,
    className
}: ProgressionSuggestionCardProps) {
    const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);

    useEffect(() => {
        const result = calculateProgression(history);
        setSuggestion(result);
    }, [history]);

    if (!suggestion || suggestion.type === 'maintain') return null;

    const getIcon = () => {
        switch (suggestion.type) {
            case 'linear':
            case 'double_progression':
                return <TrendingUp className="h-5 w-5 text-green-500" />;
            case 'deload':
                return <TrendingDown className="h-5 w-5 text-orange-500" />;
            default:
                return <Minus className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getBadge = () => {
        switch (suggestion.type) {
            case 'linear':
                return <Badge className="bg-green-500 hover:bg-green-600">Aumentar Carga</Badge>;
            case 'double_progression':
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Aumentar Reps</Badge>;
            case 'deload':
                return <Badge variant="outline" className="border-orange-500 text-orange-600">Deload Recomendado</Badge>;
            default:
                return null;
        }
    };

    const ref = suggestion.referenceExecution;

    return (
        <Card className={cn("border-l-4 shadow-sm animate-in fade-in slide-in-from-top-2",
            suggestion.type === 'deload'
                ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
            className
        )}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            {getIcon()}
                            <span className="font-semibold text-sm text-foreground">Sugestão de Progressão</span>
                            {getBadge()}
                        </div>

                        <p className="text-sm font-medium leading-relaxed text-foreground/90">
                            {suggestion.reason}
                        </p>

                        {/* Suggestion Details */}
                        <div className="flex items-center gap-4 text-sm mt-2 p-3 bg-background/60 dark:bg-background/40 rounded-md border border-border/50 shadow-sm backdrop-blur-sm">
                            {suggestion.suggestedWeightKg !== undefined && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peso</span>
                                    <span className="font-bold flex items-center gap-1 text-foreground text-base">
                                        {ref.weightKg}kg <TrendingUp className="h-3 w-3 text-muted-foreground" /> {suggestion.suggestedWeightKg}kg
                                    </span>
                                </div>
                            )}
                            {suggestion.suggestedReps !== undefined && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reps</span>
                                    <span className="font-bold flex items-center gap-1 text-foreground text-base">
                                        {ref.reps} <TrendingUp className="h-3 w-3 text-muted-foreground" /> {suggestion.suggestedReps}
                                    </span>
                                </div>
                            )}
                            {suggestion.suggestedDuration !== undefined && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tempo</span>
                                    <span className="font-bold flex items-center gap-1 text-foreground text-base">
                                        {ref.duration}s <TrendingUp className="h-3 w-3 text-muted-foreground" /> {suggestion.suggestedDuration}s
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Reference */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 font-medium">
                            <History className="h-3 w-3" />
                            <span className="opacity-90">Última: <strong className="text-foreground">{ref.weightKg}kg x {ref.reps}</strong> (Mood: Normal)</span>
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-2 mt-3 justify-end">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                        onClick={onIgnore}
                    >
                        Ignorar
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 px-4 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        onClick={() => onApply(suggestion)}
                    >
                        <Check className="h-3 w-3 mr-1.5" />
                        Aplicar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
