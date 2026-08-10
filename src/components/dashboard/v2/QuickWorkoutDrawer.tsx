import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Workout } from "@/types/content";
import { Check, Dumbbell, Timer, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/useI18n";

interface QuickWorkoutDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workouts: Workout[];
    completedWorkouts: string[]; // IDs
    onToggleWorkout: (workoutId: string, workoutName: string) => void;
}

export function QuickWorkoutDrawer({ open, onOpenChange, workouts, completedWorkouts, onToggleWorkout }: QuickWorkoutDrawerProps) {
    const isMobile = useIsMobile();
    const { t } = useI18n();
    const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
    const [initialSelections, setInitialSelections] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            const currentSelections = new Set(completedWorkouts);
            setPendingSelections(currentSelections);
            setInitialSelections(currentSelections);
        }
    }, [open, completedWorkouts]);

    const togglePending = (workoutId: string) => {
        setPendingSelections(prev => {
            const next = new Set(prev);
            if (next.has(workoutId)) {
                next.delete(workoutId);
            } else {
                next.add(workoutId);
            }
            return next;
        });
    };

    const handleSave = () => {
        const added = [...pendingSelections].filter(id => !initialSelections.has(id));
        const removed = [...initialSelections].filter(id => !pendingSelections.has(id));

        [...added, ...removed].forEach(workoutId => {
            const workout = workouts.find(w => w.id === workoutId);
            if (workout) {
                onToggleWorkout(workoutId, workout.title);
            }
        });

        onOpenChange(false);

        if (added.length > 0 || removed.length > 0) {
            toast.success(t("dashboard.workoutsUpdated"), {
                description: t("dashboard.workoutsMarked", { count: pendingSelections.size }),
            });
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "strength": return t("workouts.strength");
            case "cardio": return t("workouts.cardio");
            case "flexibility": return t("workouts.flexibility");
            case "hiit": return "HIIT";
            default: return category;
        }
    };

    const renderContent = () => (
        <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-[300px] max-h-[60vh]">
            {workouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    {t("dashboard.noWorkoutsConfigured")}
                </div>
            ) : (
                workouts.map((workout) => {
                    const selected = pendingSelections.has(workout.id);
                    const estimatedTime = workout.exercises.reduce(
                        (acc, ex) => acc + (ex.sets * (ex.reps * 3 + ex.restSeconds)) / 60, 0
                    );

                    return (
                        <Card
                            key={workout.id}
                            className={cn(
                                "transition-all duration-200 cursor-pointer border",
                                selected && "ring-2 ring-success border-success/50 bg-success/5"
                            )}
                            onClick={() => togglePending(workout.id)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                        selected ? "bg-success text-success-foreground" : "bg-muted"
                                    )}>
                                        {selected ? <Check className="h-5 w-5" /> : <Dumbbell className="h-4 w-4 text-muted-foreground" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                {getCategoryLabel(workout.category)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-foreground truncate">{workout.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Timer className="h-3 w-3" />
                                                ~{Math.round(estimatedTime)} min
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Target className="h-3 w-3" />
                                                {workout.exercises.length} ex
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );

    const renderFooter = () => (
        <div className="flex flex-row gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("actions.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
                {t("actions.save")}
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-md h-[80vh] flex flex-col">
                        <DrawerHeader className="mb-2">
                            <DrawerTitle className="flex items-center gap-2">
                                <Dumbbell className="h-5 w-5 text-primary" />
                                {t("dashboard.workoutLog")}
                            </DrawerTitle>
                        </DrawerHeader>

                        {renderContent()}

                        <DrawerFooter className="pb-8 border-t mt-auto">
                            {renderFooter()}
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-xl border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Dumbbell className="h-6 w-6 text-primary" />
                        {t("dashboard.workoutLog")}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-2">
                    {renderContent()}
                </div>

                <DialogFooter className="p-6 bg-muted/30">
                    {renderFooter()}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
