import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Info, Check, Dumbbell, Timer, Zap, Flame, ChevronRight, X, VideoOff, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDiary } from "@/contexts/DiaryContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useActiveWorkout } from "@/contexts/ActiveWorkoutContext";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { useConfetti } from "@/hooks/useConfetti";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { EmptyStateReason } from "@/components/states/EmptyStateReason";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18n } from "@/hooks/useI18n";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { hasExerciseVideo } from "@/lib/exerciseMedia";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper to group exercises
interface ExerciseGroup {
  id: string; // supersetId or exerciseId
  type: 'single' | 'superset';
  exercises: any[];
}

const estimateDuration = (exercisesCount: number): number => {
  return Math.round(exercisesCount * 5 + 10);
};

export default function WorkoutDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isWorkoutLogged } = useDiary();
  const { allWorkouts, isLoading, blockReason } = useWorkouts();

  // Use Context instead of direct hooks
  const { startWorkout, cancelWorkout, activeSession } = useActiveWorkout();
  const { fireConfetti } = useConfetti();
  const [isStarting, setIsStarting] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const hasActiveSession = activeSession?.workout_id === id;
  const sessionId = hasActiveSession ? activeSession?.id : undefined;

  const {
    session,
    startExercise,
    completeSetAsync,
    completeExerciseAsync,
    completeSessionAsync,
  } = useWorkoutSession(sessionId);

  /** True once the student has pressed Start and the session is loaded. */
  const isRunning = !!sessionId && !!session;
  /** The gap between pressing Start and the session arriving, so the button
   *  never flickers back to "Start workout" under someone's finger. */
  const isPreparing = isStarting || (!!sessionId && !session);

  /**
   * The stopwatch that replaces the old form.
   *
   * Nobody is asked for sets, reps or a load. The one number worth having is
   * how long the movement actually took, and the app can watch that itself.
   */
  const exerciseStartedAtRef = useRef<number>(Date.now());
  const [exerciseSeconds, setExerciseSeconds] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [summary, setSummary] = useState<{ minutes: number; exercises: number } | null>(null);
  const hasAlignedRef = useRef(false);

  // Move hooks before conditional returns
  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", () => {
      setCurrentSlideIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Picking a workout back up lands on the first movement still to do, rather
  // than making anyone swipe past the ones they already finished.
  useEffect(() => {
    if (!isRunning || !carouselApi || hasAlignedRef.current) return;
    hasAlignedRef.current = true;
    const firstUnfinished = session.exercises.findIndex(e => !e.isCompleted);
    if (firstUnfinished > 0) carouselApi.scrollTo(firstUnfinished);
  }, [isRunning, carouselApi, session]);

  // Restart the stopwatch on every movement the student arrives at, and record
  // the arrival so the finished session knows how long each one took.
  // Deliberately not keyed on `session`: a background refetch must not reset
  // the clock under someone mid-movement.
  useEffect(() => {
    if (!isRunning) return;
    exerciseStartedAtRef.current = Date.now();
    setExerciseSeconds(0);

    const sessionExercise = session.exercises[currentSlideIndex];
    if (sessionExercise && !sessionExercise.isCompleted) {
      startExercise(sessionExercise.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, currentSlideIndex]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setExerciseSeconds(Math.floor((Date.now() - exerciseStartedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const workout = allWorkouts.find(w => w.id === id);
  const isLogged = workout ? isWorkoutLogged(workout.id) : false;

  const scrollToSlide = (index: number) => {
    carouselApi?.scrollTo(index);
  };


  const formatClock = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading state (AFTER hooks)
  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader type="workout" message="Carregando treino..." fullScreen />
      </AppLayout>
    );
  }

  // Blocked state
  if (blockReason) {
    return (
      <AppLayout>
        <EmptyStateReason reason={blockReason} />
      </AppLayout>
    );
  }

  // Not found 
  if (!workout) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Dumbbell className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("workouts.workoutNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("workouts.workoutRemovedMessage")}</p>
          <Button onClick={() => navigate("/workouts")}>{t("actions.back")}</Button>
        </div>
      </AppLayout>
    );
  }

  // Process exercises into groups (Supersets Support)
  const sortedExercises = [...(workout?.exercises || [])].sort((a, b) => a.order - b.order);
  const flatExercises = sortedExercises;

  const exerciseGroups: ExerciseGroup[] = [];
  let currentSupersetId: string | null = null;
  let currentGroup: ExerciseGroup | null = null;

  sortedExercises.forEach(ex => {
    if (ex.supersetId) {
      if (currentSupersetId === ex.supersetId && currentGroup) {
        currentGroup.exercises.push(ex);
      } else {
        currentSupersetId = ex.supersetId;
        currentGroup = {
          id: ex.supersetId,
          type: 'superset',
          exercises: [ex]
        };
        exerciseGroups.push(currentGroup);
      }
    } else {
      currentSupersetId = null;
      currentGroup = null;
      exerciseGroups.push({
        id: ex.id,
        type: 'single',
        exercises: [ex]
      });
    }
  });

  /**
   * The session row behind the slide at `index`.
   *
   * `start_workout_session` walks the workout in exercise_order, so the two
   * lists line up position for position. The identity check is a seatbelt for
   * the case where a workout was edited after the session began: rather than
   * ticking off the wrong movement, fall back to an unfinished copy of the one
   * actually on screen.
   */
  const sessionExerciseAt = (index: number) => {
    if (!session) return undefined;

    const byPosition = session.exercises[index];
    const libraryId = (flatExercises[index] as { exercise_id?: string } | undefined)?.exercise_id;
    if (!byPosition || !libraryId || byPosition.exerciseId === libraryId) return byPosition;

    return session.exercises.find(e => e.exerciseId === libraryId && !e.isCompleted) ?? byPosition;
  };

  const handleStartWorkout = async () => {
    if (!workout) return;

    // Check for conflict
    if (activeSession && activeSession.workout_id !== workout.id) {
      setShowConflictDialog(true);
      return;
    }

    try {
      setIsStarting(true);
      await startWorkout(workout.id, undefined, workout.contentOrigin === 'user');
    } catch (error) {
      console.error("Error starting workout:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleConfirmStart = async () => {
    if (!workout) return;
    try {
      setIsStarting(true);
      await cancelWorkout();
      await new Promise(resolve => setTimeout(resolve, 500));
      await startWorkout(workout.id);
      setShowConflictDialog(false);
    } catch (error) {
      console.error("Error switching workout:", error);
    } finally {
      setIsStarting(false);
    }
  };

  /**
   * Closes the session and shows the only screen that follows a workout: a
   * well done, and what it cost. No mood pickers, no star ratings.
   */
  const finishSession = async (justCompleted: number) => {
    if (!session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const exercises = session.exercises.filter(e => e.isCompleted).length + justCompleted;

    await completeSessionAsync({});
    setSummary({ minutes, exercises });
    fireConfetti();
  };

  /**
   * The whole interaction: one button, pressed when the movement is done.
   *
   * It fills in the record from what it observed - the seconds spent on a
   * timed movement, the prescribed count otherwise - marks the exercise off
   * and slides to the next one.
   */
  const handleNext = async () => {
    if (!session || isAdvancing) return;

    const sessionExercise = sessionExerciseAt(currentSlideIndex);
    const exercise = flatExercises[currentSlideIndex];
    if (!sessionExercise) return;

    const isLast = currentSlideIndex >= flatExercises.length - 1;
    let justCompleted = 0;

    setIsAdvancing(true);
    try {
      if (!sessionExercise.isCompleted) {
        const seconds = Math.max(1, Math.round((Date.now() - exerciseStartedAtRef.current) / 1000));
        await completeSetAsync({
          sessionExerciseId: sessionExercise.id,
          setNumber: 1,
          actualReps: exercise?.executionType === 'time'
            ? seconds
            : parseInt(String(exercise?.reps ?? "")) || undefined,
          actualWeightKg: 0,
        });
        await completeExerciseAsync({ sessionExerciseId: sessionExercise.id });
        justCompleted = 1;
      }

      if (isLast) {
        await finishSession(justCompleted);
      } else {
        carouselApi?.scrollTo(currentSlideIndex + 1);
      }
    } catch (error) {
      console.error("Error advancing workout:", error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleFinishEarly = async () => {
    setShowFinishDialog(false);
    setIsAdvancing(true);
    try {
      await finishSession(0);
    } catch (error) {
      console.error("Error finishing workout:", error);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Loading state (AFTER all logic prep)
  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader type="workout" message="Carregando treino..." fullScreen />
      </AppLayout>
    );
  }

  // Blocked state
  if (blockReason) {
    return (
      <AppLayout>
        <EmptyStateReason reason={blockReason} />
      </AppLayout>
    );
  }

  // Not found 
  if (!workout) {
    return (
      <AppLayout>
        <EmptyState
          type="workout"
          title={t("workouts.workoutNotFound")}
          description={t("workouts.workoutRemovedMessage")}
          action={{
            label: t("workouts.backToWorkouts"),
            onClick: () => navigate("/workouts")
          }}
        />
      </AppLayout>
    );
  }

  const duration = estimateDuration(workout.exercises.length);

  // The end of a workout: a congratulation and two numbers, nothing to fill in.
  if (summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-background p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex flex-col items-center gap-6 max-w-sm w-full"
        >
          <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center">
            <Trophy className="h-12 w-12 text-green-500" />
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">{t("execution.workoutComplete")}</h1>
            <p className="text-muted-foreground">{workout.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{summary.minutes}</div>
                <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                  {t("units.minutes")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{summary.exercises}</div>
                <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                  {t("workouts.exercises")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            size="lg"
            className="w-full h-16 text-lg"
            onClick={() => navigate("/workouts")}
          >
            {t("workouts.backToWorkouts")}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">

      {/* 1. TOP STRIP (Navigation) */}
      <div className="flex-none bg-muted/30 border-b border-border/50 py-3 overflow-x-auto no-scrollbar relative z-10">
        <div className="flex items-center px-4 gap-2">

          {/* Back Button */}
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 mr-2 rounded-full bg-background border" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Exercise Groups Strip */}
          {exerciseGroups.map((group, groupIdx) => {
            // Determine if any exercise in this group is active
            const startIndex = flatExercises.findIndex(e => e.id === group.exercises[0].id);
            const isActive = flatExercises.slice(startIndex, startIndex + group.exercises.length).some((_, i) => (startIndex + i) === currentSlideIndex);

            return (
              <div key={group.id || groupIdx} className={cn(
                "flex items-center p-1 rounded-xl transition-all duration-300",
                group.type === 'superset' ? "bg-primary/5 border border-primary/20 pr-3 gap-2" : "",
                isActive && group.type === 'single' ? "bg-primary/10 ring-1 ring-primary/30" : ""
              )}>
                {group.type === 'superset' && (
                  <div className="flex flex-col justify-center items-center px-1">
                    <span className="text-[9px] font-black tracking-tighter text-primary uppercase -rotate-90">{t("workouts.superset")}</span>
                  </div>
                )}

                {group.exercises.map((ex) => {
                  const globalIndex = flatExercises.findIndex(e => e.id === ex.id);
                  const isCurrent = globalIndex === currentSlideIndex;
                  const isDone = !!sessionExerciseAt(globalIndex)?.isCompleted;

                  return (
                    <button
                      key={ex.id}
                      onClick={() => scrollToSlide(globalIndex)}
                      className={cn(
                        "relative h-12 w-12 rounded-lg overflow-hidden transition-all duration-300 shrink-0 border-2",
                        isCurrent ? "border-primary scale-110 shadow-md z-10" : "border-transparent opacity-60 hover:opacity-100 grayscale"
                      )}
                    >
                      <ExerciseMedia
                        exercise={ex}
                        className="w-full h-full object-cover"
                      />
                      {/* Done movements read at a glance, without counting */}
                      {isDone && (
                        <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" strokeWidth={3} />
                        </div>
                      )}
                      {isCurrent && (
                        <motion.div layoutId="highlight" className="absolute inset-0 ring-2 ring-primary rounded-lg" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN STAGE (Carousel) */}
      <div className="flex-1 relative overflow-hidden bg-background">
        <Carousel setApi={setCarouselApi} className="w-full h-full">
          <CarouselContent className="h-full ml-0">
            {flatExercises.map((exercise, index) => (
              <CarouselItem key={exercise.id} className="h-full pl-0 relative">
                <div className="h-full w-full overflow-y-auto no-scrollbar">
                  <div className="w-full max-w-xl mx-auto flex flex-col p-4 sm:p-6 min-h-full pb-32">

                    {/* Status Bar */}
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <Badge variant="outline" className="text-xs font-mono">
                        {index + 1} / {flatExercises.length}
                      </Badge>
                      {exercise.supersetId && (
                        <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
                          {t("workouts.superset")}
                        </Badge>
                      )}
                    </div>

                    {/* Media. The box hugs the clip rather than imposing 16:9
                        on it: the demonstrations are shot portrait (720x1280),
                        and object-cover in a landscape frame cropped the head
                        and feet off every one of them. Matching
                        ExerciseDetailView keeps the whole movement visible
                        without letterbox bars. */}
                    <div className="w-fit max-w-full mx-auto rounded-2xl overflow-hidden bg-muted relative mb-4 shadow-sm border border-border/50 shrink-0 flex items-center justify-center">
                      <ExerciseMedia
                        exercise={exercise}
                        isActive={index === currentSlideIndex}
                        className="max-h-[45vh] lg:max-h-[50vh] w-auto max-w-full object-contain"
                        fallback={
                          <div className="min-w-[220px] min-h-[180px] flex items-center justify-center bg-muted">
                            <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        }
                      />
                      {/* Overlay Info */}
                      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium">
                        {exercise.primaryMuscleGroup?.name || t("workouts.generalMuscleGroup")}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold leading-tight mb-2">{exercise.name}</h2>
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {exercise.description || t("workouts.noDescription")}
                      </p>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm" className="px-0 text-primary h-auto mt-1">
                            <Info className="w-4 h-4 mr-1" />
                            {t("workouts.howTo")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{exercise.name}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4 space-y-4">
                            <div className="w-fit max-w-full mx-auto rounded-lg overflow-hidden bg-muted flex items-center justify-center bg-black/5">
                              {/* ExerciseMedia walks every source; a clip gets
                                  its controls so it can be watched here. */}
                              <ExerciseMedia
                                exercise={exercise}
                                controls={hasExerciseVideo(exercise)}
                                loading="eager"
                                className="max-h-[60vh] w-auto max-w-full object-contain"
                                fallback={
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center">
                                    <VideoOff className="h-7 w-7 opacity-40" />
                                    <p className="text-xs">{t("workouts.noVideo")}</p>
                                  </div>
                                }
                              />
                            </div>
                            <div className="text-sm space-y-2">
                              <p>{exercise.description || t("workouts.noInstructions")}</p>
                              {exercise.instructions && (
                                <div className="p-4 bg-muted rounded-lg text-muted-foreground whitespace-pre-wrap">
                                  {exercise.instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Metrics Grid */}
                    {(() => {
                      const hasNextInSuperset = exercise.supersetId && workout.exercises[index + 1]?.supersetId === exercise.supersetId;
                      // "1 SETS" is a tile that tells a student nothing. Show
                      // the count only when there is actually a count to keep.
                      const showSets = (exercise.sets ?? 0) > 1;

                      return (
                        <div className={cn("grid gap-3", showSets ? "grid-cols-3" : "grid-cols-2")}>
                          {showSets && (
                            <Card className="bg-muted/30 border-dashed">
                              <CardContent className="p-3 text-center">
                                <div className="text-primary mb-1 flex justify-center"><Zap className="w-5 h-5" /></div>
                                <div className="text-xl font-bold">{exercise.sets}</div>
                                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("workouts.series")}</div>
                              </CardContent>
                            </Card>
                          )}
                          <Card className="bg-muted/30 border-dashed">
                            <CardContent className="p-3 text-center">
                              <div className="text-primary mb-1 flex justify-center">
                                {exercise.executionType === 'time' ? (
                                  <Timer className="w-5 h-5" /> // Clock icon for duration
                                ) : (
                                  <Dumbbell className="w-5 h-5" />
                                )}
                              </div>
                              <div className="text-xl font-bold truncate px-1">
                                {exercise.executionType === 'time' ? (
                                  // TIME BASED
                                  `${exercise.durationSeconds || 0}s`
                                ) : (
                                  // REPS BASED
                                  exercise.repsMode === 'variable'
                                    ? (exercise.repsList && exercise.repsList.length > 0
                                      ? (exercise.repsList.length > 3
                                        ? `${exercise.repsList[0]}-${exercise.repsList[exercise.repsList.length - 1]}` // Range for long lists
                                        : exercise.repsList.join('/')) // Join slashes for short lists
                                      : "Var")
                                    : exercise.reps
                                )}
                              </div>
                              <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">
                                {exercise.executionType === 'time' ? t("workouts.duration") : t("workouts.reps")}
                              </div>
                            </CardContent>
                          </Card>
                          <Card className={cn("bg-muted/30 border-dashed", hasNextInSuperset && "bg-orange-500/10 border-orange-500/20")}>
                            <CardContent className="p-3 text-center">
                              <div className={cn("text-primary mb-1 flex justify-center", hasNextInSuperset && "text-orange-500")}>
                                {hasNextInSuperset ? <Flame className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
                              </div>
                              <div className={cn("text-xl font-bold", hasNextInSuperset && "text-orange-500 text-lg")}>
                                {hasNextInSuperset ? t("workouts.noPause") : `${exercise.restSeconds}s`}
                              </div>
                              <div className={cn("text-[10px] uppercase text-muted-foreground font-bold tracking-wider", hasNextInSuperset && "text-orange-500/70")}>
                                {hasNextInSuperset ? t("workouts.inSequence") : t("workouts.rest")}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>


      {/* 3. FOOTER (Action)

          Before the workout starts this is a single Start button. Once it is
          running the same button becomes Next: press it when the movement is
          done and it records the time, ticks the exercise off and slides to the
          next one. That is the entire interaction. */}
      <div className="flex-none p-4 bg-background border-t border-border/50 backdrop-blur-lg safe-area-bottom">
        <div className="max-w-xl mx-auto w-full space-y-3">
          {/* `isAdvancing` keeps this side up while the session closes: ending a
              workout clears the active session, and without it the footer would
              flip back to "Start workout" for a beat under someone's finger. */}
          {isRunning || isAdvancing ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatClock(exerciseSeconds)}
                  </span>
                  <span>
                    • {currentSlideIndex + 1}/{flatExercises.length}
                  </span>
                </div>

                {/* Only offered mid-workout: on the last movement the primary
                    button already ends the session, and two near-identical
                    words for "finish" is exactly the confusion to avoid. */}
                {currentSlideIndex < flatExercises.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setShowFinishDialog(true)}
                    disabled={isAdvancing}
                  >
                    {t("execution.end")}
                  </Button>
                )}
              </div>

              <Button
                size="lg"
                className="w-full h-16 text-xl shadow-lg shadow-primary/20"
                onClick={handleNext}
                disabled={isAdvancing}
              >
                {isAdvancing ? (
                  <AnimatedLoader type="default" size="sm" />
                ) : currentSlideIndex >= flatExercises.length - 1 ? (
                  <>
                    <Check className="w-7 h-7 mr-2" />
                    {t("execution.finish")}
                  </>
                ) : (
                  <>
                    {t("execution.next")}
                    <ArrowRight className="w-7 h-7 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="hidden md:block">
                <p className="text-sm font-medium">{workout.title}</p>
                <p className="text-xs text-muted-foreground">{duration} {t("units.minutes")} • {workout.exercises.length} {t("workouts.exercises").toLowerCase()}</p>
              </div>

              <Button
                size="lg"
                className="w-full h-16 text-xl shadow-lg shadow-primary/20"
                onClick={handleStartWorkout}
                disabled={isPreparing}
              >
                {isPreparing ? (
                  <AnimatedLoader type="default" size="sm" />
                ) : (
                  <>
                    <Play className="w-7 h-7 mr-2" />
                    <span className="uppercase">{t("workouts.startWorkout")}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("execution.incompleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("execution.incompleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("execution.keepTraining")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishEarly}>
              {t("execution.finishAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workouts.conflictDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workouts.conflictDialog.description", { workout: activeSession?.workout?.title || t("workouts.otherWorkout") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("workouts.conflictDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
