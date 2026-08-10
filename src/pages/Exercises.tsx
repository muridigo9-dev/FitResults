import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Using Badge as 'Pill'
import { MuscleGroupFilter } from "@/components/workout/MuscleGroupFilter";
import { StudentExerciseCard } from "@/components/exercise/StudentExerciseCard";
import { ExerciseDetailModal } from "@/components/exercise/ExerciseDetailModal";
import { useExercises } from "@/hooks/useExercises";
import { useDiary } from "@/contexts/DiaryContext";
import { AnimatedLoader } from "@/components/loaders";
import { EmptyStateReason } from "@/components/states/EmptyStateReason";
import type { MuscleGroup } from "@/types/content";
import { useI18n } from "@/hooks/useI18n";

export function ExercisesContent() {
    const { t } = useI18n();
    const { exercises, isLoading: isLoadingExercises, blockReason } = useExercises();
    const { isExerciseDone } = useDiary();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialSlideIndex, setInitialSlideIndex] = useState(0);

    // Filters
    const filteredExercises = useMemo(() => {
        return exercises.filter(ex => {
            // 1. Muscle Group (via Stories)
            if (selectedMuscleGroup) {
                if (ex.primaryMuscleGroupId !== selectedMuscleGroup.id) {
                    return false;
                }
            }

            // 2. Difficulty
            if (difficultyFilter && ex.difficulty !== difficultyFilter) {
                return false;
            }

            // 3. Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return ex.name.toLowerCase().includes(query) ||
                    ex.primaryMuscleGroup?.name?.toLowerCase().includes(query);
            }

            return true;
        });
    }, [exercises, selectedMuscleGroup, difficultyFilter, searchQuery]);

    // Handlers
    const handleCardClick = (index: number) => {
        setInitialSlideIndex(index);
        setIsModalOpen(true);
    };

    const toggleDifficulty = (level: string) => {
        setDifficultyFilter(prev => prev === level ? null : level);
    };

    if (isLoadingExercises) {
        return (
            <AnimatedLoader type="workout" message={t("exercises.loading")} fullScreen={false} />
        );
    }

    // Blocked State
    if (blockReason) {
        return <EmptyStateReason reason={blockReason} />;
    }

    return (
        <div className="pb-24"> {/* Extra padding for bottom spacing */}

            {/* HEADER & STORIES */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 space-y-4 pt-4 pb-2 border-b">
                <div className="container px-4">
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold">{t("exercises.explore")}</h1>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("exercises.searchPlaceholder")}
                                className="pl-10 bg-muted/50 border-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {(searchQuery || selectedMuscleGroup || difficultyFilter) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedMuscleGroup(null);
                                    setDifficultyFilter(null);
                                }}
                                className="px-2 text-muted-foreground hover:text-foreground shrink-0"
                            >
                                {t("exercises.clear")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stories Filter - Muscle Groups */}
                <div className="pl-4">
                    <MuscleGroupFilter
                        selectedId={selectedMuscleGroup?.id}
                        onSelect={setSelectedMuscleGroup}
                        showAll={true}
                    />
                </div>

                {/* Quick Filters - Pills */}
                <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-2">
                    {["beginner", "intermediate", "advanced"].map(level => (
                        <Button
                            key={level}
                            variant={difficultyFilter === level ? "default" : "outline"}
                            size="sm"
                            className="rounded-full h-8 text-xs capitalize"
                            onClick={() => toggleDifficulty(level)}
                        >
                            {{
                                beginner: t("exercises.beginner"),
                                intermediate: t("exercises.intermediate"),
                                advanced: t("exercises.advanced")
                            }[level]}
                        </Button>
                    ))}
                </div>
            </div>

            {/* EXERCISES GRID */}
            <div className="container px-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                        {filteredExercises.length} {t("exercises.found")}
                        {selectedMuscleGroup && ` ${t("exercises.for")} ${selectedMuscleGroup.name}`}
                    </p>
                </div>

                {filteredExercises.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="text-4xl">🔍</div>
                        <h3 className="font-semibold text-lg">{t("exercises.notFound")}</h3>
                        <p className="text-muted-foreground text-sm">{t("exercises.notFoundDesc")}</p>
                        <Button variant="link" onClick={() => {
                            setSelectedMuscleGroup(null);
                            setDifficultyFilter(null);
                            setSearchQuery("");
                        }}>
                            {t("exercises.clearAll")}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredExercises.map((exercise, index) => (
                            <StudentExerciseCard
                                key={exercise.id}
                                exercise={exercise}
                                onClick={() => handleCardClick(index)}
                                isDone={isExerciseDone(exercise.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* IMMERSIVE MODAL */}
            <ExerciseDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                exercises={filteredExercises}
                initialIndex={initialSlideIndex}
            />

        </div>
    );
}

export default function Exercises() {
    return (
        <AppLayout>
            <ExercisesContent />
        </AppLayout>
    );
}
