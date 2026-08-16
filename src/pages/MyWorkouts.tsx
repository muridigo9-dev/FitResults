import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserContent } from "@/contexts/UserContentContext";
import { WorkoutForm } from "@/components/admin/WorkoutForm";
import { UserWorkout } from "@/types/userContent";
import { toast } from "sonner";
import {
  Plus,
  Dumbbell,
  Edit2,
  Trash2,
  User,
  Clock,
  Zap,
  Target
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/hooks/useI18n";
import { workoutCategoryLabel } from "@/lib/constants";

export default function MyWorkouts() {
  const { t } = useI18n();
  const {
    settings,
    allWorkouts,
    userWorkouts,
    addUserWorkout,
    updateUserWorkout,
    deleteUserWorkout
  } = useUserContent();

  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<UserWorkout | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");

  const systemWorkouts = allWorkouts.filter(w => w.contentOrigin !== "user");

  const handleSave = (workoutData: Omit<UserWorkout, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => {
    if (editingWorkout) {
      updateUserWorkout(editingWorkout.id, workoutData);
      toast.success(t("workouts.toast.updated"));
    } else {
      addUserWorkout(workoutData);
      toast.success(t("workouts.toast.created"));
    }
    setShowForm(false);
    setEditingWorkout(null);
  };

  const handleEdit = (workout: UserWorkout) => {
    setEditingWorkout(workout);
    setShowForm(true);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteUserWorkout(deletingId);
      toast.success(t("workouts.toast.deleted"));
      setDeletingId(null);
    }
  };

  const canEdit = (workout: UserWorkout) => workout.contentOrigin === "user";

  const getEstimatedDuration = (workout: UserWorkout) => {
    const minutes = workout.exercises.reduce((acc, e) =>
      acc + (e.sets * e.reps * 3 + e.sets * e.restSeconds) / 60, 0
    );
    return Math.round(minutes);
  };

  if (showForm) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {editingWorkout ? t("workouts.edit") : t("workouts.newWorkout")}
            </h1>
          </div>
          <WorkoutForm
            workout={editingWorkout || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingWorkout(null);
            }}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("workouts.title")}</h1>
            <p className="text-muted-foreground">
              {t("workouts.subtitle")}
            </p>
          </div>
          {settings.allowUserWorkoutCreation && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("workouts.createWorkout")}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "mine")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              {t("workouts.filters.all")} ({systemWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">
              <User className="h-4 w-4" />
              {t("workouts.filters.mine")} ({userWorkouts.length})
            </TabsTrigger>
          </TabsList>

          {/* All Workouts */}
          <TabsContent value="all" className="mt-6">
            {systemWorkouts.length === 0 ? (
              <EmptyWorkoutsState />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {systemWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    canEdit={false}
                    estimatedDuration={getEstimatedDuration(workout)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* User Workouts */}
          <TabsContent value="mine" className="mt-6">
            {userWorkouts.length === 0 ? (
              <EmptyUserWorkoutsState
                canCreate={settings.allowUserWorkoutCreation}
                onCreate={() => setShowForm(true)}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {userWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    canEdit={canEdit(workout)}
                    estimatedDuration={getEstimatedDuration(workout)}
                    onEdit={() => handleEdit(workout)}
                    onDelete={() => setDeletingId(workout.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workouts.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workouts.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// Empty state for system workouts
function EmptyWorkoutsState() {
  const { t } = useI18n();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          {t("workouts.empty.systemTitle")}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {t("workouts.empty.systemDescription")}
        </p>
      </CardContent>
    </Card>
  );
}

// Empty state for user workouts
function EmptyUserWorkoutsState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Dumbbell className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          {t("workouts.empty.userTitle")}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {canCreate
            ? t("workouts.createHint")
            : t("workouts.empty.creationDisabled")}
        </p>
        {canCreate && (
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("workouts.empty.createFirst")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Workout Card Component
interface WorkoutCardProps {
  workout: UserWorkout;
  canEdit: boolean;
  estimatedDuration: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

function WorkoutCard({ workout, canEdit, estimatedDuration, onEdit, onDelete }: WorkoutCardProps) {
  const { t } = useI18n();
  const categoryLabel = workoutCategoryLabel(t, workout.category);
  const defaultImage = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80";

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/30">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <img
          src={resolveImageUrl('workouts-media', workout.imagePath, workout.imageUrl)}
          alt={workout.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Category Badge */}
        {categoryLabel && (
          <Badge
            className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-0"
          >
            {categoryLabel}
          </Badge>
        )}

        {/* User Badge */}
        {workout.contentOrigin === "user" && (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 gap-1 bg-primary/90 text-primary-foreground border-0"
          >
            <User className="h-3 w-3" />
            {t("workouts.filters.mine")}
          </Badge>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-lg text-foreground line-clamp-2">
            {workout.title}
          </h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Description */}
        {workout.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workout.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatItem
            icon={Clock}
            value={`${estimatedDuration}`}
            label={t("units.minutes")}
            color="text-blue-500"
          />
          <StatItem
            icon={Target}
            value={workout.exercises.length.toString()}
            label={t("workouts.exercisesShort")}
            color="text-green-500"
          />
          <StatItem
            icon={Zap}
            value={workout.exercises.reduce((acc, e) => acc + e.sets, 0).toString()}
            label={t("workouts.setsShort")}
            color="text-orange-500"
          />
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={onEdit}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Stat Item Component
interface StatItemProps {
  icon: React.ElementType;
  value: string;
  label: string;
  color: string;
}

function StatItem({ icon: Icon, value, label, color }: StatItemProps) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
      <Icon className={`h-4 w-4 mb-1 ${color}`} />
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
