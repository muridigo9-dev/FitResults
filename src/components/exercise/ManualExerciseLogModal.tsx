import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Copy, Repeat } from "lucide-react";
import type { Exercise } from "@/types/content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ManualExerciseLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ManualLogData) => void;
    exercise: Exercise;
}

export interface ManualLogData {
    sets: number;
    type: 'reps' | 'time';
    details: {
        setNumber: number;
        reps?: number;
        weight?: number;
        duration?: number;
    }[];
}

export function ManualExerciseLogModal({ isOpen, onClose, onSave, exercise }: ManualExerciseLogModalProps) {
    const [type, setType] = useState<'reps' | 'time'>('reps');
    const [setsCount, setSetsCount] = useState(3);
    const [inputValue, setInputValue] = useState("3");

    // State to hold details for each set
    const [setDetails, setSetDetails] = useState<{ reps: number, weight: number, duration: number }[]>([]);

    // Initialize defaults based on exercise type if available
    useEffect(() => {
        if (isOpen) {
            const defaultSets = exercise.defaultSets || 3;
            setSetsCount(defaultSets);
            setInputValue(defaultSets.toString());

            let initialType: 'reps' | 'time' = 'reps';
            let initialReps = 10;
            let initialDuration = 60;

            if (exercise.executionType === 'time') {
                initialType = 'time';
                initialDuration = exercise.defaultRestSeconds || 60;
            } else {
                initialType = 'reps';
                const parsedReps = parseInt(exercise.defaultReps || "10");
                initialReps = isNaN(parsedReps) ? 10 : parsedReps;
            }

            setType(initialType);

            // Populate array
            const initialDetails = Array.from({ length: defaultSets }).map(() => ({
                reps: initialReps,
                weight: 0,
                duration: initialDuration
            }));
            setSetDetails(initialDetails);
        }
    }, [isOpen, exercise]);

    // Handle sets count change
    useEffect(() => {
        setSetDetails(prev => {
            if (setsCount > prev.length) {
                // Add new sets, copying the last one if available or using defaults
                const lastSet = prev[prev.length - 1] || { reps: 10, weight: 0, duration: 60 };
                const newSets = Array.from({ length: setsCount - prev.length }).map(() => ({ ...lastSet }));
                return [...prev, ...newSets];
            } else if (setsCount < prev.length) {
                // Remove sets
                return prev.slice(0, setsCount);
            }
            return prev;
        });
    }, [setsCount]);

    const handleSetsInputChange = (value: string) => {
        setInputValue(value);
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
            setSetsCount(parsed);
        }
    };

    const handleSetsInputBlur = () => {
        if (!inputValue || isNaN(parseInt(inputValue)) || parseInt(inputValue) < 1) {
            setInputValue(setsCount.toString());
        }
    };

    const updateSetDetail = (index: number, field: 'reps' | 'weight' | 'duration', value: number) => {
        setSetDetails(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const copyToAll = (index: number) => {
        const source = setDetails[index];
        setSetDetails(prev => prev.map(item => ({ ...source })));
    };

    const handleSave = () => {
        onSave({
            sets: setsCount,
            type,
            details: setDetails.map((d, i) => ({
                setNumber: i + 1,
                reps: type === 'reps' ? d.reps : undefined,
                weight: d.weight > 0 ? d.weight : undefined,
                duration: type === 'time' ? d.duration : undefined
            }))
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md z-[150] flex flex-col max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>Registrar {exercise.name}</DialogTitle>
                    <DialogDescription className="sr-only">Preencha os detalhes das séries realizadas</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4 flex-1 overflow-hidden min-h-0">
                    {/* Controls Header */}
                    <div className="space-y-4 shrink-0 px-1">
                        <Tabs value={type} onValueChange={(v) => setType(v as 'reps' | 'time')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="reps">Repetições</TabsTrigger>
                                <TabsTrigger value="time">Tempo</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="sets">Total de Séries</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="sets"
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => handleSetsInputChange(e.target.value)}
                                    onBlur={handleSetsInputBlur}
                                    className="w-20 text-center"
                                    min={1}
                                    max={20}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Sets List */}
                    <div className="flex-1 overflow-y-auto pr-2 relative">
                        <div className="space-y-3 pb-2">
                            {setDetails.map((detail, index) => (
                                <div key={index} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <div className="flex flex-col items-center justify-center bg-background border rounded-md h-10 w-10 shrink-0">
                                        <span className="text-xs font-medium text-muted-foreground">Série</span>
                                        <span className="text-sm font-bold">{index + 1}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 flex-1">
                                        {type === 'reps' ? (
                                            <>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Reps</Label>
                                                    <Input
                                                        type="number"
                                                        value={detail.reps}
                                                        onChange={(e) => updateSetDetail(index, 'reps', parseInt(e.target.value) || 0)}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Carga (kg)</Label>
                                                    <Input
                                                        type="number"
                                                        value={detail.weight || ''}
                                                        onChange={(e) => updateSetDetail(index, 'weight', parseFloat(e.target.value) || 0)}
                                                        className="h-8"
                                                        placeholder="0"
                                                        step={0.5}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-2 space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Tempo (segundos)</Label>
                                                <Input
                                                    type="number"
                                                    value={detail.duration}
                                                    onChange={(e) => updateSetDetail(index, 'duration', parseInt(e.target.value) || 0)}
                                                    className="h-8"
                                                    step={5}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Copy to all button (only for first row) */}
                                    {index === 0 && setsCount > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                                            onClick={() => copyToAll(0)}
                                            title="Copiar para todas as séries"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>
                        <Check className="w-4 h-4 mr-2" />
                        Salvar Histórico
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
