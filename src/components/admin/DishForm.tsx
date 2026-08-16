import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, AlertTriangle, Calculator, Search } from "lucide-react";
import { Dish, DishIngredient, PreparationStep, DietMacros } from "@/types/content";
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
import { ImageUploader } from "./ImageUploader";
import { ContentAssignmentSelector } from "./ContentAssignmentSelector";
import { VisibilitySelector } from "./VisibilitySelector";
import type { VisibilityType } from "@/hooks/useUnifiedVisibility";
import { useAdminIngredients } from "@/hooks/useAdminIngredients";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TranslationFields } from "./TranslationFields";

interface DishFormProps {
  // Use 'dish' prop name for clarity, but support 'diet' for backward compatibility if needed, 
  // though we should invoke it with 'diet' prop from AdminContent until fully renamed there.
  diet?: Dish & { imagePath?: string };
  onSave: (dish: Omit<Dish, "id" | "createdAt"> & { imagePath?: string; visibilityType?: VisibilityType; planIds?: string[] }) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  "Emagrecimento",
  "Ganho de Massa",
  "Manutenção",
  "Low Carb",
  "Cetogênica",
  "Vegetariana",
  "Vegana",
  "Mediterrânea",
];

const LEGACY_UNITS = ["g", "ml", "unidade", "colher de sopa", "colher de chá", "xícara", "a gosto"];

export function DishForm({ diet, onSave, onCancel }: DishFormProps) {
  // Data
  const { ingredients: availableIngredients } = useAdminIngredients();

  // State
  const [title, setTitle] = useState(diet?.title || "");
  const [translations, setTranslations] = useState<Record<string, string>>({
    titleEn: (diet as any)?.titleEn || "",
    titleEs: (diet as any)?.titleEs || "",
    descriptionEn: (diet as any)?.descriptionEn || "",
    descriptionEs: (diet as any)?.descriptionEs || "",
  });
  const [description, setDescription] = useState(diet?.description || "");
  const [imageUrl, setImageUrl] = useState(diet?.imageUrl || "");
  const [imagePath, setImagePath] = useState(diet?.imagePath || "");
  const [category, setCategory] = useState(diet?.category || "");

  const [dishIngredients, setDishIngredients] = useState<DishIngredient[]>(
    diet?.ingredients || []
  );

  const [preparation, setPreparation] = useState<PreparationStep[]>(
    diet?.preparation || []
  );

  const [macros, setMacros] = useState<DietMacros>(
    diet?.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const [isActive, setIsActive] = useState(diet?.isActive ?? true);
  const [visibilityType, setVisibilityType] = useState<VisibilityType>((diet as any)?.visibilityType || 'global');
  const [selectedPlans, setSelectedPlans] = useState<string[]>((diet as any)?.planIds || []);

  // Calculate Macros
  useEffect(() => {
    // Only auto-calculate if we have at least one SMART ingredient
    // If all are legacy, we rely on manual input (or previous values)
    const smartIngredients = dishIngredients.filter(i => !i.isLegacy && i.ingredientId);

    if (smartIngredients.length > 0) {
      let newMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      smartIngredients.forEach(ing => {
        // Find reference ingredient
        const ref = availableIngredients.find(i => i.id === ing.ingredientId);
        if (ref) {
          const qty = Number(ing.quantity) || 0;
          const ratio = qty / ref.referenceValue;
          newMacros.calories += ref.calories * ratio;
          newMacros.protein += ref.protein * ratio;
          newMacros.carbs += ref.carbs * ratio;
          newMacros.fat += ref.fat * ratio;
        }
      });

      // If we also have legacy ingredients, we ideally shouldn't overwrite if the user manually set something higher?
      // But "Macros are never manually entered". So we should warn.
      // For now, let's ADD the manual values? No, we don't know manual values of legacy ingredients individually.
      // Strategy: If mixed, we show calculated Part + Manual Adjustment?
      // Simplest: Just set Calculated. If Legacy exists, user acknowledges macros might be off unless they add manual adjustment.
      // Actually, let's allows Manual Override. Use calculated as "Suggested".

      // Let's just set them, but rounded
      setMacros({
        calories: Math.round(newMacros.calories),
        protein: Math.round(newMacros.protein),
        carbs: Math.round(newMacros.carbs),
        fat: Math.round(newMacros.fat),
      });
    }
  }, [dishIngredients, availableIngredients]);

  // Generate a temporary ID for new diets to use in storage path
  const tempId = useMemo(() => diet?.id || `new-${Date.now()}`, [diet?.id]);

  // --- Ingredient Actions ---
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const addSmartIngredient = (ingredientId: string) => {
    const ref = availableIngredients.find(i => i.id === ingredientId);
    if (!ref) return;

    setDishIngredients([
      ...dishIngredients,
      {
        id: `temp-${Date.now()}`,
        ingredientId: ref.id,
        name: ref.name,
        quantity: 100, // Default 100g/ml or 1 unit
        unit: ref.unit,
        isLegacy: false,
      }
    ]);
    setSelectedIngredientId("");
    setIsComboboxOpen(false);
  };

  const updateDishIngredient = (id: string, field: keyof DishIngredient, value: any) => {
    setDishIngredients(prev => prev.map(ing => {
      if (ing.id === id) {
        return { ...ing, [field]: value };
      }
      return ing;
    }));
  };

  const removeIngredient = (id: string) => {
    setDishIngredients(dishIngredients.filter((ing) => ing.id !== id));
  };

  // --- Preparation Actions ---
  const addStep = () => {
    setPreparation([
      ...preparation,
      { id: Date.now().toString(), order: preparation.length + 1, description: "" },
    ]);
  };

  const updateStep = (id: string, description: string) => {
    setPreparation(
      preparation.map((step) =>
        step.id === id ? { ...step, description } : step
      )
    );
  };

  const removeStep = (id: string) => {
    setPreparation(
      preparation
        .filter((step) => step.id !== id)
        .map((step, idx) => ({ ...step, order: idx + 1 }))
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

  const handleSubmit = () => {
    onSave({
      title,
      description,
      ...translations,
      imageUrl,
      imagePath: imagePath || undefined,
      category,
      ingredients: dishIngredients, // Contains both Smart and Legacy
      preparation,
      macros,
      isActive,
      visibilityType,
      planIds: selectedPlans,
    });
  };

  const hasLegacyIngredients = dishIngredients.some(i => i.isLegacy);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Prato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Nome do Prato *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Frango Grelhado com Arroz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
              placeholder="Descreva o prato..."
              rows={3}
            />
          </div>
          <TranslationFields
            fields={[
              { key: "title", label: "Nome do Prato", placeholderEn: "Ex: Grilled Chicken with Rice", placeholderEs: "Ej: Pollo a la Plancha con Arroz" },
              { key: "description", label: "Descrição", multiline: true, placeholderEn: "Describe the dish...", placeholderEs: "Describe el plato..." },
            ]}
            values={translations}
            onChange={(key, value) => setTranslations((prev) => ({ ...prev, [key]: value }))}
          />
          <div className="space-y-2">
            <Label>Imagem</Label>
            <ImageUploader
              bucket="diet-images" // Keep using diet-images bucket
              storagePath={`system/${tempId}`}
              currentImageUrl={imageUrl}
              currentImagePath={imagePath}
              onImageChange={handleImageChange}
              aspectRatio="video"
              placeholder="Arraste uma imagem do prato"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ingredientes e Composição</CardTitle>
          <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between">
                Adicionar Ingrediente
                <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Buscar ingrediente..." />
                <CommandList>
                  <CommandEmpty>Nenhum ingrediente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {availableIngredients.map((ing) => (
                      <CommandItem
                        key={ing.id}
                        value={ing.name}
                        onSelect={() => addSmartIngredient(ing.id)}
                      >
                        <span>{ing.name}</span>
                        <span className="ml-auto text-muted-foreground text-xs">({ing.calories}kcal/{ing.referenceValue}{ing.unit})</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {hasLegacyIngredients && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <strong>Ingredientes Legados Detectados:</strong> Este prato contém ingredientes de texto livre.
                Os macros podem não ser calculados corretamente. Substitua-os por ingredientes do sistema para precisão.
              </div>
            </div>
          )}

          {dishIngredients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Adicione ingredientes para calcular os macros automaticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dishIngredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                  <div className="flex-1">
                    <p className="font-medium text-sm flex items-center gap-2">
                      {ing.name}
                      {ing.isLegacy && <Badge variant="secondary" className="text-[10px] h-5">Texto Livre</Badge>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="sr-only">Quantidade</Label>
                    <Input
                      type={ing.isLegacy ? "text" : "number"}
                      value={ing.quantity}
                      onChange={(e) => updateDishIngredient(ing.id, "quantity", e.target.value)}
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground w-12">{ing.unit}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeIngredient(ing.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Macros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Macronutrientes Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias (kcal)</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                value={macros.calories}
                // Allow manual override
                onChange={(e) => setMacros({ ...macros, calories: Number(e.target.value) })}
                className="font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Proteína (g)</Label>
              <Input
                id="protein"
                type="number"
                min="0"
                value={macros.protein}
                onChange={(e) => setMacros({ ...macros, protein: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carboidratos (g)</Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                value={macros.carbs}
                onChange={(e) => setMacros({ ...macros, carbs: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Gorduras (g)</Label>
              <Input
                id="fat"
                type="number"
                min="0"
                value={macros.fat}
                onChange={(e) => setMacros({ ...macros, fat: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preparation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Modo de Preparo</CardTitle>
          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Passo
          </Button>
        </CardHeader>
        <CardContent>
          {preparation.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum passo adicionado
            </p>
          ) : (
            <div className="space-y-3">
              {preparation.map((step) => (
                <div key={step.id} className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0 mt-1">
                    {step.order}
                  </div>
                  <Textarea
                    value={step.description}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    placeholder="Descreva este passo..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(step.id)}
                    className="text-destructive hover:text-destructive mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibility Configuration */}
      <VisibilitySelector
        entityType="dish"
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
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!title.trim()}>
          {diet ? "Salvar Alterações" : "Criar Prato"}
        </Button>
      </div>
    </div>
  );
}
