import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dumbbell, ChevronRight, Zap, Timer, Check, Play, Search,
  Trophy,
  Plus,
  Edit2,
  Trash2,
  User,
  X,
  Flame,
  Eye,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiary } from "@/contexts/DiaryContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useWorkoutStreak, useActiveSession } from "@/hooks/useWorkoutSession";
import { AnimatedLoader } from "@/components/loaders";
import { WORKOUT_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExercisesContent } from "./Exercises";
import { EmptyStateReason } from "@/components/states/EmptyStateReason";
import { useUserContent } from "@/contexts/UserContentContext";
import { WorkoutForm } from "@/components/admin/WorkoutForm";
import { UserWorkout } from "@/types/userContent";
import { useExercises, useMuscleGroups } from "@/hooks/useExercises";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { resolveImageUrl } from "@/hooks/useStorageUpload";
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

// Helper: Calculate more accurate duration based on exercises
const calculateDuration = (exercises: any[]): number => {
  let totalSeconds = 0;
  // Add warm-up / transition buffer (5 mins)
  totalSeconds += 5 * 60;

  exercises.forEach(ex => {
    const sets = ex.sets || 3;
    const rest = ex.restSeconds || 60;
    // Estimate execution time per set
    let executionPerSet = 0;
    if (ex.executionType === 'time' && ex.durationSeconds) {
      executionPerSet = ex.durationSeconds;
    } else {
      let repCount = 10;
      if (typeof ex.reps === 'number') repCount = ex.reps;
      else if (typeof ex.reps === 'string') {
        const parts = ex.reps.split('-');
        if (parts.length === 2) repCount = (parseInt(parts[0]) + parseInt(parts[1])) / 2;
        else repCount = parseInt(ex.reps) || 12;
      }
      executionPerSet = repCount * 4;
    }
    totalSeconds += sets * (executionPerSet + rest);
  });

  return Math.round(totalSeconds / 60);
};

export default function Workouts() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { allWorkouts, isLoading, blockReason } = useWorkouts();
  const { data: streak } = useWorkoutStreak();
  const { data: activeSession } = useActiveSession();

  // Data for form
  const { exercises: libraryExercises } = useExercises();
  const { muscleGroups } = useMuscleGroups();

  // User content for creating custom workouts
  const {
    settings,
    userWorkouts,
    addUserWorkout,
    updateUserWorkout,
    deleteUserWorkout
  } = useUserContent();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<UserWorkout | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");

  // Filter active workouts
  const activeWorkouts = allWorkouts.filter(w => w.isActive);

  // Workout CRUD handlers
  const handleSaveWorkout = (workoutData: Omit<UserWorkout, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => {
    if (editingWorkout) {
      updateUserWorkout(editingWorkout.id, workoutData);
      toast.success("Treino atualizado com sucesso!");
    } else {
      addUserWorkout(workoutData);
      toast.success("Treino criado com sucesso!");
    }
    setShowForm(false);
    setEditingWorkout(null);
  };

  const handleEditWorkout = (workout: UserWorkout) => {
    setEditingWorkout(workout);
    setShowForm(true);
  };

  const handleDeleteWorkout = () => {
    if (deletingId) {
      deleteUserWorkout(deletingId);
      toast.success("Treino excluído!");
      setDeletingId(null);
    }
  };

  const canEditWorkout = (workout: UserWorkout) => workout.contentOrigin === "user";

  // Apply filters
  const filteredWorkouts = activeWorkouts.filter(w => {
    // Search Filter
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
    // Category Filter
    const matchesCategory = selectedCategory
      ? (
        w.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        w.category?.toLowerCase() === WORKOUT_CATEGORY_LABELS[selectedCategory as keyof typeof WORKOUT_CATEGORY_LABELS]?.toLowerCase()
      )
      : true;

    return matchesSearch && matchesCategory;
  });

  // Show form if creating/editing
  if (showForm) {
    return (
      <AppLayout>
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {editingWorkout ? t("workouts.edit") : t("workouts.newWorkout")}
            </h1>
          </div>
          <WorkoutForm
            workout={editingWorkout || undefined}
            onSave={handleSaveWorkout}
            onCancel={() => {
              setShowForm(false);
              setEditingWorkout(null);
            }}
            libraryExercises={libraryExercises as any}
            muscleGroups={muscleGroups}
            exerciseTypes={[]}
            exerciseLevels={[]}
            showVisibilitySelector={false}
          />
        </div>
      </AppLayout>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader type="workout" message="Carregando treinos..." fullScreen />
      </AppLayout>
    );
  }

  // Blocked State
  if (blockReason) {
    return (
      <AppLayout>
        <EmptyStateReason reason={blockReason} />
      </AppLayout>
    );
  }


  // Workouts List View Content
  const workoutsViewContent = (
    <div className="container max-w-xl mx-auto pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("workouts.myWorkouts")}</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {t("workouts.todaysWorkouts")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Create Workout Button - Only show if feature flag is active and on desktop (mobile has FAB) */}
          {settings.allowUserWorkoutCreation && (
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 hidden md:flex">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("workouts.createWorkout")}</span>
            </Button>
          )}
          {/* Streak Badge */}
          {streak && streak.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full border border-orange-500/20">
              <Flame className="w-4 h-4 fill-orange-500" />
              <span className="font-bold text-sm">{streak.currentStreak} {t("challenges.days")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Session Floater */}
      {activeSession && (
        <div className="mb-8 sticky top-4 z-30 animate-in slide-in-from-top-4 fade-in duration-500">
          <Link to={`/workout-execution/${activeSession.id}`}>
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-between ring-2 ring-white/20 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse" />
              <div className="relative z-10 flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 fill-current" />
                  {t("workouts.inProgress")}
                </span>
                <span className="font-bold text-lg leading-tight mt-0.5">
                  {activeSession.workout?.title || t("workouts.currentWorkout")}
                </span>
              </div>
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm relative z-10">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Filters Section */}
      <div className="space-y-4 mb-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("workouts.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40 border-0 h-10 rounded-xl focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="relative group">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent md:scrollbar-hide hover:scrollbar-default">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "flex-none px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
                !selectedCategory
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              {t("workouts.filters.all")}
            </button>
            {Object.entries(WORKOUT_CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
                className={cn(
                  "flex-none px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
                  key === selectedCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
            {/* Spacer for proper padding at end */}
            <div className="w-2 flex-none" />
          </div>
          {/* Gradient fade to indicate scrollable area */}
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>
      </div>


      {/* Tabs for System vs User Workouts */}
      {settings.allowUserWorkoutCreation ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "mine")} className="mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              {t("workouts.filters.all")} ({filteredWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">
              <User className="h-4 w-4" />
              {t("workouts.filters.mine")} ({userWorkouts.length})
            </TabsTrigger>
          </TabsList>

          {/* All Workouts Tab */}
          <TabsContent value="all" className="mt-6">
            {filteredWorkouts.length === 0 ? (
              <div className="mt-8">
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <p className="text-muted-foreground">{t("workouts.noWorkoutsFound")}</p>
                  {(searchQuery || selectedCategory) && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                      }}
                    >
                      {t("exercises.clear")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWorkouts.map((workout) => {
                  const duration = calculateDuration(workout.exercises);
                  const lastPlayed = workout.lastPerformed ? new Date(workout.lastPerformed) : null;
                  const daysSinceLast = lastPlayed ? differenceInDays(new Date(), lastPlayed) : null;
                  return (
                    <Link to={`/workouts/${workout.id}`} key={workout.id} className="block group">
                      <div className="relative bg-card rounded-2xl overflow-hidden shadow-sm border group-hover:shadow-md transition-all duration-300 group-active:scale-[0.98]">
                        <div className="flex h-32 md:h-36">
                          <div className="w-1/3 md:w-36 relative shrink-0">
                            <img
                              src={resolveImageUrl('workouts-media', workout.imagePath, workout.imageUrl)}
                              alt={workout.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded-md justify-center">
                              <Timer className="w-3 h-3" />
                              {duration} min
                            </div>
                          </div>
                          <div className="flex-1 p-3 md:p-4 flex flex-col justify-between overflow-hidden">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-secondary-foreground border-0">
                                  {WORKOUT_CATEGORY_LABELS[workout.category as keyof typeof WORKOUT_CATEGORY_LABELS] || workout.category}
                                </Badge>
                                {workout.completedCount > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
                                    <Trophy className="w-3 h-3 text-yellow-500" />
                                    {workout.completedCount}x
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-base md:text-lg leading-tight text-foreground line-clamp-2">
                                {workout.title}
                              </h3>
                            </div>
                            <div className="pt-2 mt-2 border-t border-dashed border-border/50 flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="w-3.5 h-3.5" />
                                  {workout.exercises.length}
                                </span>
                                {lastPlayed && (
                                  <span className={cn(
                                    "flex items-center gap-1",
                                    daysSinceLast === 0 ? "text-green-500 font-medium" : ""
                                  )}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    {daysSinceLast === 0 ? t("checkin.today") : daysSinceLast === 1 ? t("workouts.yesterday") : t("workouts.daysAgo", { days: daysSinceLast })}
                                  </span>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Workouts Tab */}
          <TabsContent value="mine" className="mt-6">
            {userWorkouts.length === 0 ? (
              <div className="mt-8">
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <div className="rounded-full bg-primary/10 p-4 mb-4 inline-block">
                    <Dumbbell className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t("workouts.createDescription")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("workouts.createHint")}
                  </p>
                  <Button onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("workouts.createWorkout")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userWorkouts.map((workout) => {
                  const duration = calculateDuration(workout.exercises);
                  const canEdit = canEditWorkout(workout);
                  return (
                    <div key={workout.id} className="relative bg-card rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-all duration-300">
                      <div className="flex h-32 md:h-36">
                        <div className="w-1/3 md:w-36 relative shrink-0">
                          <img
                            src={resolveImageUrl('workouts-media', workout.imagePath, workout.imageUrl)}
                            alt={workout.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded-md justify-center">
                            <Timer className="w-3 h-3" />
                            {duration} min
                          </div>
                          <Badge variant="secondary" className="absolute top-2 right-2 gap-1 bg-primary/90 text-primary-foreground border-0">
                            <User className="h-3 w-3" />
                            {t("workouts.filters.mine")}
                          </Badge>
                        </div>
                        <div className="flex-1 p-3 md:p-4 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-secondary-foreground border-0">
                                {WORKOUT_CATEGORY_LABELS[workout.category as keyof typeof WORKOUT_CATEGORY_LABELS] || workout.category}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-base md:text-lg leading-tight text-foreground line-clamp-2">
                              {workout.title}
                            </h3>
                          </div>
                          <div className="pt-2 mt-2 border-t border-dashed border-border/50">
                            {canEdit ? (
                              <div className="flex gap-2">
                                <Link to={`/workouts/${workout.id}`} className="flex-1">
                                  <Button variant="secondary" size="sm" className="w-full gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20">
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver
                                  </Button>
                                </Link>
                                <Button variant="outline" size="sm" className="gap-1.5 px-3" onClick={() => handleEditWorkout(workout)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(workout.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="w-3.5 h-3.5" />
                                  {workout.exercises.length}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* No feature flag - show only system workouts */
        <div className="mt-6">
          {filteredWorkouts.length === 0 ? (
            <div className="mt-8">
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                <p className="text-muted-foreground">{t("workouts.noWorkoutsFound")}</p>
                {(searchQuery || selectedCategory) && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                  >
                    {t("exercises.clear")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkouts.map((workout) => {
                const duration = calculateDuration(workout.exercises);
                const lastPlayed = workout.lastPerformed ? new Date(workout.lastPerformed) : null;
                const daysSinceLast = lastPlayed ? differenceInDays(new Date(), lastPlayed) : null;
                return (
                  <Link to={`/workouts/${workout.id}`} key={workout.id} className="block group">
                    <div className="relative bg-card rounded-2xl overflow-hidden shadow-sm border group-hover:shadow-md transition-all duration-300 group-active:scale-[0.98]">
                      <div className="flex h-32 md:h-36">
                        <div className="w-1/3 md:w-36 relative shrink-0">
                          <img
                            src={workout.imageUrl || "/placeholder.svg"}
                            alt={workout.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded-md justify-center">
                            <Timer className="w-3 h-3" />
                            {duration} min
                          </div>
                        </div>
                        <div className="flex-1 p-3 md:p-4 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-secondary-foreground border-0">
                                {WORKOUT_CATEGORY_LABELS[workout.category as keyof typeof WORKOUT_CATEGORY_LABELS] || workout.category}
                              </Badge>
                              {workout.completedCount > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
                                  <Trophy className="w-3 h-3 text-yellow-500" />
                                  {workout.completedCount}x
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-base md:text-lg leading-tight text-foreground line-clamp-2">
                              {workout.title}
                            </h3>
                          </div>
                          <div className="pt-2 mt-2 border-t border-dashed border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Dumbbell className="w-3.5 h-3.5" />
                                {workout.exercises.length}
                              </span>
                              {lastPlayed && (
                                <span className={cn(
                                  "flex items-center gap-1",
                                  daysSinceLast === 0 ? "text-green-500 font-medium" : ""
                                )}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  {daysSinceLast === 0 ? t("checkin.today") : daysSinceLast === 1 ? t("workouts.yesterday") : t("workouts.daysAgo", { days: daysSinceLast })}
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      {isMobile ? (
        <div className="flex flex-col h-full">
          <div className="px-4 pt-4 pb-2 bg-background sticky top-0 z-10 shadow-sm border-b">
            <Tabs defaultValue="workouts" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="workouts">{t("workouts.title")}</TabsTrigger>
                <TabsTrigger value="exercises">{t("workouts.exercises")}</TabsTrigger>
              </TabsList>

              <TabsContent value="workouts" className="mt-4">
                {workoutsViewContent}
              </TabsContent>

              <TabsContent value="exercises" className="mt-4 min-h-[calc(100vh-200px)]">
                <ExercisesContent />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        workoutsViewContent
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treino será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkout} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile FAB for Creation */}
      {isMobile && settings.allowUserWorkoutCreation && !showForm && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-300"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </AppLayout>
  );
}
