import { useState } from "react";
import { ChevronDown, ChevronUp, Check, SkipForward, Info, Link as LinkIcon, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SetTracker } from "./SetTracker";
import { QuickFeedback, MoodSelector } from "./ExerciseFeedback";
import { InlineRestTimer } from "./RestTimer";
import { ProgressionSuggestionCard } from "./ProgressionSuggestionCard";
import { ExerciseHistory } from "@/components/exercise/ExerciseHistory";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { useLastExerciseLog } from "@/hooks/useWorkoutSession";
import type { SessionExercise, ExerciseFeedbackMood, LikeDislike } from "@/types/workout";
import { EQUIPMENT_LABELS, DIFFICULTY_LABELS } from "@/types/workout";
import { resolveImageUrl } from "@/hooks/useStorageUpload";

interface WorkoutExecutionCardProps {
  sessionExercise: SessionExercise;
  index: number;
  isActive: boolean;
  isRestActive?: boolean;
  restSeconds?: number;
  onComplete: (feedback?: {
    mood?: ExerciseFeedbackMood;
    likeDislike?: LikeDislike;
  }) => void;
  onSkip: (reason?: string) => void;
  onCompleteSet: (data: {
    setNumber: number;
    actualReps?: number;
    actualWeightKg?: number;
    rpe?: number;
  }) => void;
  onStartRest?: (seconds: number) => void;
  onRestComplete?: () => void;
  className?: string;
  isSupersetSequence?: boolean;
}

export function WorkoutExecutionCard({
  sessionExercise,
  index,
  isActive,
  isRestActive,
  restSeconds = 60,
  onComplete,
  onSkip,
  onCompleteSet,
  onStartRest,
  onRestComplete,
  className,
  isSupersetSequence = false,
}: WorkoutExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [showInstructions, setShowInstructions] = useState(false);
  const [mood, setMood] = useState<ExerciseFeedbackMood | undefined>();
  const [likeDislike, setLikeDislike] = useState<LikeDislike | undefined>();
  const [suggestionValues, setSuggestionValues] = useState<{ weight?: number, reps?: number } | null>(null);
  const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

  const exercise = sessionExercise.exercise;
  const { data: history } = useExerciseHistory(exercise?.id);
  const { data: lastLog } = useLastExerciseLog(exercise?.id, sessionExercise.sessionId, isExpanded);

  const isCompleted = sessionExercise.isCompleted;
  const completedSets = sessionExercise.sets.filter(s => s.isCompleted).length;
  const totalSets = exercise?.defaultSets || 3;

  // Auto-expand when active
  if (isActive && !isExpanded) {
    setIsExpanded(true);
  }

  const isFullyCompleted = completedSets >= totalSets;
  const isPartiallyCompleted = isCompleted && completedSets > 0 && completedSets < totalSets;
  const isSkipped = isCompleted && completedSets === 0;

  const handleComplete = () => {
    onComplete({ mood, likeDislike });
  };

  if (!exercise) return null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        isActive && "ring-2 ring-primary shadow-lg",
        isCompleted && "opacity-70",
        className
      )}
    >
      {/* Header */}
      <button
        className="w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Index / Status */}
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full shrink-0 transition-colors",
              isSkipped
                ? "bg-red-500 text-white"
                : isPartiallyCompleted
                  ? "bg-yellow-500 text-white"
                  : isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? (
              isSkipped ? (
                <SkipForward className="h-5 w-5" />
              ) : (
                <Check className="h-5 w-5" />
              )
            ) : (
              <span className="font-bold">{index + 1}</span>
            )}
          </div>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold truncate",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {exercise.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{totalSets} séries</span>
              <span>•</span>

              {/* Reps or Time Display */}
              {exercise.executionType === 'time' ? (
                <span>{exercise.durationSeconds || 0}s</span>
              ) : (
                <span>
                  {exercise.repsMode === 'variable'
                    ? (exercise.repsList && exercise.repsList.length > 0
                      ? (exercise.repsList.length > 3
                        ? `${exercise.repsList[0]}-${exercise.repsList[exercise.repsList.length - 1]}`
                        : exercise.repsList.join('/'))
                      : "Var")
                    : exercise.reps || exercise.defaultReps} reps
                </span>
              )}

              {isSupersetSequence ? (
                <>
                  <span>•</span>
                  <span className="text-orange-500 font-medium">Sem descanso</span>
                </>
              ) : exercise.defaultRestSeconds && (
                <>
                  <span>•</span>
                  <span>{exercise.defaultRestSeconds}s descanso</span>
                </>
              )}
            </div>
          </div>

          {/* Progress / Expand */}
          <div className="flex items-center gap-2">
            {/* History Button (Moved here) */}




            {/* Sets progress */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i < completedSets
                      ? (isSkipped ? "bg-red-500" : isPartiallyCompleted ? "bg-yellow-500" : "bg-green-500")
                      : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Rest timer indicator */}
            {isRestActive && (
              <InlineRestTimer
                seconds={restSeconds}
                isActive={isRestActive}
                onComplete={onRestComplete}
              />
            )}

            {/* Expand icon */}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && !isCompleted && (
        <CardContent className="pt-0 pb-4 space-y-4">
          {/* Exercise Image/GIF */}
          {/* Equipment & Difficulty */}
          <div className="flex flex-wrap gap-2">
            {exercise.equipment && exercise.equipment !== 'none' && (
              <Badge variant="secondary">
                {EQUIPMENT_LABELS[exercise.equipment]}
              </Badge>
            )}
            {exercise.difficulty && (
              <Badge variant="outline">
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </Badge>
            )}
            {exercise.isCompound && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                Composto
              </Badge>
            )}
          </div>

          {/* Instructions */}
          {/* Instructions & Media */}
          {(exercise.instructions || exercise.videoUrl || exercise.gifUrl || exercise.imageUrl) && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground justify-start h-auto py-2 px-0 hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowInstructions(!showInstructions)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  {showInstructions ? "Ocultar instruções" : "Ver instruções"}
                </Button>

                <ExerciseHistory
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                  }
                />


              </div>

              {showInstructions && (
                <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Media */}
                  {(exercise.videoUrl || exercise.gifUrl || exercise.imageUrl) && (
                    <div className="relative aspect-video sm:aspect-auto sm:h-[400px] w-full rounded-lg overflow-hidden bg-muted shadow-sm border mx-auto">
                      {exercise.videoUrl ? (
                        <video
                          src={exercise.videoUrl}
                          controls
                          className="w-full h-full object-contain bg-black"
                          poster={exercise.imageUrl || exercise.thumbnailUrl}
                        />
                      ) : (
                        <img
                          src={exercise.gifUrl || resolveImageUrl('exercises-media', exercise.imagePath, exercise.imageUrl)}
                          alt={exercise.name}
                          className="w-full h-full object-contain bg-background"
                        />
                      )}
                    </div>
                  )}

                  {/* Text */}
                  {exercise.instructions && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg leading-relaxed whitespace-pre-wrap">
                      {exercise.instructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Smart Progression Suggestion */}
          {history && history.length >= 2 && !isCompleted && !isSuggestionDismissed && (
            <ProgressionSuggestionCard
              history={history}
              currentExerciseName={exercise.name}
              onApply={(sug) => {
                setSuggestionValues({
                  weight: sug.suggestedWeightKg,
                  reps: sug.suggestedReps || sug.suggestedDuration
                });
                setIsSuggestionDismissed(true);
              }}
              onIgnore={() => {
                setIsSuggestionDismissed(true);
              }}
              className="mb-4"
            />
          )}

          {/* Set Tracker */}
          <SetTracker
            sets={sessionExercise.sets}
            plannedSets={totalSets}
            plannedReps={exercise.defaultReps}
            plannedRepsList={exercise.repsMode === 'variable' ? exercise.repsList : undefined}
            defaultRestSeconds={exercise.defaultRestSeconds}
            executionType={exercise.executionType as 'reps' | 'time'}
            suggestedValues={suggestionValues}
            lastSessionSets={lastLog?.sets.map(s => ({
              setNumber: s.set_number,
              actualWeightKg: s.actual_weight_kg,
              actualReps: s.actual_reps
            }))}
            onCompleteSet={onCompleteSet}
            onStartRest={isSupersetSequence ? undefined : onStartRest}
          />


          {/* Quick Feedback */}
          {completedSets >= totalSets && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Como foi?</span>
                <QuickFeedback
                  selected={likeDislike}
                  onSelect={setLikeDislike}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dificuldade</span>
                <MoodSelector
                  value={mood}
                  onChange={setMood}
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => onSkip()}
            >
              <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Pular
            </Button>
            <Button
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              onClick={handleComplete}
              disabled={completedSets < totalSets}
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Concluir
            </Button>
          </div>
        </CardContent>
      )
      }

      {/* Completed Summary */}
      {
        isExpanded && isCompleted && (
          <CardContent className="pt-0 pb-4">
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              isSkipped
                ? "bg-red-500/10 text-red-600"
                : isPartiallyCompleted
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-green-500/10 text-green-600"
            )}>
              <div>
                <p className="text-sm font-medium">
                  {isSkipped
                    ? "Exercício pulado"
                    : isPartiallyCompleted
                      ? "Exercício incompleto"
                      : "Exercício concluído!"
                  }
                </p>
                <p className="text-xs opacity-80">
                  {completedSets} séries realizadas
                </p>
              </div>
              {sessionExercise.mood && (
                <span className="text-2xl">
                  {sessionExercise.mood === 'very_easy' && '😊'}
                  {sessionExercise.mood === 'easy' && '🙂'}
                  {sessionExercise.mood === 'moderate' && '😐'}
                  {sessionExercise.mood === 'hard' && '😤'}
                  {sessionExercise.mood === 'very_hard' && '🥵'}
                </span>
              )}
            </div>
          </CardContent>
        )
      }
    </Card >
  );
}

// ============================================
// WORKOUT EXECUTION LIST
// ============================================

interface WorkoutExecutionListProps {
  exercises: SessionExercise[];
  currentIndex: number;
  isRestActive: boolean;
  restSeconds: number;
  onCompleteExercise: (
    sessionExerciseId: string,
    feedback?: { mood?: ExerciseFeedbackMood; likeDislike?: LikeDislike }
  ) => void;
  onSkipExercise: (sessionExerciseId: string, reason?: string) => void;
  onCompleteSet: (
    sessionExerciseId: string,
    data: {
      setNumber: number;
      actualReps?: number;
      actualWeightKg?: number;
      rpe?: number;
    }
  ) => void;
  onStartRest: (seconds: number) => void;
  onRestComplete: () => void;
  className?: string;
}

export function WorkoutExecutionList({
  exercises,
  currentIndex,
  isRestActive,
  restSeconds,
  onCompleteExercise,
  onSkipExercise,
  onCompleteSet,
  onStartRest,
  onRestComplete,
  className,
}: WorkoutExecutionListProps) {

  // Group exercises by superset
  const groupedExercises = exercises.reduce((acc, exercise) => {
    const lastGroup = acc[acc.length - 1];

    if (
      exercise.supersetId &&
      lastGroup &&
      lastGroup.type === 'superset' &&
      lastGroup.supersetId === exercise.supersetId
    ) {
      lastGroup.items.push(exercise);
    } else if (exercise.supersetId) {
      acc.push({
        type: 'superset',
        supersetId: exercise.supersetId,
        items: [exercise]
      });
    } else {
      acc.push({
        type: 'single',
        items: [exercise]
      });
    }

    return acc;
  }, [] as Array<{
    type: 'single' | 'superset',
    supersetId?: string,
    items: SessionExercise[]
  }>);

  // Helper to find original index of an item
  const getOriginalIndex = (id: string) => exercises.findIndex(e => e.id === id);

  return (
    <div className={cn("space-y-4", className)}>
      {groupedExercises.map((group, groupIndex) => {
        if (group.type === 'superset') {
          return (
            <div key={`superset-${group.supersetId}-${groupIndex}`} className="border-2 border-orange-200/50 rounded-xl p-3 bg-orange-50/10 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                  Superset
                </span>
              </div>

              <div className="space-y-3 pl-2 border-l-2 border-orange-100/50 ml-3">
                {group.items.map((se, i) => {
                  const index = getOriginalIndex(se.id);
                  const isSupersetSequence = i < group.items.length - 1; // True for all except last in group

                  return (
                    <WorkoutExecutionCard
                      key={se.id}
                      sessionExercise={se}
                      index={index}
                      isActive={index === currentIndex}
                      isRestActive={index === currentIndex && isRestActive}
                      restSeconds={restSeconds}
                      onComplete={(feedback) => onCompleteExercise(se.id, feedback)}
                      onSkip={(reason) => onSkipExercise(se.id, reason)}
                      onCompleteSet={(data) => onCompleteSet(se.id, data)}
                      onStartRest={onStartRest}
                      onRestComplete={onRestComplete}
                      isSupersetSequence={isSupersetSequence}
                      className="border shadow-sm"
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        const se = group.items[0];
        const index = getOriginalIndex(se.id);

        return (
          <WorkoutExecutionCard
            key={se.id}
            sessionExercise={se}
            index={index}
            isActive={index === currentIndex}
            isRestActive={index === currentIndex && isRestActive}
            restSeconds={restSeconds}
            onComplete={(feedback) => onCompleteExercise(se.id, feedback)}
            onSkip={(reason) => onSkipExercise(se.id, reason)}
            onCompleteSet={(data) => onCompleteSet(se.id, data)}
            onStartRest={onStartRest}
            onRestComplete={onRestComplete}
            isSupersetSequence={false}
          />
        );
      })}
    </div>
  );
}
