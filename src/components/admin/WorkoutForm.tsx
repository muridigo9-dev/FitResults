import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  Link as LinkIcon,
  Unlink,
  ChevronUp,
  ChevronDown,
  Info,
  Dumbbell
} from "lucide-react";
import { Workout, Exercise, MuscleGroup, ExerciseType, ExerciseLevel, ContentAssignment, VisibilityScope } from "@/types/content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "./ImageUploader";
import { ContentAssignmentSelector } from "./ContentAssignmentSelector";
import { VisibilitySelector } from "./VisibilitySelector";
import type { VisibilityType } from "@/hooks/useUnifiedVisibility";
import { toast } from "sonner";
import { WORKOUT_CATEGORY_LABELS } from "@/lib/constants";

interface WorkoutFormProps {
  workout?: Workout & { imagePath?: string; assigned_to_type?: VisibilityScope; assigned_to_id?: string | null };
  onSave: (workout: Omit<Workout, "id" | "createdAt"> & { imagePath?: string; assigned_to_type?: VisibilityScope; assigned_to_id?: string | null }) => void;
  onCancel: () => void;
  libraryExercises: (Exercise & { muscleGroupIds: string[] })[];
  muscleGroups: MuscleGroup[];
  exerciseTypes: ExerciseType[];
  exerciseLevels: ExerciseLevel[];
  showVisibilitySelector?: boolean;
}

export function WorkoutForm({
  workout,
  onSave,
  onCancel,
  libraryExercises = [],
  muscleGroups = [],
  exerciseTypes = [],
  exerciseLevels = [],
  showVisibilitySelector = true
}: WorkoutFormProps) {
  const [title, setTitle] = useState(workout?.title || "");
  const [description, setDescription] = useState(workout?.description || "");
  const [imageUrl, setImageUrl] = useState(workout?.imageUrl || "");
  const [imagePath, setImagePath] = useState(workout?.imagePath || "");
  const [category, setCategory] = useState(workout?.category || "");
  const [exercises, setExercises] = useState<Exercise[]>(
    workout?.exercises || []
  );
  const [isActive, setIsActive] = useState(workout?.isActive ?? true);
  const [assignment, setAssignment] = useState<ContentAssignment>({
    assigned_to_type: workout?.assigned_to_type || "global",
    assigned_to_id: workout?.assigned_to_id || null,
  });
  const [visibilityType, setVisibilityType] = useState<VisibilityType>((workout as any)?.visibilityType || 'global');
  const [selectedPlans, setSelectedPlans] = useState<string[]>((workout as any)?.planIds || []);

  // Modal State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libSearch, setLibSearch] = useState("");
  const [libMuscleFilter, setLibMuscleFilter] = useState("all");

  const tempId = useMemo(() => workout?.id || `new-${Date.now()}`, [workout?.id]);

  // filtered library exercises
  const filteredLibrary = useMemo(() => {
    return libraryExercises.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(libSearch.toLowerCase());
      const matchesMuscle = libMuscleFilter === "all" || ex.muscleGroupIds?.includes(libMuscleFilter);
      return matchesSearch && matchesMuscle;
    });
  }, [libraryExercises, libSearch, libMuscleFilter]);

  const addFromLibrary = (libEx: Exercise) => {
    const newEx: Exercise = {
      ...libEx,
      id: `instance-${Date.now()}-${libEx.id}`,
      order: exercises.length + 1,
      sets: Number(libEx.sets) || 3,
      reps: libEx.reps || "12",
      restSeconds: Number(libEx.restSeconds) || 60,
      executionType: libEx.executionType || 'reps',
      repsMode: libEx.repsMode || 'fixed',
      durationSeconds: Number(libEx.durationSeconds) || 60,
    };
    setExercises([...exercises, newEx]);
    toast.success(`${libEx.name} adicionado ao treino`);
  };

  const normalizeExercises = (items: Exercise[]) => {
    return items.map((ex, i) => {
      const prevEx = items[i - 1];
      const nextEx = items[i + 1];

      // Verificação de vínculo com vizinhos
      const hasPrevLink = prevEx && ex.supersetId && ex.supersetId === prevEx.supersetId;
      const hasNextLink = nextEx && ex.supersetId && ex.supersetId === nextEx.supersetId;

      // Se o exercício não tem vizinhos com o mesmo ID, ele não está em superset
      if (!hasPrevLink && !hasNextLink) {
        // Restaurar descanso original caso tenha ficado zerado pelo superset
        let restoredRest = ex.restSeconds;
        if (restoredRest === 0 || ex.restType === 'group') {
          const libId = ex.id.split('-').pop();
          const libEx = libraryExercises.find(l => l.id === libId);
          restoredRest = libEx?.restSeconds || 60;
        }

        return {
          ...ex,
          sets: Number(ex.sets) || 1,
          supersetId: undefined,
          restType: 'individual' as 'group' | 'individual',
          restSeconds: restoredRest,
          order: i + 1
        };
      }

      // Se está em grupo, o descanso é bloqueado ('group') para todos exceto o último
      return {
        ...ex,
        sets: Number(ex.sets) || 1,
        restSeconds: hasNextLink ? 0 : Number(ex.restSeconds),
        restType: (hasNextLink ? 'group' : 'individual') as 'group' | 'individual',
        order: i + 1
      };
    });
  };

  const removeExercise = (id: string) => {
    const updated = exercises.filter((ex) => ex.id !== id);
    setExercises(normalizeExercises(updated));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...exercises];
    const item = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = item;
    setExercises(normalizeExercises(newItems));
  };

  const moveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    const newItems = [...exercises];
    const item = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = item;
    setExercises(normalizeExercises(newItems));
  };

  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    const updated = [...exercises];
    const current = updated[index];
    const prev = updated[index - 1];

    if (current.supersetId && current.supersetId === prev.supersetId) {
      // Toggle off: remove o vínculo do atual
      current.supersetId = undefined;
    } else {
      // Toggle on: vincula com o anterior
      // Gera um UUID v4 fake mas válido para o banco aceitar
      const newUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const sid = prev.supersetId || newUUID;
      prev.supersetId = sid;
      current.supersetId = sid;
    }

    setExercises(normalizeExercises(updated));
  };

  const updateExerciseField = (id: string, field: keyof Exercise, value: any) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("O título do treino é obrigatório");
      return;
    }
    onSave({
      title,
      description,
      imageUrl,
      imagePath: imagePath || undefined,
      category,
      exercises,
      isActive,
      visibilityType,
      planIds: selectedPlans,
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="overflow-hidden border-none shadow-premium bg-background/50 backdrop-blur-xl">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome do Treino</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: PUSH A - Hipertrofia"
                className="bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Objetivo / Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background/50 border-primary/20">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WORKOUT_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Descrição do Protocolo</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas adicionais sobre o treino..."
              className="min-h-[100px] bg-background/50 border-primary/20"
            />
          </div>
          <ImageUploader
            bucket="workouts-media"
            storagePath={`system/${tempId}`}
            currentImageUrl={imageUrl}
            currentImagePath={imagePath}
            onImageChange={(d) => {
              if (d.imageUrl !== undefined) setImageUrl(d.imageUrl || "");
              if (d.imagePath !== undefined) setImagePath(d.imagePath || "");
            }}
            aspectRatio="video"
          />
        </CardContent>
      </Card>

      {/* Exercises List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Ordem de Execução
          </h3>
          <Button onClick={() => setIsLibraryOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Adicionar da Biblioteca
          </Button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex, index) => {
            const isFirstInSuperset = ex.supersetId && (!exercises[index - 1] || exercises[index - 1].supersetId !== ex.supersetId);
            const isMiddleInSuperset = ex.supersetId && exercises[index - 1]?.supersetId === ex.supersetId && exercises[index + 1]?.supersetId === ex.supersetId;
            const isLastInSuperset = ex.supersetId && exercises[index - 1]?.supersetId === ex.supersetId && (!exercises[index + 1] || exercises[index + 1].supersetId !== ex.supersetId);
            const isJoined = ex.supersetId && exercises[index - 1]?.supersetId === ex.supersetId;

            return (
              <div key={ex.id} className="relative group">
                {/* Superset Link Action */}
                {index > 0 && (
                  <button
                    onClick={() => toggleSuperset(index)}
                    className={`absolute -top-3 left-12 z-10 p-1 rounded-full border bg-background transition-all hover:scale-110 shadow-sm ${isJoined ? "text-primary border-primary border-2" : "text-muted-foreground border-dashed"
                      }`}
                    title={isJoined ? "Desagrupar" : "Conjugar com acima"}
                  >
                    {isJoined ? <Unlink className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                  </button>
                )}

                <Card className={`relative transition-all border-l-4 ${ex.supersetId ? "border-l-primary bg-primary/5" : "border-l-border"
                  } ${isJoined ? "mt-0 rounded-t-none border-t-0" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    {/* Controls */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="flex flex-col -space-y-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(index)} disabled={index === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(index)} disabled={index === exercises.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {ex.order}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 grid gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-base">{ex.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{ex.description || "Sem instruções específicas"}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          {ex.supersetId && (
                            <Badge variant="soft" className="h-6 px-2 text-[10px] uppercase tracking-wider font-bold">
                              Superset
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeExercise(ex.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                        {/* 1. Quantidade de Séries */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                            Séries
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateExerciseField(ex.id, 'sets', Math.max(1, parseInt(e.target.value) || 0))}
                            className="h-9 bg-background font-bold"
                          />
                        </div>

                        {/* 2. Tipo de Execução (Reps vs Tempo) */}
                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Execução</Label>

                            {/* Toggle de Modo de Repetição (Apenas se for Reps) */}
                            {ex.executionType !== 'time' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateExerciseField(ex.id, 'repsMode', 'fixed')}
                                  className={`text-[9px] px-1.5 rounded uppercase font-bold transition-colors ${ex.repsMode === 'fixed' || !ex.repsMode ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                                >Fixa</button>
                                <button
                                  onClick={() => updateExerciseField(ex.id, 'repsMode', 'variable')}
                                  className={`text-[9px] px-1.5 rounded uppercase font-bold transition-colors ${ex.repsMode === 'variable' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                                >Variável</button>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {/* Selector de Tipo Principal */}
                            <Select
                              value={ex.executionType || 'reps'}
                              onValueChange={(val: 'reps' | 'time') => {
                                updateExerciseField(ex.id, 'executionType', val);
                                if (val === 'time' && !ex.durationSeconds) {
                                  updateExerciseField(ex.id, 'durationSeconds', 60);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 w-[110px] bg-background text-xs font-semibold shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reps">Repetições</SelectItem>
                                <SelectItem value="time">Tempo</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Input Dinâmico conforme tipo */}
                            <div className="flex-1">
                              {ex.executionType === 'time' ? (
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Segundos"
                                    value={ex.durationSeconds || ''}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateExerciseField(ex.id, 'durationSeconds', parseInt(e.target.value) || 0)}
                                    className="h-9 bg-background font-bold pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none">seg</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {ex.repsMode === 'variable' ? (
                                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-background/50 border border-dashed border-primary/20 min-h-[50px]">
                                      {Array.from({ length: Number(ex.sets) || 1 }).map((_, i) => {
                                        const repsArray = String(ex.reps || "").split(',');
                                        return (
                                          <div key={i} className="flex flex-col items-center gap-0.5">
                                            <span className="text-[8px] font-black text-primary/40">S{i + 1}</span>
                                            <input
                                              type="text"
                                              value={repsArray[i] || ""}
                                              placeholder="--"
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const newReps = [...repsArray];
                                                // Preencher lacunas
                                                while (newReps.length < Number(ex.sets)) newReps.push(newReps[newReps.length - 1] || "0");
                                                newReps[i] = val;
                                                updateExerciseField(ex.id, 'reps', newReps.slice(0, Number(ex.sets)).join(','));
                                              }}
                                              className="w-10 h-8 bg-background border border-border rounded shadow-sm text-center text-xs font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <Input
                                      placeholder="Ex: 12"
                                      value={ex.reps}
                                      onChange={(e) => updateExerciseField(ex.id, 'reps', e.target.value)}
                                      className="h-9 bg-background font-bold"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Descanso */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground block truncate">
                            {ex.restType === 'group' ? "Link (Pular)" : "Pausa (seg)"}
                          </Label>
                          <Input
                            type="number"
                            value={ex.restSeconds}
                            disabled={ex.restType === 'group'}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateExerciseField(ex.id, 'restSeconds', parseInt(e.target.value) || 0)}
                            className={`h-9 bg-background font-bold ${ex.restType === 'group' ? "opacity-30 italic ring-1 ring-primary/20" : ""}`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {exercises.length === 0 && (
            <div className="border-2 border-dashed rounded-2xl p-12 text-center bg-muted/20">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">Capture exercícios da biblioteca para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Library Modal */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary/5 border-b">
            <DialogTitle className="text-2xl font-bold">Biblioteca de Exercícios</DialogTitle>
            <DialogDescription>Selecione um exercício para adicionar à série.</DialogDescription>
          </DialogHeader>

          <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                className="pl-10 h-10 border-none bg-background shadow-inner"
              />
            </div>
            <Select value={libMuscleFilter} onValueChange={setLibMuscleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background">
                <SelectValue placeholder="Filtrar por músculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Músculos</SelectItem>
                {muscleGroups.map(mg => (
                  <SelectItem key={mg.id} value={mg.id}>{mg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
            {filteredLibrary.map(libEx => (
              <button
                key={libEx.id}
                onClick={() => addFromLibrary(libEx)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="h-14 w-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden ring-1 ring-border">
                  {libEx.imageUrl ? (
                    <img src={libEx.imageUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/5">
                      <Dumbbell className="h-6 w-6 text-primary/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{libEx.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {muscleGroups.find(m => libEx.muscleGroupIds?.includes(m.id))?.name || "Geral"}
                  </p>
                </div>
              </button>
            ))}
            {filteredLibrary.length === 0 && (
              <div className="col-span-2 py-20 text-center text-muted-foreground italic">
                Nenhum exercício encontrado com estes filtros
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/20 border-t flex justify-end">
            <Button variant="default" onClick={() => setIsLibraryOpen(false)} className="px-10">
              Concluir Seleção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment & Final Actions */}
      <div className="pt-6 border-t space-y-6">
        {showVisibilitySelector && (
          <VisibilitySelector
            entityType="workout"
            value={{
              visibilityType,
              planIds: selectedPlans
            }}
            onChange={(config) => {
              setVisibilityType(config.visibilityType);
              setSelectedPlans(config.planIds);
            }}
            showDescription={true}
          />
        )}

        <div className="flex justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-lg z-50">
          <Button variant="ghost" onClick={onCancel} className="px-8 font-semibold">Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={exercises.length === 0}
            className="px-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            {workout ? "Salvar Alterações" : "Publicar Treino"}
          </Button>
        </div>
      </div>
    </div>
  );
}
