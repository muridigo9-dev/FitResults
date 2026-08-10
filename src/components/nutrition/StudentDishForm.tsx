import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Search, Calculator, ArrowLeft, Loader2 } from "lucide-react";
import { Diet, DishIngredient, PreparationStep, DietMacros } from "@/types/content";
import { useStudentNutrition } from "@/hooks/useStudentNutrition";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";
import { getStoragePath } from "@/hooks/useStorageUpload";

interface StudentDishFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: Diet | null;
}

const CATEGORIES = [
    "Café da Manhã",
    "Almoço",
    "Jantar",
    "Lanche",
    "Pré-Treino",
    "Pós-Treino",
    "Ceia",
    "Outro",
];

export function StudentDishForm({ onSuccess, onCancel, initialData }: StudentDishFormProps) {
    const { user } = useAuth();
    const { ingredients: availableIngredients, createDish, updateDish, isCreating, isUpdating } = useStudentNutrition();

    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [category, setCategory] = useState(initialData?.category || "");
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
    const [imagePath, setImagePath] = useState(initialData?.imagePath || "");

    // Map initial ingredients to form format specific if needed
    const [dishIngredients, setDishIngredients] = useState<DishIngredient[]>(
        initialData?.ingredients?.map(ing => ({
            ...ing,
            // Ensure unique ID for list if coming from DB
            id: ing.id || `temp-${Math.random()}`
        })) || []
    );

    const [preparation, setPreparation] = useState<PreparationStep[]>(initialData?.preparation || []);

    // Combobox state
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);

    // Auto-calculate Macros
    const macros = useMemo(() => {
        let newMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        dishIngredients.forEach(ing => {
            if (ing.ingredientId) {
                const ref = availableIngredients.find(i => i.id === ing.ingredientId);
                if (ref) {
                    const qty = Number(ing.quantity) || 0;
                    const ratio = qty / ref.referenceValue;
                    newMacros.calories += ref.calories * ratio;
                    newMacros.protein += ref.protein * ratio;
                    newMacros.carbs += ref.carbs * ratio;
                    newMacros.fat += ref.fat * ratio;
                }
            } else if (initialData && ing.isLegacy) {
                // Fallback for legacy ingredients if editing old dishes (though students shouldn't have them)
                // For now, ignore macro calc for legacy or use existing logic if adapted
            }
        });

        return {
            calories: Math.round(newMacros.calories),
            protein: Math.round(newMacros.protein),
            carbs: Math.round(newMacros.carbs),
            fat: Math.round(newMacros.fat),
        };
    }, [dishIngredients, availableIngredients, initialData]);

    const addIngredient = (ingredientId: string) => {
        const ref = availableIngredients.find(i => i.id === ingredientId);
        if (!ref) return;

        setDishIngredients([
            ...dishIngredients,
            {
                id: `temp-${Date.now()}`,
                ingredientId: ref.id,
                name: ref.name,
                quantity: 100, // Default 100g
                unit: ref.unit,
                isLegacy: false,
            }
        ]);
        setIsComboboxOpen(false);
    };

    const removeIngredient = (id: string) => {
        setDishIngredients(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, qty: string) => {
        setDishIngredients(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    };

    const addStep = () => {
        setPreparation([...preparation, { id: Date.now().toString(), order: preparation.length + 1, description: "" }]);
    };

    const updateStep = (id: string, text: string) => {
        setPreparation(prev => prev.map(s => s.id === id ? { ...s, description: text } : s));
    };

    const removeStep = (id: string) => {
        setPreparation(prev => prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));
    };

    const handleSubmit = async () => {
        if (!title.trim() || dishIngredients.length === 0) return;

        const dishData = {
            title,
            description,
            category,
            imageUrl: imageUrl,
            imagePath: imagePath,
            ingredients: dishIngredients,
            preparation,
            macros,
            visibilityType: 'private',
            planIds: [],
        } as any;

        if (initialData?.id) {
            await updateDish({ id: initialData.id, data: dishData });
        } else {
            await createDish(dishData);
        }

        onSuccess();
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-bold">{initialData ? "Editar Prato" : "Criar Meu Prato"}</h1>
                </div>
                <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isCreating || isUpdating || !title || dishIngredients.length === 0}
                    className="md:hidden"
                >
                    {isCreating || isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar"}
                </Button>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Foto do Prato</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ImageUploader
                            bucket="diet-images"
                            storagePath={getStoragePath("diet", initialData?.id || "temp-" + Date.now(), true, user?.id)}
                            currentImageUrl={imageUrl}
                            currentImagePath={imagePath}
                            onImageChange={({ imageUrl, imagePath }) => {
                                if (imageUrl !== undefined) setImageUrl(imageUrl);
                                if (imagePath !== undefined) setImagePath(imagePath);
                            }}
                            placeholder="Tirar Foto ou Upload"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Prato *</Label>
                            <Input
                                placeholder="Ex: Minha Tapioca Proteica"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Refeição</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição (Opcional)</Label>
                            <Textarea
                                placeholder="Ex: Receita rápida para pré-treino..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-base">Ingredientes *</CardTitle>
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar alimento..." />
                                    <CommandList>
                                        <CommandEmpty>Não encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {availableIngredients.map(ing => (
                                                <CommandItem key={ing.id} value={ing.name} onSelect={() => addIngredient(ing.id)}>
                                                    <span>{ing.name}</span>
                                                    <span className="ml-auto text-xs text-muted-foreground">{ing.calories}kcal</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent className="py-2">
                        {dishIngredients.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
                                <p className="text-sm">Adicione alimentos para montar seu prato</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dishIngredients.map(ing => (
                                    <div key={ing.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{ing.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {ing.unit} | {availableIngredients.find(i => i.id === ing.ingredientId)?.calories} kcal/{availableIngredients.find(i => i.id === ing.ingredientId)?.referenceValue}{ing.unit}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-20 text-right h-8"
                                                value={ing.quantity}
                                                onChange={(e) => updateQuantity(ing.id, e.target.value)}
                                            />
                                            <span className="text-xs w-8 text-muted-foreground">{ing.unit}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeIngredient(ing.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    {dishIngredients.length > 0 && (
                        <div className="bg-muted/50 p-4 border-t flex justify-between items-center text-sm font-medium">
                            <span className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Total Estimado:</span>
                            <div className="flex gap-3">
                                <Badge variant="outline">{macros.calories} kcal</Badge>
                                <span className="text-muted-foreground text-xs my-auto">P: {macros.protein}g C: {macros.carbs}g G: {macros.fat}g</span>
                            </div>
                        </div>
                    )}
                </Card>

                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Modo de Preparo</CardTitle>
                        <Button variant="ghost" size="sm" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Passo</Button>
                    </CardHeader>
                    <CardContent className="py-2 pb-6">
                        {preparation.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Opcional.</p>
                        ) : (
                            <div className="space-y-2">
                                {preparation.map((step, idx) => (
                                    <div key={step.id} className="flex gap-2">
                                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 mt-2">{idx + 1}</span>
                                        <Textarea
                                            value={step.description}
                                            onChange={e => updateStep(step.id, e.target.value)}
                                            className="min-h-[60px]"
                                            placeholder={`Passo ${idx + 1}`}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)} className="mt-2"><Trash2 className="h-4 w-4 opacity-50" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t flex gap-3 z-50 md:static md:bg-transparent md:border-0 md:p-0 mt-6 mx-4 rounded-xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:shadow-none md:mx-0">
                <Button variant="outline" className="flex-1 md:flex-none" onClick={onCancel}>Cancelar</Button>
                <Button className="flex-1 md:w-48" onClick={handleSubmit} disabled={isCreating || isUpdating || !title || dishIngredients.length === 0}>
                    {isCreating || isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {initialData ? "Atualizar Prato" : "Salvar Prato"}
                </Button>
            </div>
        </div>
    );
}
