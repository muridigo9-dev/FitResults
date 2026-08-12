import { Play, CheckCircle2, Dumbbell, Signal, SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExerciseMedia } from "./ExerciseMedia";
import type { Exercise } from "@/types/content";

interface StudentExerciseCardProps {
    exercise: Exercise;
    onClick: () => void;
    isDone?: boolean;
}

export function StudentExerciseCard({ exercise, onClick, isDone }: StudentExerciseCardProps) {
    // Map difficulty to labels and colors
    const difficultyConfig = {
        beginner: {
            label: "Iniciante",
            color: "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
            icon: SignalLow
        },
        intermediate: {
            label: "Intermediário",
            color: "bg-yellow-500/20 text-yellow-100 border-yellow-500/30",
            icon: SignalMedium
        },
        advanced: {
            label: "Avançado",
            color: "bg-red-500/20 text-red-100 border-red-500/30",
            icon: SignalHigh
        },
    };

    const difficulty = difficultyConfig[exercise.difficulty as keyof typeof difficultyConfig] || difficultyConfig.intermediate;
    const DifficultyIcon = difficulty.icon;

    return (
        <Card
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden aspect-[3/4] border-0 cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 ring-1 ring-white/10",
                "active:scale-95 rounded-2xl"
            )}
        >
            {/* Image/Video Background */}
            <div className="absolute inset-0 bg-background/80">
                <ExerciseMedia
                    exercise={exercise}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    fallback={
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                    }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
            </div>

            {/* Top Badges */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
                <Badge
                    variant="outline"
                    className={cn(
                        "backdrop-blur-md border shadow-sm flex items-center gap-1.5 px-2.5 py-1",
                        difficulty.color
                    )}
                >
                    <DifficultyIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium tracking-wide">{difficulty.label}</span>
                </Badge>

                {isDone && (
                    <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg shadow-green-500/20 animate-in fade-in zoom-in">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 p-4 flex flex-col justify-end">
                <div className="transform transition-transform duration-300 translate-y-2 group-hover:translate-y-0">

                    {/* Muscle Group & Metadata */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {exercise.primaryMuscleGroup && (
                            <Badge variant="secondary" className="bg-primary/90 hover:bg-primary text-primary-foreground border-none text-[10px] uppercase font-bold tracking-wider space-x-1">
                                <Dumbbell className="w-3 h-3" />
                                <span>{exercise.primaryMuscleGroup.name}</span>
                            </Badge>
                        )}
                        {!exercise.primaryMuscleGroup && (
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                Geral
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight group-hover:text-primary-foreground/90 transition-colors">
                        {exercise.name}
                    </h3>

                    <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100">
                        <p className="text-xs text-white/70 line-clamp-2 mt-1 font-light">
                            {exercise.description || "Clique para ver os detalhes, vídeos e instruções de execução."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Play Button Overlay (appears on hover) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
            </div>
        </Card>
    );
}
