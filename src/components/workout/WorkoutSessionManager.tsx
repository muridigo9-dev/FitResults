import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Circle,
    ChevronLeft,
    ChevronRight,
    Timer,
    Weight,
    ThumbsUp,
    ThumbsDown,
    X,
    Trophy,
    ArrowRight
} from "lucide-react";
import { useWorkoutExecution } from "@/hooks/useWorkoutExecution";
import { Workout, Exercise } from "@/types/content";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SessionExerciseInstance extends Exercise {
    completedSets: { load: number; reps: number; rpe?: number }[];
    sentiment?: 'like' | 'dislike' | 'neutral';
    isCompleted: boolean;
}

interface WorkoutSessionManagerProps {
    workout: Workout;
    onClose: () => void;
    sessionId: string;
}

export function WorkoutSessionManager({ workout, onClose, sessionId }: WorkoutSessionManagerProps) {
    const { logSet, updateFeedback, finishSession, isFinishing } = useWorkoutExecution();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [exercises, setExercises] = useState<SessionExerciseInstance[]>(
        workout.exercises.map(ex => ({
            ...ex,
            completedSets: [],
            isCompleted: false
        }))
    );

    const currentExercise = exercises[currentIndex];

    // Progress calculation
    const progress = useMemo(() => {
        const total = exercises.length;
        const completed = exercises.filter(e => e.isCompleted).length;
        return (completed / total) * 100;
    }, [exercises]);

    const handleLogSet = async (load: number, reps: number) => {
        if (!currentExercise) return;

        try {
            // In a real app, we would have the session_exercise_id from the DB
            // For this demo/impl, we assume the hook handles the logic or we skip DB for now
            // await logSet({ ... });

            const updated = [...exercises];
            updated[currentIndex].completedSets.push({ load, reps });
            setExercises(updated);
            toast.success("Série registrada!");
        } catch (err) {
            toast.error("Erro ao salvar série");
        }
    };

    const toggleExerciseComplete = async () => {
        const updated = [...exercises];
        const newState = !updated[currentIndex].isCompleted;
        updated[currentIndex].isCompleted = newState;

        if (newState) {
            toast.success(`${currentExercise.name} finalizado!`);
            if (currentIndex < exercises.length - 1) {
                setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
            }
        }
        setExercises(updated);
    };

    const handleFinish = async () => {
        await finishSession(sessionId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <header className="px-4 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm("Deseja interromper o treino? O progresso salvo será mantido.")) {
                        onClose();
                    }
                }}>
                    <X className="h-5 w-5" />
                </Button>
                <div className="flex-1 px-8">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
                        <span>{Math.round(progress)}% Concluído</span>
                        <span>{currentIndex + 1} de {exercises.length}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-primary/10 rounded-full flex items-center gap-2 text-primary text-sm font-mono">
                        <Timer className="h-4 w-4" />
                        <span>24:15</span>
                    </div>
                </div>
            </header>

            {/* Main Execution Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {/* Exercise Card */}
                <div className="max-w-xl mx-auto space-y-6">
                    <Card className="overflow-hidden border-none shadow-2xl bg-gradient-to-b from-card to-card/50">
                        <div className="aspect-video relative">
                            <img
                                src={currentExercise.imageUrl || "/placeholder-workout.jpg"}
                                alt={currentExercise.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                                <Badge className="w-fit mb-2 bg-primary">{currentExercise.category || "Força"}</Badge>
                                <h1 className="text-3xl font-bold text-white">{currentExercise.name}</h1>
                                <p className="text-white/70 text-sm mt-2 line-clamp-2">{currentExercise.description}</p>
                            </div>
                        </div>

                        <CardContent className="p-6 space-y-6">
                            {/* Target Params */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-muted/50 p-3 rounded-xl text-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target</span>
                                    <span className="text-lg font-bold">{currentExercise.sets} Séries</span>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-xl text-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Reps</span>
                                    <span className="text-lg font-bold">{currentExercise.reps}</span>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-xl text-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Descanso</span>
                                    <span className="text-lg font-bold">{currentExercise.restSeconds}s</span>
                                </div>
                            </div>

                            {/* Logger Table */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Registros</h3>
                                <div className="space-y-2">
                                    {currentExercise.completedSets.map((set, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/10 animate-in slide-in-from-left-2 transition-all">
                                            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-1">
                                                    <Weight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-bold">{set.load}kg</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-bold">{set.reps} reps</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-background">OK</Badge>
                                        </div>
                                    ))}

                                    {/* Add New Set Form */}
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Peso"
                                                className="pl-8"
                                                id="set-load"
                                            />
                                            <Weight className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Reps"
                                                className="pl-8"
                                                id="set-reps"
                                            />
                                            <CheckCircle2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <Button onClick={() => {
                                            const load = (document.getElementById('set-load') as HTMLInputElement).value;
                                            const reps = (document.getElementById('set-reps') as HTMLInputElement).value;
                                            if (load && reps) handleLogSet(Number(load), Number(reps));
                                        }}>
                                            Salvar
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Feedback & Actions */}
                            <div className="pt-6 border-t flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Gostou desse exercício?</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={currentExercise.sentiment === 'like' ? 'default' : 'outline'}
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => {
                                                const updated = [...exercises];
                                                updated[currentIndex].sentiment = 'like';
                                                setExercises(updated);
                                            }}
                                        >
                                            <ThumbsUp className="h-4 w-4" /> Sim
                                        </Button>
                                        <Button
                                            variant={currentExercise.sentiment === 'dislike' ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => {
                                                const updated = [...exercises];
                                                updated[currentIndex].sentiment = 'dislike';
                                                setExercises(updated);
                                            }}
                                        >
                                            <ThumbsDown className="h-4 w-4" /> Não
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    className={cn("w-full gap-2 h-14 text-lg", currentExercise.isCompleted && "bg-success hover:bg-success/90")}
                                    onClick={toggleExerciseComplete}
                                >
                                    {currentExercise.isCompleted ? (
                                        <><CheckCircle2 className="h-5 w-5" /> Concluído</>
                                    ) : (
                                        <><ArrowRight className="h-5 w-5" /> Finalizar Exercício</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Navigation Footer */}
            <footer className="p-4 border-t bg-card/80 backdrop-blur-md grid grid-cols-2 gap-4 sticky bottom-0">
                <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                    className="h-12"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                {currentIndex < exercises.length - 1 ? (
                    <Button
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="h-12"
                    >
                        Próximo <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        className="h-12 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20"
                        onClick={handleFinish}
                        disabled={isFinishing}
                    >
                        <Trophy className="mr-2 h-4 w-4" /> Finalizar Treino
                    </Button>
                )}
            </footer>
        </div>
    );
}
