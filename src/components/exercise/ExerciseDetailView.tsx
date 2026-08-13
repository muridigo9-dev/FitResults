import { TrendingUp, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MarkAsDoneButton } from "./MarkAsDoneButton";
import { ExerciseHistory } from "./ExerciseHistory";
import { ManualExerciseLogModal, ManualLogData } from "./ManualExerciseLogModal";
import { ExerciseMedia } from "./ExerciseMedia";
import type { Exercise } from "@/types/content";
import { useDiary } from "@/contexts/DiaryContext";
import { useState } from "react";

interface ExerciseDetailViewProps {
    exercise: Exercise;
    onClose: () => void;
    isActive: boolean;
    showCloseButton?: boolean;
}

export function ExerciseDetailView({
    exercise,
    onClose,
    isActive,
    showCloseButton = true
}: ExerciseDetailViewProps) {
    const { logExercise, isExerciseDone } = useDiary();
    const isDone = isExerciseDone(exercise.id);
    const [showLogModal, setShowLogModal] = useState(false);

    const difficultyLabel = {
        beginner: "Iniciante",
        intermediate: "Intermediário",
        advanced: "Avançado",
    }[exercise.difficulty] || exercise.difficulty;

    const handleLog = () => {
        setShowLogModal(true);
    };

    const handleSaveLog = (data: ManualLogData) => {
        logExercise({ exercise, logData: data });
    };

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar bg-background">
            <div className="flex flex-col min-h-full">
                <div className="w-full max-w-xl mx-auto flex flex-col p-4 sm:p-6 pb-40">
                    {/* Media Area - Matches successful patterns */}
                    <div className="w-fit max-w-full mx-auto rounded-2xl overflow-hidden bg-muted relative mb-6 shadow-sm border border-border/50 shrink-0 flex items-center justify-center">
                        <ExerciseMedia
                            exercise={exercise}
                            isActive={isActive}
                            loading="eager"
                            className="max-h-[45vh] w-auto max-w-full object-contain"
                            fallback={
                                <div className="min-w-[220px] min-h-[180px] flex flex-col items-center justify-center text-muted-foreground p-8">
                                    <Dumbbell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                </div>
                            }
                        />
                    </div>

                    {/* Info & Content */}
                    <div className="flex-1 space-y-6">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    {exercise.primaryMuscleGroup?.name || exercise.category || "Geral"}
                                </Badge>
                                {exercise.difficulty && (
                                    <Badge variant="outline" className={cn(
                                        "capitalize",
                                        exercise.difficulty === 'beginner' ? "text-emerald-500" :
                                            exercise.difficulty === 'intermediate' ? "text-amber-500" :
                                                "text-rose-500"
                                    )}>
                                        {difficultyLabel}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold leading-tight">{exercise.name}</h2>
                                <ExerciseHistory
                                    exerciseId={exercise.id}
                                    exerciseName={exercise.name}
                                    trigger={
                                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                                            <TrendingUp className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-6 text-sm">
                            {exercise.description && (
                                <p className="text-muted-foreground leading-relaxed italic">
                                    "{exercise.description}"
                                </p>
                            )}

                            {exercise.instructions && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Instruções</h3>
                                    <div className="p-4 bg-muted/30 rounded-xl text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {exercise.instructions}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Action - Fixed matching WorkoutDetail */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/40 z-50">
                        <div className="max-w-xl mx-auto">
                            <MarkAsDoneButton
                                isDone={isDone}
                                onConfirm={handleLog}
                                className="w-full h-14 text-sm font-bold rounded-2xl shadow-xl shadow-primary/10"
                                skipConfirmation={true}
                            />
                        </div>
                    </div>
                </div>

                <ManualExerciseLogModal
                    isOpen={showLogModal}
                    onClose={() => setShowLogModal(false)}
                    onSave={handleSaveLog}
                    exercise={exercise}
                />
            </div>
        </div>
    );
}
