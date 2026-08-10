import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Archive,
  Target,
  Lock,
  Loader2,
} from "lucide-react";
import { useUserHabits, CreateHabitInput } from "@/hooks/useHabits";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18n } from "@/hooks/useI18n";
import { EmptyState } from "@/components/states";

const HABIT_ICONS = [
  { value: "dumbbell", label: "💪" },
  { value: "apple", label: "🍎" },
  { value: "droplet", label: "💧" },
  { value: "bed", label: "🛏️" },
  { value: "brain", label: "🧠" },
  { value: "heart", label: "❤️" },
  { value: "book", label: "📚" },
  { value: "run", label: "🏃" },
  { value: "meditation", label: "🧘" },
  { value: "pill", label: "💊" },
];

const HABIT_COLORS = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f97316", label: "Laranja" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
];

interface HabitFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  unit: string;
  default_goal: number;
}

const defaultFormData: HabitFormData = {
  name: "",
  description: "",
  icon: "dumbbell",
  color: "#3b82f6",
  unit: "vezes",
  default_goal: 1,
};

export function UserHabitsList() {
  const { t } = useI18n();
  const { isEnabled, isUserContentAllowed, isLoading: isLoadingFlag } = useFeatureFlag("enable_custom_habits");
  const {
    habits,
    systemHabits,
    userCreatedHabits,
    isLoading,
    createHabit,
    updateHabit,
    archiveHabit,
    isCreating,
    isUpdating,
  } = useUserHabits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [formData, setFormData] = useState<HabitFormData>(defaultFormData);

  const canCreateHabits = isUserContentAllowed;

  const handleOpenCreate = () => {
    setFormData(defaultFormData);
    setEditingHabit(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (habit: any) => {
    setFormData({
      name: habit.name,
      description: habit.description || "",
      icon: habit.icon,
      color: habit.color,
      unit: habit.unit,
      default_goal: habit.default_goal,
    });
    setEditingHabit(habit.id);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const input: CreateHabitInput = {
      name: formData.name,
      description: formData.description || undefined,
      icon: formData.icon,
      color: formData.color,
      unit: formData.unit,
      default_goal: formData.default_goal,
    };

    if (editingHabit) {
      updateHabit({ id: editingHabit, ...input });
    } else {
      createHabit(input);
    }
    setIsDialogOpen(false);
  };

  const handleArchive = (habitId: string) => {
    archiveHabit(habitId);
  };

  const getIconEmoji = (icon: string) => {
    return HABIT_ICONS.find(i => i.value === icon)?.label || "🎯";
  };

  if (isLoading || isLoadingFlag) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t("habits.myHabits")}
            </CardTitle>
            <CardDescription>
              {canCreateHabits
                ? t("habits.customHabitsEnabled")
                : t("habits.customHabitsDisabled")}
            </CardDescription>
          </div>
          {canCreateHabits && (
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("habits.create")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {habits.length === 0 ? (
            <EmptyState
              type="habits"
              title={t("habits.noHabits")}
              description={
                canCreateHabits
                  ? t("habits.createFirstHabit")
                  : t("habits.noSystemHabits")
              }
            />
          ) : (
            <div className="space-y-4">
              {/* User Created Habits */}
              {userCreatedHabits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("habits.myCustomHabits")}
                  </h4>
                  {userCreatedHabits.map(habit => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl p-2 rounded-lg"
                          style={{ backgroundColor: `${habit.color}20` }}
                        >
                          {getIconEmoji(habit.icon)}
                        </span>
                        <div>
                          <p className="font-medium">{habit.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Meta: {habit.default_goal} {habit.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="soft">{t("habits.custom")}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(habit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleArchive(habit.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* System Habits */}
              {systemHabits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("habits.systemHabits")}
                  </h4>
                  {systemHabits.map(habit => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl p-2 rounded-lg"
                          style={{ backgroundColor: `${habit.color}20` }}
                        >
                          {getIconEmoji(habit.icon)}
                        </span>
                        <div>
                          <p className="font-medium">{habit.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Meta: {habit.default_goal} {habit.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{t("habits.system")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHabit ? t("habits.edit") : t("habits.create")}
            </DialogTitle>
            <DialogDescription>
              {t("habits.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("habits.name")} *</Label>
              <Input
                id="name"
                placeholder={t("habits.namePlaceholder")}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("habits.description")}</Label>
              <Input
                id="description"
                placeholder={t("habits.descriptionPlaceholder")}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("habits.icon")}</Label>
                <Select
                  value={formData.icon}
                  onValueChange={v => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {getIconEmoji(formData.icon)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_ICONS.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <span className="text-xl">{icon.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("habits.color")}</Label>
                <Select
                  value={formData.color}
                  onValueChange={v => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: formData.color }}
                        />
                        {HABIT_COLORS.find(c => c.value === formData.color)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_goal">{t("habits.goal")}</Label>
                <Input
                  id="default_goal"
                  type="number"
                  min={1}
                  value={formData.default_goal}
                  onChange={e => setFormData({ ...formData, default_goal: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">{t("habits.unit")}</Label>
                <Input
                  id="unit"
                  placeholder="vezes, ml, min..."
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingHabit ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
