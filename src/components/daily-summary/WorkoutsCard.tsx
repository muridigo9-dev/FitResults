import { Dumbbell, Clock, CheckCircle2, Circle, ChevronRight, Plus, Trash2, Edit3, Save, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerClose,
    DrawerFooter
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

interface WorkoutsCardProps {
    data: any[];
}

function WorkoutDetailDrawer({ workout, onClose }: { workout: any; onClose: () => void }) {
    const { t } = useI18n();
    const [isEditing, setIsEditing] = useState(false);
    const [editedExercises, setEditedExercises] = useState(workout.exercises);

    const handleUpdateSet = (exerciseIdx: number, setIdx: number, field: string, value: string) => {
        const newExercises = [...editedExercises];
        const numValue = value === "" ? 0 : parseFloat(value.replace(",", "."));

        newExercises[exerciseIdx].sets[setIdx] = {
            ...newExercises[exerciseIdx].sets[setIdx],
            [field]: isNaN(numValue) ? 0 : numValue
        };
        setEditedExercises(newExercises);
    };

    const handleSave = async () => {
        try {
            // Update each modified set in the database
            for (const exercise of editedExercises) {
                for (const set of exercise.sets) {
                    await (window as any).updateWorkoutSet?.(set.id, {
                        actual_reps: set.reps,
                        actual_weight_kg: set.weight
                    });
                }
            }
            setIsEditing(false);
            toast.success(t("workouts.toast.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("summary.errors.saveChanges"));
        }
    };

    const handleDelete = () => {
        if (confirm(t("summary.workouts.deleteConfirm"))) {
            (window as any).removeWorkoutLog?.(workout.id);
            onClose();
        }
    };

    return (
        <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left border-b pb-4 px-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <DrawerTitle className="text-xl font-black flex items-center gap-2">
                            <Dumbbell className="h-6 w-6 text-primary" />
                            {workout.title}
                        </DrawerTitle>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                            {workout.duration} {t("units.minutes").toUpperCase()} • {workout.calories || 0} {t("units.kcal").toUpperCase()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-full transition-all",
                                isEditing ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                            )}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Edit3 className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </DrawerHeader>

            <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-4">
                    {editedExercises.map((exercise: any, exIdx: number) => (
                        <div key={exercise.id} className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-[10px] font-black">
                                        {exIdx + 1}
                                    </span>
                                    <h4 className="text-sm font-black uppercase tracking-tight">{exercise.name}</h4>
                                </div>
                                {exercise.completed && (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none text-[8px] font-black h-5">
                                        {t("states.completed").toUpperCase()}
                                    </Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {exercise.sets && exercise.sets.map((set: any, sIdx: number) => (
                                    <div
                                        key={set.id || sIdx}
                                        className="flex items-center justify-between bg-background/50 p-2.5 rounded-xl border border-border/30 group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-muted-foreground w-4 italic">S{set.set_number}</span>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="w-10 bg-muted/50 border-b-2 border-primary/50 text-center text-sm font-black focus:bg-muted outline-none rounded-t"
                                                                value={set.reps}
                                                                onChange={(e) => handleUpdateSet(exIdx, sIdx, 'reps', e.target.value)}
                                                            />
                                                            <span className="text-[8px] font-black text-muted-foreground uppercase">Reps</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-black">{set.reps} <span className="text-[10px] text-muted-foreground font-normal">reps</span></span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="w-12 bg-muted/50 border-b-2 border-primary/50 text-center text-sm font-black focus:bg-muted outline-none rounded-t"
                                                                value={set.weight}
                                                                onChange={(e) => handleUpdateSet(exIdx, sIdx, 'weight', e.target.value)}
                                                            />
                                                            <span className="text-[8px] font-black text-muted-foreground uppercase">Kg</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-black">{set.weight} <span className="text-[10px] text-muted-foreground font-normal">kg</span></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {set.is_completed ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500/10" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground/30" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <DrawerFooter className="px-6 pb-8">
                {isEditing ? (
                    <Button
                        className="w-full h-14 bg-primary text-primary-foreground font-black text-base rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
                        onClick={handleSave}
                    >
                        <Save className="h-5 w-5" />
                        {t("actions.saveChanges").toUpperCase()}
                    </Button>
                ) : (
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-muted-foreground border-2 hover:bg-muted/50">
                            VOLTAR
                        </Button>
                    </DrawerClose>
                )}
            </DrawerFooter>
        </DrawerContent>
    );
}

export function WorkoutsCard({ data }: WorkoutsCardProps) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

    if (data.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-muted/5 border-primary/10">
                <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                        <Dumbbell className="h-8 w-8 text-primary opacity-30" />
                    </div>
                    <p className="text-sm text-foreground font-bold italic">Nenhum treino realizado ainda hoje.</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1 max-w-[200px]">Complete seu primeiro treino para começar a registrar sua evolução!</p>
                    <Button
                        variant="link"
                        size="sm"
                        className="text-primary mt-4 font-black uppercase text-[10px] tracking-widest"
                        onClick={() => navigate("/workouts")}
                    >
                        Ver treinos sugeridos
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Sort by started_at DESC
    const sortedData = [...data].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary fill-primary/20" />
                        {t("summary.workouts.title")}
                    </CardTitle>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        {data.length} {data.length === 1 ? 'REGISTRO' : 'REGISTROS'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                    {sortedData.map((workout) => (
                        <div
                            key={workout.id}
                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                    workout.status === "completed"
                                        ? "bg-green-500/10 border-green-500/20 text-green-600"
                                        : "bg-orange-500/10 border-orange-500/20 text-orange-600"
                                )}>
                                    <Dumbbell className="h-5 w-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black truncate tracking-tight">{workout.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {workout.duration} min
                                        </div>
                                        {workout.calories > 0 && (
                                            <div className="flex items-center text-[10px] text-primary font-black uppercase tracking-tighter">
                                                <Zap className="h-3 w-3 mr-1 fill-primary/20" />
                                                {workout.calories} kcal
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Drawer
                                open={openDrawerId === workout.id}
                                onOpenChange={(open) => setOpenDrawerId(open ? workout.id : null)}
                            >
                                <DrawerTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] font-black h-8 ml-2 shrink-0 bg-background/50 border border-border/50 px-3 rounded-xl hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all uppercase tracking-widest"
                                    >
                                        VER <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                </DrawerTrigger>
                                <WorkoutDetailDrawer
                                    workout={workout}
                                    onClose={() => setOpenDrawerId(null)}
                                />
                            </Drawer>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
