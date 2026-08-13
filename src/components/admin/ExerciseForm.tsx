import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { ImageUploader } from "./ImageUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, Dumbbell, Activity, Target } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { ExerciseType, ExerciseLevel } from "@/types/content";
import { VisibilitySelector } from "./VisibilitySelector";
import type { VisibilityType } from "@/hooks/useUnifiedVisibility";

// Types matching the provided modeling
export interface ExerciseFormValues {
    name: string;
    description: string;
    imageUrl?: string;
    imagePath?: string;
    muscleGroupIds: string[];
    planIds: string[];
    typeId?: string;
    levelId?: string;
    visibilityType?: VisibilityType;
}

interface ExerciseFormProps {
    initialData?: ExerciseFormValues & { id?: string };
    plans: any[];
    exerciseTypes: ExerciseType[];
    exerciseLevels: ExerciseLevel[];
    onSave: (data: ExerciseFormValues) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

/**
 * ExerciseForm - Premium form for creating/editing exercises.
 * Features: Name, Description, Image/GIF (Upload or Link), Multi-muscle selection.
 */
export function ExerciseForm({
    initialData,
    plans,
    exerciseTypes = [],
    exerciseLevels = [],
    onSave,
    onCancel,
    isSubmitting
}: ExerciseFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
    const [imagePath, setImagePath] = useState(initialData?.imagePath || "");
    const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]); // Initialize empty then effect
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [visibilityType, setVisibilityType] = useState<VisibilityType>(initialData?.visibilityType || 'plan_restricted');
    const [typeId, setTypeId] = useState(initialData?.typeId || "");
    const [levelId, setLevelId] = useState(initialData?.levelId || "");
    const [errors, setErrors] = useState<{ name?: string; typeId?: string; levelId?: string }>({});
    const [formId] = useState(() => initialData?.id || `new-${Date.now()}`);

    // Sync state when initialData changes (for stable editing)
    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setDescription(initialData.description || "");
            setImageUrl(initialData.imageUrl || "");
            setImagePath(initialData.imagePath || "");
            setSelectedMuscleGroups(initialData.muscleGroupIds || []);
            setSelectedPlans(initialData.planIds || []);
            setVisibilityType(initialData.visibilityType || 'plan_restricted');
            setTypeId(initialData.typeId || "");
            setLevelId(initialData.levelId || "");
        }
    }, [initialData?.id]); // Only re-sync if ID changes

    const { muscleGroups, isLoading: loadingMuscles } = useMuscleGroups();

    const handleMuscleToggle = (id: string) => {
        setSelectedMuscleGroups(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const handleImageChange = (data: { imageUrl?: string; imagePath?: string }) => {
        if (data.imagePath !== undefined) {
            setImagePath(data.imagePath || "");
            if (data.imagePath) setImageUrl("");
        }
        if (data.imageUrl !== undefined) {
            setImageUrl(data.imageUrl || "");
            if (data.imageUrl) setImagePath("");
        }
    };

    const validate = () => {
        const newErrors: { name?: string; typeId?: string; levelId?: string } = {};
        if (!name.trim()) newErrors.name = "O nome é obrigatório";
        if (!typeId) newErrors.typeId = "O tipo é obrigatório";
        if (!levelId) newErrors.levelId = "O nível é obrigatório";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({
                name,
                description,
                imageUrl,
                imagePath,
                muscleGroupIds: selectedMuscleGroups,
                planIds: selectedPlans,
                typeId,
                levelId,
                visibilityType,
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {initialData?.id ? "Editar Exercício" : "Novo Exercício"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                Nome do Exercício *
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Supino Reto com Barra"
                                className={cn(
                                    "h-12 bg-background/50 border-border/50 focus:border-primary transition-all",
                                    errors.name && "border-destructive ring-destructive/20"
                                )}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive flex items-center gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="h-4 w-4" />
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Taxonomy Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/30 border border-border/50">
                            <div className="space-y-2">
                                <Label htmlFor="exercise-type" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Tipo de Exercício *
                                </Label>
                                <Select value={typeId} onValueChange={setTypeId}>
                                    <SelectTrigger
                                        id="exercise-type"
                                        className={cn(
                                            "h-12 bg-background border-border/50 focus:border-primary transition-all",
                                            errors.typeId && "border-destructive ring-destructive/20"
                                        )}
                                    >
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exerciseTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                <div className="flex items-center gap-2">
                                                    {type.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.typeId && (
                                    <p className="text-xs text-destructive mt-1">{errors.typeId}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exercise-level" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" />
                                    Nível de Dificuldade *
                                </Label>
                                <Select value={levelId} onValueChange={setLevelId}>
                                    <SelectTrigger
                                        id="exercise-level"
                                        className={cn(
                                            "h-12 bg-background border-border/50 focus:border-primary transition-all",
                                            errors.levelId && "border-destructive ring-destructive/20"
                                        )}
                                    >
                                        <SelectValue placeholder="Selecione o nível" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exerciseLevels.map((level) => (
                                            <SelectItem key={level.id} value={level.id}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: level.colorCode || '#ccc' }}
                                                    />
                                                    {level.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.levelId && (
                                    <p className="text-xs text-destructive mt-1">{errors.levelId}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                Descrição & Instruções
                            </Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva a execução correta, dicas e pontos de atenção..."
                                className="min-h-[140px] resize-none bg-background/50 border-border/50 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                Imagem ou GIF (Upload ou Link)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Dica: prefira MP4 a GIF. Mesma qualidade com um arquivo muito menor,
                                e o app o reproduz em loop silencioso, igual a um GIF.
                            </p>
                        </div>

                        <div className="p-1 rounded-2xl bg-muted/20 border border-border/50">
                            <ImageUploader
                                bucket="exercises-media"
                                storagePath={`exercises/${formId}`}
                                currentImageUrl={imageUrl}
                                currentImagePath={imagePath}
                                onImageChange={handleImageChange}
                                aspectRatio="video"
                                allowVideo
                                placeholder="Solte aqui o GIF ou MP4 de execução do exercício"
                            />
                        </div>
                    </div>

                    {/* Muscle Groups Selection */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                Grupos Musculares Atingidos
                            </Label>
                            <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none font-bold">
                                {selectedMuscleGroups.length} selecionado(s)
                            </Badge>
                        </div>

                        {loadingMuscles ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="h-12 w-full animate-pulse bg-muted/50 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {muscleGroups.map((muscle) => {
                                    const isChecked = selectedMuscleGroups.includes(muscle.id);
                                    return (
                                        <button
                                            key={muscle.id}
                                            type="button"
                                            onClick={() => handleMuscleToggle(muscle.id)}
                                            className={cn(
                                                "group relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left",
                                                isChecked
                                                    ? "border-primary bg-primary/10 shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)]"
                                                    : "border-border/50 bg-background/50 hover:border-primary/50 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                isChecked ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
                                            )}>
                                                {isChecked && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <span className={cn(
                                                "text-sm font-medium transition-colors",
                                                isChecked ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {muscle.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Visibility/Plans Selection */}
                    <div className="pt-4 border-t border-border/50">
                        <VisibilitySelector
                            entityType="exercise"
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
                    </div>
                </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 p-4 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="hover:bg-destructive/10 hover:text-destructive"
                >
                    Descartar
                </Button>
                <Button
                    type="submit"
                    className="px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Processando..." : initialData?.id ? "Salvar Alterações" : "Publicar Exercício"}
                </Button>
            </div>
        </form>
    );
}
