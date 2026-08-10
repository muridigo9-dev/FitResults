import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock, Utensils, Info } from "lucide-react";
import { DietPlan, DietPlanMeal, Dish, DietPlanMealOption } from "@/types/content";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { VisibilitySelector } from "./VisibilitySelector";
import type { VisibilityType } from "@/hooks/useUnifiedVisibility";
import { useAdminContent } from "@/hooks/useAdminContent";
import { ImageUploader } from "./ImageUploader";
import { toast } from "sonner";

interface DietPlanFormProps {
    plan?: DietPlan;
    onSave: (plan: any) => void;
    onCancel: () => void;
}

const MEAL_TYPES = [
    "Café da Manhã",
    "Lanche da Manhã",
    "Almoço",
    "Lanche da Tarde",
    "Jantar",
    "Ceia",
    "Pré-Treino",
    "Pós-Treino",
];

export function DietPlanForm({ plan, onSave, onCancel }: DietPlanFormProps) {
    // Use existing hook to get dishes
    const { diets: dishes } = useAdminContent();

    const [title, setTitle] = useState(plan?.title || "");
    const [description, setDescription] = useState(plan?.description || "");
    const [objective, setObjective] = useState(plan?.objective || "");
    const [isActive, setIsActive] = useState(plan?.isActive ?? true);
    const [visibilityType, setVisibilityType] = useState<VisibilityType>((plan as any)?.visibilityType || 'global');
    const [selectedPlans, setSelectedPlans] = useState<string[]>((plan as any)?.planIds || []);
    const [imageUrl, setImageUrl] = useState(plan?.imageUrl || "");
    const [imagePath, setImagePath] = useState(plan?.imagePath || "");
    const [durationDays, setDurationDays] = useState(plan?.durationDays || 7);
    const [objectiveBadge, setObjectiveBadge] = useState(plan?.objectiveBadge || "");

    const [sessions, setSessions] = useState<DietPlanMeal[]>(plan?.sessions || []);

    const tempId = useMemo(() => plan?.id || `new-plan-${Date.now()}`, [plan?.id]);

    const addMeal = () => {
        setSessions([
            ...sessions,
            {
                id: `temp-meal-${Date.now()}`,
                name: MEAL_TYPES[0],
                orderIndex: sessions.length + 1,
                items: [],
            }
        ]);
    };

    const removeMeal = (id: string) => {
        setSessions(sessions.filter(m => m.id !== id));
    };

    const updateMeal = (id: string, field: keyof DietPlanMeal, value: any) => {
        setSessions(sessions.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const addOptionToMeal = (mealId: string, dish: Dish) => {
        setSessions(sessions.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    items: [
                        ...m.items,
                        {
                            id: `temp-opt-${Date.now()}`,
                            dishId: dish.id,
                            dishTitle: dish.title,
                            dishImage: dish.imageUrl,
                            portionModifier: 1,
                            isMain: m.items.length === 0, // First item is main by default
                            macros: dish.macros
                        } as DietPlanMealOption
                    ]
                };
            }
            return m;
        }));
    };

    const removeOption = (mealId: string, optionId: string) => {
        setSessions(sessions.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    items: m.items.filter(o => o.id !== optionId)
                };
            }
            return m;
        }));
    };

    const updateOptionModifier = (mealId: string, optionId: string, modifier: number) => {
        setSessions(sessions.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    items: m.items.map(o => o.id === optionId ? { ...o, portionModifier: modifier } : o)
                };
            }
            return m;
        }));
    };

    const toggleMain = (mealId: string, optionId: string) => {
        setSessions(sessions.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    items: m.items.map(o => ({
                        ...o,
                        isMain: o.id === optionId
                    }))
                };
            }
            return m;
        }));
    };

    const [openComboboxId, setOpenComboboxId] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!title.trim()) {
            toast.error("O título do plano é obrigatório");
            return;
        }

        onSave({
            title,
            description,
            objective,
            isActive,
            sessions: sessions.map((m, idx) => ({ ...m, orderIndex: idx })),
            visibilityType,
            planIds: selectedPlans,
            imageUrl,
            imagePath,
            durationDays,
            objectiveBadge
        });
    };

    return (
        <div className="space-y-6">
            {/* Basic Info */}
            <Card className="overflow-hidden border-none shadow-premium bg-background/50 backdrop-blur-xl">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Informações do Plano
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-semibold">Título do Plano *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Plano de Emagrecimento Iniciante"
                                className="bg-background/50 border-primary/20 focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="objective" className="text-sm font-semibold">Objetivo</Label>
                            <Input
                                id="objective"
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                placeholder="Ex: Perder 5kg em 8 semanas"
                                className="bg-background/50 border-primary/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration" className="text-sm font-semibold">Duração (Dias)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={durationDays}
                                onChange={(e) => setDurationDays(Number(e.target.value))}
                                min={1}
                                className="bg-background/50 border-primary/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="badge" className="text-sm font-semibold">Selo de Objetivo (Ex: emagrecimento)</Label>
                            <Input
                                id="badge"
                                value={objectiveBadge}
                                onChange={(e) => setObjectiveBadge(e.target.value)}
                                placeholder="Selo visível no banner"
                                className="bg-background/50 border-primary/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-semibold">Descrição</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes sobre este protocolo nutricional..."
                            className="min-h-[100px] bg-background/50 border-primary/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Banner do Plano</Label>
                        <ImageUploader
                            bucket="diet-images"
                            storagePath={`plans/${tempId}`}
                            currentImageUrl={imageUrl}
                            currentImagePath={imagePath}
                            onImageChange={(d) => {
                                if (d.imageUrl !== undefined) setImageUrl(d.imageUrl || "");
                                if (d.imagePath !== undefined) setImagePath(d.imagePath || "");
                            }}
                            aspectRatio="video"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Visibility */}
            <VisibilitySelector
                entityType="diet_plan"
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

            {/* Meals Structure */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-primary" />
                        Refeições do Dia
                    </h3>
                    <Button onClick={addMeal} variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Refeição
                    </Button>
                </div>

                {sessions.length === 0 ? (
                    <Card className="border-dashed bg-muted/20">
                        <CardContent className="py-12 text-center text-muted-foreground italic">
                            Nenhuma refeição configurada neste plano.
                        </CardContent>
                    </Card>
                ) : (
                    sessions.map((meal, index) => (
                        <Card key={meal.id} className="relative overflow-hidden shadow-sm border-border/50">
                            <CardHeader className="pb-3 pt-4 bg-muted/10 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="grid place-items-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 font-semibold">
                                        <Select
                                            value={MEAL_TYPES.includes(meal.name) ? meal.name : "Custom"}
                                            onValueChange={(v) => updateMeal(meal.id, "name", v)}
                                        >
                                            <SelectTrigger className="h-9 bg-background">
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="time"
                                                className="h-9 bg-background"
                                                value={meal.timeSuggestion || ""}
                                                onChange={(e) => updateMeal(meal.id, "timeSuggestion", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => removeMeal(meal.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4 pt-4">
                                <div className="space-y-3 pl-10">
                                    {meal.items.length === 0 && (
                                        <p className="text-xs text-muted-foreground py-2 italic">Adicione opções de pratos para esta refeição.</p>
                                    )}

                                    {meal.items.map(opt => (
                                        <div key={opt.id} className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl text-sm transition-all border",
                                            opt.isMain ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/50"
                                        )}>
                                            <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden ring-1 ring-border">
                                                {opt.dishImage ? (
                                                    <img src={opt.dishImage} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <Utensils className="h-4 w-4 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate">{opt.dishTitle}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">
                                                    {opt.isMain ? "Opção Principal" : "Substituto / Equivalente"}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2 h-8">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Qt.</span>
                                                    <input
                                                        type="number"
                                                        className="w-12 text-right bg-transparent border-none focus:ring-0 text-sm font-bold"
                                                        step="0.1"
                                                        min="0.1"
                                                        value={opt.portionModifier}
                                                        onChange={(e) => updateOptionModifier(meal.id, opt.id, Number(e.target.value))}
                                                    />
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn("h-8 text-[10px] uppercase font-bold", opt.isMain ? "text-primary" : "text-muted-foreground")}
                                                    onClick={() => toggleMain(meal.id, opt.id)}
                                                >
                                                    {opt.isMain ? "Principal" : "Tornar Principal"}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => removeOption(meal.id, opt.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Popover open={openComboboxId === meal.id} onOpenChange={(open) => setOpenComboboxId(open ? meal.id : null)}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full border-dashed text-muted-foreground h-9 mt-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all">
                                                <Plus className="h-3.5 w-3.5 mr-2" /> Adicionar Prato da Biblioteca
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[300px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar prato..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum prato encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {dishes.map(dish => (
                                                            <CommandItem
                                                                key={dish.id}
                                                                value={dish.title}
                                                                onSelect={() => {
                                                                    addOptionToMeal(meal.id, dish as Dish);
                                                                    setOpenComboboxId(null);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className="h-8 w-8 rounded bg-muted mr-3 overflow-hidden flex-shrink-0">
                                                                    {dish.imageUrl && <img src={dish.imageUrl} className="h-full w-full object-cover" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm">{dish.title}</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase">{dish.macros.calories} kcal • {dish.macros.protein}g P</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-lg z-50">
                <Button variant="ghost" onClick={onCancel} className="px-8 font-semibold">
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || sessions.length === 0}
                    className="px-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                    {plan ? "Salvar Alterações" : "Criar Plano Alimentar"}
                </Button>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
