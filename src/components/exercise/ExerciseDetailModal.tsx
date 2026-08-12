import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExerciseDetailView } from "./ExerciseDetailView";
import { ExerciseMedia } from "./ExerciseMedia";
import type { Exercise } from "@/types/content";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface ExerciseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    exercises: Exercise[];
    initialIndex: number;
}

export function ExerciseDetailModal({
    isOpen,
    onClose,
    exercises,
    initialIndex
}: ExerciseDetailModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync initial index when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    if (!exercises || exercises.length === 0 || currentIndex < 0 || currentIndex >= exercises.length) {
        return null;
    }

    const currentExercise = exercises[currentIndex];

    const handleNext = () => {
        if (currentIndex < exercises.length - 1) {
            setCurrentIndex(prev => prev + 1);
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x < -100) handleNext();
        else if (info.offset.x > 100) handlePrev();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-none w-[100vw] h-[100dvh] p-0 border-0 bg-background rounded-none z-[100] overflow-hidden [&>button]:hidden">
                <div className="sr-only">
                    <DialogTitle>Detalhes do Exercício</DialogTitle>
                    <DialogDescription>Foque na execução correta</DialogDescription>
                </div>

                <div className="flex flex-col h-full bg-background overflow-hidden relative">
                    {/* Top Thumbnails Navigator - Following Recipe Pattern */}
                    <div className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border/40 py-3 px-4 z-50">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full bg-muted/60 hover:bg-muted"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                {exercises.map((ex, idx) => (
                                    <button
                                        key={ex.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-300 active:scale-95",
                                            idx === currentIndex
                                                ? "border-primary scale-110 shadow-lg shadow-primary/20 ring-4 ring-primary/10"
                                                : "border-transparent opacity-40 hover:opacity-100"
                                        )}
                                    >
                                        <ExerciseMedia
                                            exercise={ex}
                                            className="h-full w-full object-cover"
                                        />
                                        {idx === currentIndex && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="h-1.5 w-1.5 rounded-full bg-white shadow-xl animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Stage - Framer Motion Powered */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentExercise.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={handleDragEnd}
                            className="flex-1 flex flex-col h-full overflow-hidden"
                        >
                            <ExerciseDetailView
                                exercise={currentExercise}
                                onClose={onClose}
                                isActive={true}
                                showCloseButton={false}
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Desktop Pagination Indicators */}
                    <div className="absolute top-[50%] -translate-y-1/2 left-0 right-0 flex justify-between px-4 pointer-events-none opacity-20 hover:opacity-100 transition-opacity hidden lg:flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-background/50 backdrop-blur shadow-2xl pointer-events-auto"
                            disabled={currentIndex === 0}
                            onClick={handlePrev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-background/50 backdrop-blur shadow-2xl pointer-events-auto"
                            disabled={currentIndex === exercises.length - 1}
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
