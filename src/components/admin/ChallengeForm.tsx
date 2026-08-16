import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp, Droplets, Dumbbell, Utensils, Target, Check } from "lucide-react";
import type { Challenge, ChallengeDay, ChallengeTask } from "@/types/challenges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ImageUploader } from "./ImageUploader";
import { ContentAssignmentSelector, ContentAssignment, AssignmentType } from "./ContentAssignmentSelector";
import { VisibilitySelector } from "./VisibilitySelector";
import type { VisibilityType } from "@/hooks/useUnifiedVisibility";
import { TaskContentSelector } from "./TaskContentSelector";
import { TranslationFields } from "./TranslationFields";

interface ChallengeFormProps {
  challenge?: Challenge;
  onSave: (challenge: any) => void;
  onCancel: () => void;
}

const TASK_TYPES: { value: ChallengeTask["type"]; label: string; icon: any }[] = [
  { value: "water", label: "Água", icon: Droplets },
  { value: "workout", label: "Treino", icon: Dumbbell },
  { value: "diet", label: "Dieta", icon: Utensils },
  { value: "habit", label: "Hábito", icon: Target },
  { value: "checkin", label: "Check-in", icon: Check },
];

const TASK_UNITS: Record<string, string[]> = {
  water: ["ml", "L", "copos"],
  workout: ["minutos", "exercícios", "séries"],
  diet: ["refeições", "porções", "calorias"],
  habit: ["vezes", "minutos", "horas"],
  checkin: ["vezes"],
};

export function ChallengeForm({ challenge, onSave, onCancel }: ChallengeFormProps) {
  const [name, setName] = useState(challenge?.name || "");
  const [translations, setTranslations] = useState<Record<string, string>>({
    nameEn: (challenge as any)?.nameEn || "",
    nameEs: (challenge as any)?.nameEs || "",
    descriptionEn: (challenge as any)?.descriptionEn || "",
    descriptionEs: (challenge as any)?.descriptionEs || "",
  });
  const [description, setDescription] = useState(challenge?.description || "");
  const [coverUrl, setCoverUrl] = useState(challenge?.cover_url || "");
  // const [imagePath, setImagePath] = useState(challenge?.imagePath || ""); // Not used in new schema directly?

  const [durationDays, setDurationDays] = useState(challenge?.duration_days || 7);
  const [days, setDays] = useState<ChallengeDay[]>(challenge?.days || []);
  const [isActive, setIsActive] = useState(challenge?.is_active ?? true);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [visibilityType, setVisibilityType] = useState<VisibilityType>((challenge as any)?.visibility || 'global');
  const [selectedPlans, setSelectedPlans] = useState<string[]>((challenge as any)?.plan_ids || []);

  // Generate a temporary ID for new challenges
  const tempId = useMemo(() => challenge?.id || `new-${Date.now()}`, [challenge?.id]);

  const generateDays = (count: number) => {
    const newDays: ChallengeDay[] = [];
    for (let i = 1; i <= count; i++) {
      const existingDay = days.find((d) => d.day_number === i);
      newDays.push(
        existingDay || {
          id: `day-${i}-${Date.now()}`,
          challenge_id: tempId,
          day_number: i,
          xp_bonus: 50,
          tasks: [],
        }
      );
    }
    setDays(newDays);
  };

  const handleDurationChange = (value: number) => {
    setDurationDays(value);
    generateDays(value);
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  const addTask = (dayId: string) => {
    setDays(
      days.map((day) =>
        day.id === dayId
          ? {
            ...day,
            tasks: [
              ...(day.tasks || []),
              {
                id: `task-${Date.now()}`,
                challenge_day_id: day.id,
                title: "",
                type: "habit",
                is_mandatory: true,
                xp_reward: 10,
                order_index: (day.tasks?.length || 0) + 1,
                config: { target: 1, unit: "vezes", instruction: "" }
              },
            ],
          }
          : day
      )
    );
  };

  const updateTask = (
    dayId: string,
    taskId: string,
    field: keyof ChallengeTask | string, // string for config props
    value: any
  ) => {
    setDays(
      days.map((day) =>
        day.id === dayId
          ? {
            ...day,
            tasks: (day.tasks || []).map((task) => {
              if (task.id !== taskId) return task;

              // Handle Config Fields
              if (field === 'instruction' || field === 'target' || field === 'unit') {
                return {
                  ...task,
                  config: { ...task.config, [field]: value }
                };
              }

              // Handle direct fields
              if (field === 'type') {
                // Reset config defaults if type changes
                return {
                  ...task,
                  type: value,
                  config: { target: 1, unit: TASK_UNITS[value as string]?.[0] || "", instruction: "" }
                };
              }

              return { ...task, [field]: value };
            }),
          }
          : day
      )
    );
  };

  const removeTask = (dayId: string, taskId: string) => {
    setDays(
      days.map((day) =>
        day.id === dayId
          ? { ...day, tasks: (day.tasks || []).filter((t) => t.id !== taskId) }
          : day
      )
    );
  };

  const copyDayTasks = (fromDayId: string, toDayNumber: number) => {
    const sourceDay = days.find((d) => d.id === fromDayId);
    if (!sourceDay) return;

    setDays(
      days.map((day) =>
        day.day_number === toDayNumber
          ? {
            ...day,
            tasks: (sourceDay.tasks || []).map((t) => ({
              ...t,
              id: `task-${Date.now()}-${Math.random()}`,
              challenge_day_id: day.id
            })),
          }
          : day
      )
    );
  };

  const handleImageChange = (data: { imageUrl?: string; imagePath?: string }) => {
    // Prefer URL
    if (data.imageUrl) setCoverUrl(data.imageUrl);
  };

  const handleSubmit = () => {
    onSave({
      name,
      description,
      ...translations,
      cover_url: coverUrl,
      duration_days: durationDays,
      days,
      is_active: isActive,
      visibilityType,
      planIds: selectedPlans
    });
  };

  const getTaskIcon = (type: ChallengeTask["type"]) => {
    const config = TASK_TYPES.find((t) => t.value === type);
    return config?.icon || Target;
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Desafio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Desafio *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Desafio 21 Dias Sem Açúcar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duração (dias)</Label>
              <Select
                value={durationDays.toString()}
                onValueChange={(v) => handleDurationChange(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 14, 21, 30, 60, 90].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} dias
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo do desafio..."
              rows={2}
            />
          </div>
          <TranslationFields
            fields={[
              { key: "name", label: "Nome do Desafio", placeholderEn: "Ex: 30-Day Challenge", placeholderEs: "Ej: Reto de 30 Días" },
              { key: "description", label: "Descrição", multiline: true, placeholderEn: "Describe the goal of the challenge...", placeholderEs: "Describe el objetivo del reto..." },
            ]}
            values={translations}
            onChange={(key, value) => setTranslations((prev) => ({ ...prev, [key]: value }))}
          />
          <div className="space-y-2">
            <Label>Imagem de Capa</Label>
            <ImageUploader
              bucket="challenge-images"
              storagePath={`system/${tempId}`}
              currentImageUrl={coverUrl}
              onImageChange={handleImageChange}
              aspectRatio="video"
              placeholder="Arraste uma imagem do desafio ou clique para selecionar"
            />
          </div>
          <Button variant="outline" onClick={() => generateDays(durationDays)}>
            Gerar {durationDays} Dias
          </Button>
        </CardContent>
      </Card>

      {/* Days */}
      {days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dias do Desafio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {days.map((day) => {
              const taskCount = day.tasks?.length || 0;
              const isExpanded = expandedDays.includes(day.id);
              const TaskIcon = taskCount > 0 ? getTaskIcon(day.tasks![0].type) : Target;

              return (
                <Collapsible key={day.id} open={isExpanded}>
                  <Card className="border-dashed">
                    <CollapsibleTrigger asChild>
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
                        onClick={() => toggleDay(day.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {day.day_number}
                            </div>
                            <span className="font-medium">Dia {day.day_number}</span>
                            <Badge variant="secondary">
                              {taskCount} tarefa{taskCount !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {(day.tasks || []).map((task) => {
                          const Icon = getTaskIcon(task.type);
                          return (
                            <div
                              key={task.id}
                              className="p-3 rounded-lg border border-border bg-muted/30 space-y-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 grid gap-3 md:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Título</Label>
                                    <Input
                                      value={task.title}
                                      onChange={(e) =>
                                        updateTask(day.id, task.id, "title", e.target.value)
                                      }
                                      placeholder="Título da tarefa"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Tipo</Label>
                                    <Select
                                      value={task.type}
                                      onValueChange={(v) =>
                                        updateTask(day.id, task.id, "type", v)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TASK_TYPES.map((t) => (
                                          <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTask(day.id, task.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Content Selector */}
                              {(task.type === 'diet' || task.type === 'workout') && (
                                <div className="pl-11 pr-3 pb-2">
                                  <Label className="text-xs mb-1 block">Conteúdo Vinculado (Opcional)</Label>
                                  <TaskContentSelector
                                    taskType={task.type}
                                    value={{
                                      dish_id: task.dish_id,
                                      diet_plan_id: task.diet_plan_id,
                                      workout_id: task.workout_id,
                                      exercise_id: task.exercise_id
                                    }}
                                    onChange={(updates) => {
                                      // Bulk update task fields
                                      setDays(days.map(d => d.id === day.id ? {
                                        ...d,
                                        tasks: (d.tasks || []).map(t => t.id === task.id ? { ...t, ...updates } : t)
                                      } : d));
                                    }}
                                  />
                                </div>
                              )}

                              <div className="grid gap-3 md:grid-cols-3 pl-11">
                                <div className="space-y-1 md:col-span-1">
                                  <Label className="text-xs">Instrução</Label>
                                  <Input
                                    value={task.config?.instruction || ""}
                                    onChange={(e) =>
                                      updateTask(day.id, task.id, "instruction", e.target.value)
                                    }
                                    placeholder="Instrução clara..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Meta</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={task.config?.target || 1}
                                    onChange={(e) =>
                                      updateTask(day.id, task.id, "target", Number(e.target.value))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Unidade</Label>
                                  <Select
                                    value={task.config?.unit || ""}
                                    onValueChange={(v) =>
                                      updateTask(day.id, task.id, "unit", v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(TASK_UNITS[task.type] || []).map((u) => (
                                        <SelectItem key={u} value={u}>
                                          {u}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTask(day.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Tarefa
                          </Button>
                          {day.day_number > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyDayTasks(days[0].id, day.day_number)}
                            >
                              Copiar do Dia 1
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </CardContent >
        </Card >
      )}

      {/* Visibility Configuration */}
      <VisibilitySelector
        entityType="challenge"
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

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {challenge ? "Salvar Alterações" : "Criar Desafio"}
        </Button>
      </div>
    </div >
  );
}
