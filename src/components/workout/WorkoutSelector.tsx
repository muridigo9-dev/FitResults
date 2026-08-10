import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, Dumbbell, ChevronRight, Info } from "lucide-react";
import { useWorkoutExecution } from "@/hooks/useWorkoutExecution";
import { Workout } from "@/types/content";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkoutSelectorProps {
    userId: string;
    availableWorkouts: Workout[];
    onStart: (workout: Workout) => void;
}

export function WorkoutSelector({ userId, availableWorkouts, onStart }: WorkoutSelectorProps) {
    const { fetchSuggestedWorkout } = useWorkoutExecution();
    const [suggestion, setSuggestion] = useState<{ workout: Workout; notes?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSuggestedWorkout(userId).then(res => {
            setSuggestion(res as any);
            setLoading(false);
        });
    }, [userId]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sugestão do Dia */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Treino de Hoje
                </h2>

                {loading ? (
                    <Skeleton className="h-48 w-full rounded-xl" />
                ) : suggestion ? (
                    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 hover:border-primary/40 transition-all group">
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                                <img
                                    src={suggestion.workout.imageUrl || "/placeholder-workout.jpg"}
                                    alt={suggestion.workout.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                    <Badge variant="soft" className="bg-white/20 backdrop-blur-md text-white border-0">
                                        Sugerido
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="flex-1 p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <CardTitle className="text-2xl">{suggestion.workout.title}</CardTitle>
                                        <Badge variant="outline">{suggestion.workout.category}</Badge>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-2 mb-4">
                                        {suggestion.workout.description}
                                    </p>
                                    {suggestion.notes && (
                                        <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-md mb-4 flex gap-2 items-start text-sm">
                                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <p className="text-primary-foreground/80 italic font-medium">{suggestion.notes}</p>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="lg"
                                    className="w-full md:w-auto h-12 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                                    onClick={() => onStart(suggestion.workout)}
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Iniciar Treino Prescrito
                                </Button>
                            </CardContent>
                        </div>
                    </Card>
                ) : (
                    <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center bg-muted/30">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="mb-2">Nenhum treino prescrito para hoje</CardTitle>
                        <p className="text-muted-foreground mb-6">Que tal escolher outro treino da sua biblioteca?</p>
                    </Card>
                )}
            </section>

            {/* Outras Opções */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    Sua Biblioteca de Treinos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableWorkouts
                        .filter(w => w.id !== suggestion?.workout.id)
                        .map(workout => (
                            <Card
                                key={workout.id}
                                className="hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 duration-300"
                                onClick={() => onStart(workout)}
                            >
                                <div className="aspect-video relative overflow-hidden rounded-t-xl">
                                    <img
                                        src={workout.imageUrl || "/placeholder-workout.jpg"}
                                        alt={workout.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                    />
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="soft" className="bg-black/50 backdrop-blur-md text-white border-0">
                                            {workout.category}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{workout.title}</h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            {workout.exercises.length} exercícios
                                        </p>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </section>
        </div>
    );
}
