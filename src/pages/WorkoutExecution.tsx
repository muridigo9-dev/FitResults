import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pause,
  Play,
  X,
  Timer,
  Dumbbell,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { AnimatedLoader } from "@/components/loaders";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { WorkoutExecutionList } from "@/components/workout/WorkoutExecutionCard";
import { RestTimerModal } from "@/components/workout/RestTimer";
import { WorkoutCompleteFeedback } from "@/components/workout/ExerciseFeedback";
import type { ExerciseFeedbackMood, LikeDislike } from "@/types/workout";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export default function WorkoutExecution() {
    const { t } = useI18n();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const {
    session,
    isLoading,
    error,
    progress,
    completeExercise,
    completeSet,
    completeSession,
    pauseSession,
    resumeSession,
    abandonSession,
    isCompletingSession,
    restTimeRemaining,
    totalRestDuration,
    isRestTimerActive,
    isRestTimerPaused,
    startRestTimer,
    stopRestTimer,
    toggleRestTimer,
    resetRestTimer,
    adjustRestTime,
  } = useWorkoutSession(sessionId);

  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showCompleteScreen, setShowCompleteScreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;

    const interval = setInterval(() => {
      const start = new Date(session.startedAt).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handlers
  const handleCompleteExercise = (
    sessionExerciseId: string,
    feedback?: { mood?: ExerciseFeedbackMood; likeDislike?: LikeDislike }
  ) => {
    completeExercise({
      sessionExerciseId,
      mood: feedback?.mood,
      likeDislike: feedback?.likeDislike,
    });
  };

  const handleSkipExercise = (sessionExerciseId: string, reason?: string) => {
    // Mark as completed but skipped
    completeExercise({
      sessionExerciseId,
      comment: reason,
    });
  };

  const handleCompleteSet = (
    sessionExerciseId: string,
    data: {
      setNumber: number;
      actualReps?: number;
      actualWeightKg?: number;
      rpe?: number;
    }
  ) => {
    completeSet({
      sessionExerciseId,
      ...data,
    });
  };

  const handleAbandon = () => {
    abandonSession();
    navigate("/workouts");
  };

  const handlePauseResume = () => {
    if (session?.status === "paused") {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleFinishWorkout = () => {
    // Check if all exercises are complete
    if (progress?.exercisesCompleted === progress?.exercisesTotal) {
      setShowCompleteScreen(true);
    } else {
      // Show confirmation
      setShowIncompleteDialog(true);
    }
  };

  const handleConfirmFinishIncomplete = () => {
    setShowIncompleteDialog(false);
    setShowCompleteScreen(true);
  };

  const handleSubmitFeedback = (feedback: {
    mood?: ExerciseFeedbackMood;
    rating?: number;
    comment?: string;
  }) => {
    // The mutation reads `mood`/`rating`; this used to pass `overallMood`/
    // `overallRating`, so every workout was saved with no feedback at all.
    completeSession({
      mood: feedback.mood,
      rating: feedback.rating,
      notes: feedback.comment,
    });
    navigate("/workouts");
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout hideHeader>
        <AnimatedLoader
          type="workout"
          message="Carregando treino..."
          fullScreen
        />
      </AppLayout>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <AppLayout hideHeader>
        <div className="container max-w-2xl mx-auto py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t("execution.loadErrorTitle")}</h2>
          <p className="text-muted-foreground mb-4">
            {t("execution.loadErrorMessage")}
          </p>
          <Button onClick={() => navigate("/workouts")}>
            {t("workouts.backToWorkouts")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Complete screen
  if (showCompleteScreen) {
    return (
      <AppLayout hideHeader>
        <div className="container max-w-md mx-auto py-8">
          <WorkoutCompleteFeedback
            workoutName={session.workout?.title}
            durationMinutes={Math.floor(elapsedTime / 60)}
            exercisesCompleted={progress?.exercisesCompleted}
            onSubmit={handleSubmitFeedback}
          />
        </div>
      </AppLayout>
    );
  }

  const isPaused = session.status === "paused";

  return (
    <AppLayout hideHeader>
      <div className="container max-w-2xl mx-auto pb-32">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b mb-6 -mx-4 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAbandonDialog(true)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold line-clamp-1">
                  {session.workout?.title || t("dashboard.workout")}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  <span className="font-mono">{formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePauseResume}
              >
                {isPaused ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAbandonDialog(true)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("execution.progress")}</span>
              <span>
                {progress?.exercisesCompleted}/{progress?.exercisesTotal} {t("workouts.exercises").toLowerCase()}
              </span>
            </div>
            <Progress value={progress?.exercisesPercent || 0} className="h-2" />
          </div>
        </div>

        {/* Paused Overlay */}
        {isPaused && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Pause className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Treino pausado</p>
                  <p className="text-sm text-muted-foreground">
                    Toque em play para continuar
                  </p>
                </div>
              </div>
              <Button onClick={handlePauseResume}>
                <Play className="h-4 w-4 mr-2" />
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Exercise Highlight */}
        {progress?.currentExercise && !isPaused && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
                {t("execution.currentExercise")}
              </p>
              <h2 className="text-xl font-bold">
                {progress.currentExercise.exercise?.name}
              </h2>
              {progress.nextExercise && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("execution.next")}: {progress.nextExercise.exercise?.name}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exercise List */}
        <WorkoutExecutionList
          exercises={session.exercises}
          currentIndex={progress?.currentExerciseIndex || 0}
          isRestActive={isRestTimerActive}
          restSeconds={restTimeRemaining}
          onCompleteExercise={handleCompleteExercise}
          onSkipExercise={handleSkipExercise}
          onCompleteSet={handleCompleteSet}
          onStartRest={startRestTimer}
          onRestComplete={stopRestTimer}
        />

        {/* Rest Timer Modal */}
        <RestTimerModal
          isOpen={isRestTimerActive}
          seconds={restTimeRemaining}
          totalSeconds={totalRestDuration}
          isPaused={isRestTimerPaused}
          onTogglePause={toggleRestTimer}
          onReset={resetRestTimer}
          exerciseName={progress?.currentExercise?.exercise?.name}
          nextExerciseName={progress?.nextExercise?.exercise?.name}
          onComplete={stopRestTimer}
          onSkip={stopRestTimer}
          onAdjustTime={adjustRestTime}
        />

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50">
          <div className="container max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              {/* Progress Summary */}
              {/* Progress Summary */}
              <div className="flex-1 min-w-[120px]">
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    <span>{progress?.exercisesCompleted || 0}<span className="hidden xs:inline"> ex.</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    <span>
                      {progress?.setsCompleted || 0}
                      {progress?.setsTotal ? `/${progress.setsTotal}` : ""}
                      <span className="hidden xs:inline"> {t("workouts.sets").toLowerCase()}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Finish Button */}
              <Button
                size="default"
                onClick={handleFinishWorkout}
                className={cn(
                  "h-10 sm:h-11 px-4 sm:px-8",
                  progress?.exercisesPercent === 100
                    ? "bg-green-500 hover:bg-green-600"
                    : ""
                )}
              >
                {progress?.exercisesPercent === 100 ? (
                  <>
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    <span className="text-sm sm:text-base">{t("execution.finish")}</span>
                  </>
                ) : (
                  t("execution.end")
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Abandon Dialog */}
        <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("execution.abandonTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("execution.abandonDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("execution.keepTraining")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAbandon}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("execution.abandon")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Incomplete Finish Dialog */}
        <AlertDialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("execution.incompleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("execution.incompleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("actions.back")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmFinishIncomplete}>
                {t("execution.finishAnyway")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
