import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  MoreVertical,
  Droplets,
  Moon,
  Dumbbell,
  Utensils,
  Target,
  Edit,
  Trash2,
  GripVertical,
  Upload,
  Download,
  FileJson,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { useAdminHabits, CreateHabitInput } from "@/hooks/useHabits";
import { generateHabitTemplate, importHabits, exportHabits, validateHabitTemplate } from "@/lib/bulkImport/habitsImport";
import { downloadJSON } from "@/lib/bulkImport/templates";

const iconOptions = [
  { value: "Droplets", icon: Droplets, label: "Gota" },
  { value: "Moon", icon: Moon, label: "Lua" },
  { value: "Dumbbell", icon: Dumbbell, label: "Peso" },
  { value: "Utensils", icon: Utensils, label: "Talheres" },
  { value: "Target", icon: Target, label: "Alvo" },
];

const colorOptions = [
  { value: "water", label: "Azul (Água)", class: "bg-habit-water" },
  { value: "sleep", label: "Roxo (Sono)", class: "bg-habit-sleep" },
  { value: "workout", label: "Laranja (Treino)", class: "bg-habit-workout" },
  { value: "meals", label: "Verde (Refeições)", class: "bg-habit-meals" },
];

const getIconComponent = (iconName: string) => {
  const found = iconOptions.find(o => o.value === iconName);
  return found?.icon || Target;
};

export default function AdminHabits() {
  const { t } = useI18n();
  const { habits, isLoading, createHabit, updateHabit, deleteHabit, isCreating, isUpdating } = useAdminHabits();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Target",
    color: "water",
    unit: "",
    default_goal: 1,
  });

  const handleCreate = () => {
    setEditingHabit(null);
    setFormData({ name: "", description: "", icon: "Target", color: "water", unit: "", default_goal: 1 });
    setIsDialogOpen(true);
  };

  const handleEdit = (habit: any) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      description: habit.description || "",
      icon: habit.icon,
      color: habit.color,
      unit: habit.unit,
      default_goal: habit.default_goal,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.unit.trim()) {
      toast.error(t("validation.requiredFields"));
      return;
    }

    const input: CreateHabitInput = {
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
      unit: formData.unit,
      default_goal: formData.default_goal,
      display_order: habits.length + 1,
    };

    if (editingHabit) {
      updateHabit({ id: editingHabit.id, ...input });
    } else {
      createHabit(input);
    }

    setIsDialogOpen(false);
  };

  const handleToggleActive = (habit: any) => {
    updateHabit({ id: habit.id, is_active: !habit.is_active });
  };

  const handleDelete = (id: string) => {
    deleteHabit(id);
  };

  const handleDownloadTemplate = () => {
    const template = generateHabitTemplate();
    downloadJSON(template, "habits-template.json");
    toast.success(t("admin.templateDownloaded"));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exported = await exportHabits();
      downloadJSON(exported, `habits-export-${new Date().toISOString().split("T")[0]}.json`);
      toast.success(t("admin.habitsExported"));
    } catch (error) {
      console.error("Error exporting habits:", error);
      toast.error(t("admin.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setIsImporting(true);

    try {
      const text = await file.text();
      const template = JSON.parse(text);

      // Validate template
      const validation = validateHabitTemplate(template);
      if (!validation.isValid) {
        setImportErrors(validation.errors);
        toast.error(t("admin.importValidationFailed"));
        return;
      }

      // Import habits
      const result = await importHabits(template);

      toast.success(
        `${t("admin.importComplete")}: ${result.inserted} inseridos, ${result.updated} atualizados, ${result.skipped} ignorados, ${result.errors} erros`
      );

      if (result.errors > 0) {
        const errorDetails = result.details
          .filter(d => d.status === "error")
          .map(d => `${d.external_id}: ${d.reason}`);
        setImportErrors(errorDetails);
      }
    } catch (error) {
      console.error("Error importing habits:", error);
      toast.error(t("admin.importError"));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <AdminLayout title={t("admin.habitsManagement")}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <p className="text-muted-foreground">
              {t("admin.configureHabits")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileJson className="h-4 w-4 mr-2" />
              {t("admin.downloadTemplate")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t("admin.import")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || habits.length === 0}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t("admin.export")}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.newHabit")}
            </Button>
          </div>
        </div>

        {/* Import Errors */}
        {importErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {importErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{habits.length}</p>
              <p className="text-sm text-muted-foreground">{t("admin.totalHabits")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-success">
                {habits.filter(h => h.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">{t("states.active")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Habits List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.configuredHabits")}</CardTitle>
            <CardDescription>
              {t("admin.dragToReorder")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : habits.length === 0 ? (
              <EmptyState
                type="habits"
                title={t("admin.noHabitsConfigured")}
                description={t("admin.createFirstHabit")}
                action={{ label: t("actions.create"), onClick: handleCreate }}
              />
            ) : (
              <div className="space-y-3">
                {habits.sort((a, b) => a.display_order - b.display_order).map((habit) => {
                  const IconComponent = getIconComponent(habit.icon);
                  return (
                    <div 
                      key={habit.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-habit-${habit.color}/20`}>
                        <IconComponent className={`h-6 w-6 text-habit-${habit.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{habit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.goal")}: {habit.default_goal} {habit.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={habit.is_active}
                            onCheckedChange={() => handleToggleActive(habit)}
                          />
                          <Badge variant={habit.is_active ? "success" : "outline"}>
                            {habit.is_active ? t("states.active") : t("states.inactive")}
                          </Badge>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(habit)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(habit.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHabit ? t("actions.edit") : t("actions.new")} {t("admin.habit")}
              </DialogTitle>
              <DialogDescription>
                {t("admin.configureDetails")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.habitName")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Água, Sono, Treino..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("admin.description")}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("admin.habitDescPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.habitIcon")}</Label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: opt.value }))}
                          className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
                            formData.icon === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("admin.habitColor")}</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: opt.value }))}
                        className={`h-10 w-10 rounded-lg border-2 transition-all ${opt.class} ${
                          formData.color === opt.value
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">{t("admin.habitUnit")} *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: copos, horas..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">{t("admin.habitGoal")}</Label>
                  <Input
                    id="goal"
                    type="number"
                    min={1}
                    value={formData.default_goal}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_goal: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("actions.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingHabit ? t("actions.save") : t("actions.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
