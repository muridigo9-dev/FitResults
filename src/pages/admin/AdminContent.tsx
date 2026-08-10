import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MoreVertical,
  Utensils,
  Beef, // For Ingredients
  BookOpen, // For Diet Plans
  Dumbbell,
  Trophy,
  Calculator,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  FileText,
  Download,
  FileUp,
  FileDown,
  ArrowLeft,
  Loader2,
  Layers,
  Activity,
  Target
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DishForm } from "@/components/admin/DishForm"; // Was DietForm
import { DietPlanForm } from "@/components/admin/DietPlanForm";
import { WorkoutForm } from "@/components/admin/WorkoutForm";
import { ChallengeForm } from "@/components/admin/ChallengeForm";
import { ExerciseForm } from "@/components/admin/ExerciseForm";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useAdminDietPlans } from "@/hooks/useAdminDietPlans";
import { useAdminWorkouts } from "@/hooks/useAdminWorkouts";
import { useAdminChallenges } from "@/hooks/useAdminChallenges";
import { useAdminDishes } from "@/hooks/useAdminDishes";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminIngredients } from "./AdminIngredients";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { TaxonomyForm } from "@/components/admin/TaxonomyForm";
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
import type { Diet, Workout, DietPlan, MuscleGroup, Exercise as ExerciseType, Achievement, VisibilityScope } from "@/types/content";
import type { Challenge } from "@/types/challenges";

type ContentType =
  | "ingredients"
  | "diets"
  | "diet-plans"
  | "workouts"
  | "exercises"
  | "muscle-groups"
  | "challenges"
  | "achievements"
  | "ranking"
  | "exercise-types"
  | "exercise-levels";

type MainTab = "workouts" | "nutrition" | "gamification";

interface SubTabConfig {
  id: ContentType;
  label: string;
  icon: any;
  color: string;
}

const mainTabConfig: Record<MainTab, { label: string; icon: any; color: string; subTabs: SubTabConfig[] }> = {
  workouts: {
    label: "Treinos", icon: Dumbbell, color: "text-habit-workout",
    subTabs: [
      { id: "exercises", label: "Exercícios", icon: Dumbbell, color: "text-habit-workout" },
      { id: "muscle-groups", label: "Grupos Musculares", icon: Layers, color: "text-habit-workout" },
      { id: "exercise-types", label: "Tipos de Exercício", icon: Activity, color: "text-habit-workout" },
      { id: "exercise-levels", label: "Níveis de Dificuldade", icon: Target, color: "text-habit-workout" },
      { id: "workouts", label: "Treinos", icon: Dumbbell, color: "text-habit-workout" },
    ]
  },
  nutrition: {
    label: "Alimentação", icon: Utensils, color: "text-habit-meals",
    subTabs: [
      { id: "ingredients", label: "Ingredientes", icon: Beef, color: "text-amber-600" },
      { id: "diets", label: "Pratos", icon: Utensils, color: "text-habit-meals" },
      { id: "diet-plans", label: "Planos Alimentares", icon: BookOpen, color: "text-blue-600" },
    ]
  },
  gamification: {
    label: "Gamificação", icon: Trophy, color: "text-level-gold",
    subTabs: [
      { id: "challenges", label: "Desafios", icon: Trophy, color: "text-level-gold" },
      { id: "achievements", label: "Conquistas", icon: Trophy, color: "text-level-gold" },
      { id: "ranking", label: "Ranking", icon: Trophy, color: "text-level-gold" },
    ]
  },
};

type ViewMode = "list" | "form";

export default function AdminContent() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("workouts");
  const [activeTab, setActiveTab] = useState<ContentType>("workouts");
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>("all");
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string>("all");
  const [exerciseLevelFilter, setExerciseLevelFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Handle ?create=true query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      setViewMode("form");
      setEditingId(null);
    }
  }, [location.search]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with URL params
  useEffect(() => {
    if (!tab) {
      navigate(`/admin/content/workouts`, { replace: true });
      return;
    }

    // Find which main tab contains this subtab
    const foundMainTab = Object.entries(mainTabConfig).find(([_, config]) =>
      config.subTabs.some(sub => sub.id === tab)
    );

    if (foundMainTab) {
      setActiveMainTab(foundMainTab[0] as MainTab);
      setActiveTab(tab as ContentType);
    }
  }, [tab]);

  // Feature Flag Protection
  const { isEnabled, isLoading: isLoadingDiets } = useFeatureFlag("diets_enabled");
  const { isEnabled: isTrainingModeEnabled, isLoading: isLoadingWorkouts } = useFeatureFlag("training_mode_enabled");

  useEffect(() => {
    // Config mapping
    const dietTabs = ["ingredients", "diets", "diet-plans"];
    const workoutTabs = ["workouts", "exercises", "muscle-groups", "exercise-types", "exercise-levels"];

    // Only check permissions when flags are loaded to avoid race conditions
    if (!isLoadingDiets && dietTabs.includes(activeTab) && !isEnabled) {
      navigate("/admin", { replace: true });
      toast.error("Módulo de Alimentação desativado");
    }

    if (!isLoadingWorkouts && workoutTabs.includes(activeTab) && !isTrainingModeEnabled) {
      navigate("/admin", { replace: true });
      toast.error("Módulo de Treinos desativado");
    }
  }, [activeTab, isEnabled, isLoadingDiets, isTrainingModeEnabled, isLoadingWorkouts, navigate]);

  const handleTabChange = (mainTab: MainTab) => {
    setActiveMainTab(mainTab);
    const firstSubTab = mainTabConfig[mainTab].subTabs[0].id;
    setActiveTab(firstSubTab);
    navigate(`/admin/content/${firstSubTab}`);
  };

  const handleSubTabChange = (subTab: ContentType) => {
    setActiveTab(subTab);
    navigate(`/admin/content/${subTab}`);
  };

  const {
    diets, workouts, challenges, libraryExercises, muscleGroups, plans, isLoading,
    saveDiet, toggleDietActive, deleteDiet,
    saveWorkout, toggleWorkoutActive, deleteWorkout, exportWorkout, importWorkout,
    saveChallenge, toggleChallengeActive, deleteChallenge,
    saveLibraryExercise, toggleLibraryExerciseActive, deleteLibraryExercise,
    saveMuscleGroup, toggleMuscleGroupActive, deleteMuscleGroup,
    saveExerciseType, toggleExerciseTypeActive, deleteExerciseType,
    saveExerciseLevel, toggleExerciseLevelActive, deleteExerciseLevel,
    exportLibraryExercises, importLibraryExercises, generateExerciseTemplate,
    exerciseTypes, exerciseLevels,
    exportDiets, importDiets
  } = useAdminContent();

  const {
    dietPlans,
    isLoading: isDietPlansLoading,
    saveDietPlan,
    toggleActive: toggleDietPlan,
    deleteDietPlan,
    exportDietPlans: exportPlans,
    importDietPlans: importPlans,
    downloadDietPlanPDF
  } = useAdminDietPlans();

  // const {
  //   workouts: adminWorkouts,
  //   saveWorkout: saveAdminWorkout,
  //   toggleActive: toggleWorkoutActive2,
  //   deleteWorkout: deleteAdminWorkout,
  // } = useAdminWorkouts();

  const {
    challenges: adminChallenges,
    saveChallenge: saveAdminChallenge,
    toggleActive: toggleChallengeActive2,
    deleteChallenge: deleteAdminChallenge,
  } = useAdminChallenges();

  const {
    dishes: adminDishes,
    saveDish: saveAdminDish,
    deleteDish: deleteAdminDish,
  } = useAdminDishes();

  const contentList = useMemo((): any[] => {
    switch (activeTab) {
      case "diets": return diets || [];
      case "diet-plans": return dietPlans || [];
      case "workouts": return workouts || [];
      case "exercises": return libraryExercises || [];
      case "muscle-groups": return muscleGroups || [];
      case "exercise-types": return exerciseTypes || [];
      case "exercise-levels": return exerciseLevels || [];
      case "challenges": return challenges || [];
      default: return [];
    }
  }, [activeTab, diets, dietPlans, workouts, libraryExercises, muscleGroups, challenges, exerciseTypes, exerciseLevels]);

  const editingItem = useMemo(() => {
    if (!editingId) return undefined;
    return contentList.find((item) => item?.id === editingId);
  }, [editingId, contentList]);

  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      if (!item) return false;
      // 1. Search Query Filter (Generic)
      const searchField = "title" in item ? item.title : "name" in item ? item.name : "";
      const matchesSearch = String(searchField || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Filters (Exercise specific)
      if (activeTab === "exercises") {
        const exercise = item as any; // Cast for simplicity here

        if (muscleGroupFilter !== "all" && !exercise.muscleGroupIds?.includes(muscleGroupFilter)) {
          return false;
        }

        if (exerciseTypeFilter !== "all" && exercise.typeId !== exerciseTypeFilter) {
          return false;
        }

        if (exerciseLevelFilter !== "all" && exercise.levelId !== exerciseLevelFilter) {
          return false;
        }
      }

      return true;
    });
  }, [contentList, searchQuery, activeTab, muscleGroupFilter, exerciseTypeFilter, exerciseLevelFilter]);

  const handleCreate = () => {
    setEditingId(null);
    setViewMode("form");
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setViewMode("form");
  };


  const handleSaveDiet = useCallback(async (data: any) => {
    try {
      await saveDiet(editingId || undefined, data);
      toast.success(editingId ? "Prato atualizado!" : "Prato criado!");
      setViewMode("list");
      setEditingId(null);
    } catch {
      toast.error("Erro ao salvar prato");
    }
  }, [editingId, saveDiet]);

  const handleSaveWorkout = useCallback(async (data: any) => {
    try {
      await saveWorkout(editingId || undefined, data); // FIXED: Passing arguments separately
      toast.success(editingId ? "Treino atualizado!" : "Treino criado!");
      setViewMode("list");
      setEditingId(null);
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao salvar treino: ${error.message || "Erro desconhecido"}`);
    }
  }, [editingId, saveWorkout]);

  const handleSaveChallenge = async (data: any) => {
    try {
      await saveAdminChallenge(editingId || undefined, data);
      toast.success(editingId ? "Desafio atualizado!" : "Desafio criado!");
      setViewMode("list");
      setEditingId(null);
    } catch {
      toast.error("Erro ao salvar desafio");
    }
  };

  const handleSaveDietPlan = async (data: any) => {
    try {
      await saveDietPlan(editingId || undefined, data);
      toast.success(editingId ? "Plano atualizado!" : "Plano criado!");
      setViewMode("list");
      setEditingId(null);
    } catch {
      toast.error("Erro ao salvar plano");
    }
  };



  // Handlers for Diet Plans (Pratos uses exportDiets from useAdminContent, Plans uses useAdminDietPlans)
  const handleExportDietPlans = async (id?: string) => {
    try {
      // Hook currently does not support filtering by ID
      await exportPlans();
    } catch (e: any) {
      // Toast handled in hook
    }
  };

  const handleImportDietPlans = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (entry) => {
      try {
        await importPlans(entry.target?.result as string);
      } catch (e) { }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleDietPlanPDF = async (id: string) => {
    try {
      const plan = dietPlans.find(p => p.id === id);
      if (plan) {
        downloadDietPlanPDF(plan);
      } else {
        toast.error("Plano não encontrado");
      }
    } catch (e) { }
  };

  // Handlers for Diets (Pratos)
  const handleExportDiets = async (id?: string) => {
    try {
      const ids = id ? [id] : undefined;
      await exportDiets(ids);
    } catch (e) { }
  };

  const handleImportDiets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (entry) => {
      try {
        const json = JSON.parse(entry.target?.result as string);
        await importDiets(json);
      } catch (e) {
        toast.error("Erro ao ler arquivo JSON");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleSaveExercise = useCallback(async (data: any) => {
    setIsSaving(true);
    try {
      const actualId = editingId?.startsWith('new-') ? undefined : editingId;
      await saveLibraryExercise(actualId || undefined, data);
      toast.success(editingId ? "Exercício atualizado!" : "Exercício criado!");
      setViewMode("list");
      setEditingId(null);
    } catch (err: any) {
      toast.error("Erro ao salvar exercício: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [editingId, saveLibraryExercise]);

  const handleExportExercises = async () => {
    try {
      const data = await exportLibraryExercises();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `exercises-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    }
  };

  const handleImportExercises = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const results = await importLibraryExercises(json) as any;
        toast.success(`Importação concluída! Importados: ${results.imported}, Pulados: ${results.skipped}`);
        if (results.errors && results.errors.length > 0) {
          console.error("Erros na importação:", results.errors);
          toast.warning(`${results.errors.length} exercícios tiveram erros. Veja o console.`);
        }
      } catch (err: any) {
        toast.error("Erro no arquivo: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleDownloadTemplate = () => {
    const data = generateExerciseTemplate();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template-importacao-exercicios.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info("Template de importação baixado!");
  };

  // Workout Export/Import Handlers
  const handleExportWorkout = async (id?: string) => {
    try {
      const ids = id ? [id] : contentList.map(w => w.id);
      if (ids.length === 0) {
        toast.warning("Nada para exportar");
        return;
      }

      const data = await exportWorkout(ids);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = id ? `workout-export-${contentList.find(w => w.id === id)?.title || 'single'}.json` : `workouts-export-bulk.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Treino(s) exportado(s) com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao exportar: " + err.message);
    }
  };

  const handleImportWorkout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = await importWorkout(json) as any;

        // Relatório simples
        toast.success(`Importação realizada! ${result.imported} treinos criados.`);
        if (result.errors && result.errors.length > 0) {
          console.error("Erros na importação de treinos:", result.errors);
          toast.warning("Alguns treinos tiveram erros. Veja o console.");
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Erro ao importar: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportPDF = async (id?: string) => {
    try {
      const ids = id ? [id] : contentList.map(w => w.id);
      if (ids.length === 0) {
        toast.warning("Nada para exportar");
        return;
      }

      // Reutiliza a query de exportação JSON para pegar os dados estruturados
      const data = await exportWorkout(ids);

      // Import dinâmico do gerador para não pesar o bundle inicial
      const { generateWorkoutPDF } = await import("../../services/pdfGenerator");

      generateWorkoutPDF(data as any, !!id); // Se id único, gera singleFile, senão gera consolidado/single por padrão do MVP
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar PDF: " + err.message);
    }
  };

  const handleSaveTaxonomy = async (data: any) => {
    try {
      switch (activeTab) {
        case "muscle-groups": await saveMuscleGroup(editingId || undefined, data); break;
        case "exercise-types": await saveExerciseType(editingId || undefined, data); break;
        case "exercise-levels": await saveExerciseLevel(editingId || undefined, data); break;
      }
      toast.success(editingId ? "Atualizado com sucesso!" : "Criado com sucesso!");
      setViewMode("list");
      setEditingId(null);
    } catch {
      toast.error("Erro ao salvar");
    }
  };


  const handleToggleActive = async (id: string) => {
    const item = contentList.find(i => i.id === id);
    if (!item) return;

    try {
      const newState = !item.isActive;
      switch (activeTab) {
        case "diets": await toggleDietActive(id, newState); break;
        case "diet-plans": await toggleDietPlan(id, newState); break;
        case "workouts": await toggleWorkoutActive(id, newState); break;
        case "challenges": await toggleChallengeActive(id, newState); break;
        case "exercises": await toggleLibraryExerciseActive(id, newState); break;
        case "muscle-groups": await toggleMuscleGroupActive(id, newState); break;
        case "exercise-types": await toggleExerciseTypeActive(id, newState); break;
        case "exercise-levels": await toggleExerciseLevelActive(id, newState); break;
      }
      toast.success("Status atualizado!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      switch (activeTab) {
        case "diets": await deleteDiet(deleteId); break;
        case "diet-plans": await deleteDietPlan(deleteId); break;
        case "workouts": await deleteWorkout(deleteId); break;
        case "challenges": await deleteChallenge(deleteId); break;
        case "exercises": await deleteLibraryExercise(deleteId); break;
        case "muscle-groups": await deleteMuscleGroup(deleteId); break;
        case "exercise-types": await deleteExerciseType(deleteId); break;
        case "exercise-levels": await deleteExerciseLevel(deleteId); break;
      }
      toast.success("Conteúdo removido!");
      setIsDeleting(false);
      setDeleteId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      if (err.message?.includes("foreign key")) {
        toast.error("Não é possível excluir este item pois ele está sendo usado em outros registros (ex: treinos ou dietas).");
      } else {
        toast.error("Erro ao remover conteúdo");
      }
    }
  };

  const handleCancel = () => {
    setViewMode("list");
    setEditingId(null);
  };

  const getItemTitle = (item: any): string => {
    if (!item) return "Sem título";
    return item.title || item.name || "Sem título";
  };

  const getItemDescription = (item: any): string | undefined => {
    if (activeTab === "exercises") {
      return item.description || (item.equipment ? `Equipamento: ${item.equipment}` : "Sem descrição");
    }
    if (activeTab === "muscle-groups" || activeTab === "exercise-types" || activeTab === "exercise-levels") {
      return `Slug: ${item.slug || 'n/a'}`;
    }
    return item.description;
  };

  const getItemCategory = (item: any): string | undefined => {
    if (activeTab === "exercises") {
      const type = exerciseTypes.find(t => t.id === item.typeId)?.name;
      const level = exerciseLevels.find(l => l.id === item.levelId)?.name;
      return [type, level].filter(Boolean).join(" • ") || item.difficulty;
    }
    if (activeTab === "muscle-groups") return item.category;
    if (activeTab === "exercise-types") return "Tipo";
    if (activeTab === "exercise-levels") return "Nível";
    if (item.category) return item.category;
    if (item.objective) {
      const objectives = { lose: "Emagrecer", maintain: "Manter", gain: "Ganhar" };
      return objectives[item.objective as keyof typeof objectives] || item.objective;
    }
    if (item.totalDays) return `${item.totalDays} dias`;
    return undefined;
  };

  const currentSubTab = useMemo(() => {
    return Object.values(mainTabConfig)
      .flatMap(m => m.subTabs)
      .find(s => s.id === activeTab);
  }, [activeTab]);

  const CurrentIcon = currentSubTab?.icon || Utensils;
  const currentColor = currentSubTab?.color || "text-primary";

  if (viewMode === "form") {
    return (
      <AdminLayout title={`${editingId ? "Editar" : "Novo"} ${currentSubTab?.label.slice(0, -1)}`}>
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="pb-20">
            {activeTab === "diets" && (
              <DishForm diet={editingItem as Diet | undefined} onSave={handleSaveDiet} onCancel={handleCancel} />
            )}
            {activeTab === "diet-plans" && (
              <DietPlanForm plan={editingItem as DietPlan | undefined} onSave={handleSaveDietPlan} onCancel={handleCancel} />
            )}
            {activeTab === "workouts" && (
              <WorkoutForm
                workout={editingItem as Workout | undefined}
                onSave={handleSaveWorkout}
                onCancel={handleCancel}
                libraryExercises={libraryExercises}
                muscleGroups={muscleGroups}
                exerciseTypes={exerciseTypes}
                exerciseLevels={exerciseLevels}
              />
            )}
            {activeTab === "challenges" && (
              <ChallengeForm challenge={editingItem as Challenge | undefined} onSave={handleSaveChallenge} onCancel={handleCancel} />
            )}
            {activeTab === "exercises" && (
              <ExerciseForm
                initialData={editingItem as any}
                plans={plans || []}
                exerciseTypes={exerciseTypes || []}
                exerciseLevels={exerciseLevels || []}
                onSave={handleSaveExercise}
                onCancel={handleCancel}
                isSubmitting={isSaving}
              />
            )}
            {(activeTab === "muscle-groups" || activeTab === "exercise-types" || activeTab === "exercise-levels") && (
              <TaxonomyForm
                type={activeTab === "muscle-groups" ? "muscle-group" : activeTab === "exercise-types" ? "exercise-type" : "exercise-level"}
                initialData={editingItem}
                onSave={handleSaveTaxonomy}
                onCancel={handleCancel}
              />
            )}
            {activeTab === "achievements" && (
              <div className="p-8 text-center border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground mb-4">O formulário de edição para {currentSubTab?.label} ainda não foi implementado neste painel unificado.</p>
                <Button onClick={handleCancel}>Voltar</Button>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const mainTabs = Object.entries(mainTabConfig);

  return (
    <AdminLayout title="Gestão de Conteúdo">
      <div className="space-y-6">
        <Tabs value={activeMainTab} onValueChange={(v) => handleTabChange(v as MainTab)}>
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto flex-nowrap scrollbar-hide">
            {mainTabs.map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 shrink-0"
                >
                  <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeMainTab} className="mt-6 space-y-6">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-full sm:w-fit overflow-x-auto">
              {mainTabConfig[activeMainTab].subTabs.map((sub) => (
                <Button
                  key={sub.id}
                  variant={activeTab === sub.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleSubTabChange(sub.id)}
                  className="h-8 shrink-0"
                >
                  <sub.icon className="h-3.5 w-3.5 mr-2" />
                  {sub.label}
                </Button>
              ))}
            </div>

            {activeTab === "ingredients" ? (
              <AdminIngredients />
            ) : (
              <>
                <div className="flex flex-col xl:flex-row gap-4 justify-between mb-6">
                  <div className="flex flex-col lg:flex-row gap-4 max-w-full xl:max-w-2xl flex-1">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Buscar ${currentSubTab?.label?.toLowerCase() || ''}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>

                    {activeTab === "exercises" && (
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto">
                        <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Músculo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos Músculos</SelectItem>
                            {muscleGroups.map((mg) => (
                              <SelectItem key={mg.id} value={mg.id}>
                                {mg.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={exerciseTypeFilter} onValueChange={setExerciseTypeFilter}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos Tipos</SelectItem>
                            {exerciseTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={exerciseLevelFilter} onValueChange={setExerciseLevelFilter}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Nível" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos Níveis</SelectItem>
                            {exerciseLevels.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-start xl:justify-end">

                    {/* EXERCISES BUTTONS */}
                    {activeTab === "exercises" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="text-muted-foreground hover:text-primary">
                          <FileDown className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Template</span>
                          <span className="sm:hidden">Tmpl</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportExercises}>
                          <Download className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Exportar</span>
                          <span className="sm:hidden">Exp</span>
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportExercises}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant="outline" size="sm">
                            <FileUp className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Importar</span>
                            <span className="sm:hidden">Imp</span>
                          </Button>
                        </div>
                      </>
                    )}

                    {/* WORKOUTS BUTTONS */}
                    {activeTab === "workouts" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleExportWorkout()}>
                          <Download className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">JSON</span>
                          <span className="sm:hidden">JSON</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportPDF()}>
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportWorkout}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant="outline" size="sm">
                            <FileUp className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Restaurar</span>
                            <span className="sm:hidden">Imp</span>
                          </Button>
                        </div>
                      </>
                    )}

                    {/* DIET PLANS BUTTONS */}
                    {activeTab === "diet-plans" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleExportDietPlans()}>
                          <Download className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">JSON</span>
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportDietPlans}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant="outline" size="sm">
                            <FileUp className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Importar JSON</span>
                          </Button>
                        </div>
                        {/* PDF Export for Diet Plans is typically per-item, but could be bulk? 
                             The user asked for PDF export "nos planos alimentares".
                             We will rely on the per-item dropdown for PDF, or add bulk if needed. 
                             For now, let's keep it to per-item in the list, or add a button here if bulk supported.
                             Bulk PDF is complex. Let's stick to JSON bulk here, and per-item PDF in the list.
                             Wait, the user said "nem exportar como pdf". 
                             I will allow enabling the per-item PDF option in the list as well.
                          */}
                      </>
                    )}

                    {/* DIETS (PRATOS) BUTTONS */}
                    {activeTab === "diets" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleExportDiets()}>
                          <Download className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">JSON</span>
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportDiets}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant="outline" size="sm">
                            <FileUp className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Importar JSON</span>
                          </Button>
                        </div>
                      </>
                    )}
                    {(activeTab !== "ranking") && (
                      <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{contentList.length}</p>}
                      <p className="text-sm text-muted-foreground">Total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-success">{contentList.filter((c: any) => c?.isActive !== false).length}</p>}
                      <p className="text-sm text-muted-foreground">Ativos</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CurrentIcon className={`h-5 w-5 ${currentColor}`} />
                      {currentSubTab?.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-64" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : filteredContent.length === 0 ? (
                      <EmptyState
                        type="documents"
                        title={`Nenhum ${currentSubTab?.label?.toLowerCase().slice(0, -1) || ''} encontrado`}
                        description={searchQuery ? `Não há resultados para "${searchQuery}"` : "Clique em 'Novo' para adicionar"}
                        action={(!searchQuery && activeTab !== "ranking") ? { label: "Criar primeiro", onClick: handleCreate } : undefined}
                      />
                    ) : (
                      <>
                        {activeTab === "challenges" ? (
                          <div className="space-y-3">
                            {filteredContent.map((item) => {
                              const challenge = item as Challenge; // Cast to Challenge type
                              return (
                                <Card key={challenge.id} className="overflow-hidden">
                                  <div className="flex flex-col sm:flex-row">
                                    {challenge.imageUrl && (
                                      <div className="w-full sm:w-32 h-32 sm:h-auto relative">
                                        <img
                                          src={challenge.imageUrl}
                                          alt={challenge.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h3 className="font-semibold">{challenge.name}</h3>
                                          <p className="text-sm text-muted-foreground line-clamp-1">{challenge.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Badge variant={challenge.isActive ? "success" : "secondary"}>
                                            {challenge.isActive ? "Ativo" : "Inativo"}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleEdit(challenge.id)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleToggleActive(challenge.id)}>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                {challenge.isActive ? "Desativar" : "Ativar"}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleDelete(challenge.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Excluir
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        ) : activeTab === "achievements" ? (
                          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Gestão de Conquistas</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                              As conquistas são carregadas automaticamente do sistema de gamificação. Esta interface será expandida em breve.
                            </p>
                          </div>
                        ) : activeTab === "ranking" ? (
                          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Ranking da Comunidade</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                              O ranking é atualizado em tempo real com base no XP dos usuários.
                            </p>
                          </div>
                        ) : activeTab === "nutritional-rules" ? (
                          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Regras Nutricionais</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                              Configure aqui as regras de substituição e equivalência nutricional.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(filteredContent || []).map((item) => {
                              if (!item) return null;
                              const isActive = item.isActive !== false;
                              return (
                                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                                    <CurrentIcon className={`h-5 w-5 ${isActive ? currentColor : "text-muted-foreground"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium truncate">{getItemTitle(item)}</p>
                                      {getItemCategory(item) && <Badge variant="secondary">{getItemCategory(item)}</Badge>}
                                    </div>
                                    {getItemDescription(item) && <p className="text-sm text-muted-foreground truncate line-clamp-1">{getItemDescription(item)}</p>}
                                  </div>
                                  <Badge variant={isActive ? "success" : "outline"}>{isActive ? "Ativo" : "Inativo"}</Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(item.id)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                      {("isActive" in item) && (
                                        <DropdownMenuItem onClick={() => handleToggleActive(item.id)}>
                                          {item.isActive ? <><EyeOff className="h-4 w-4 mr-2" />Desativar</> : <><Eye className="h-4 w-4 mr-2" />Ativar</>}
                                        </DropdownMenuItem>
                                      )}
                                      {activeTab === "workouts" && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleExportWorkout(item.id)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Exportar JSON
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleExportPDF(item.id)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Exportar PDF
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {activeTab === "diet-plans" && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleExportDietPlans(item.id)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Exportar JSON
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDietPlanPDF(item.id)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Baixar PDF
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {activeTab === "diets" && (
                                        <DropdownMenuItem onClick={() => handleExportDiets(item.id)}>
                                          <Download className="h-4 w-4 mr-2" />
                                          Exportar JSON
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não poderá ser desfeita. O item será permanentemente removido ou desativado do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
