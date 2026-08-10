import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Image as ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const COMMON_ICONS = [
    "dumbbell", "activity", "calendar", "heart", "timer", "trophy", "user",
    "scale", "ruler", "flame", "zap", "sword", "shield", "target", "map-pin",
    "navigation", "settings", "search", "menu", "x", "plus", "minus", "check",
    "camera", "video", "image", "file", "folder", "home", "play", "pause"
].sort();


interface TaxonomyFormProps {
    type: "exercise-type" | "exercise-level" | "muscle-group";
    initialData?: any;
    onSave: (data: any) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function TaxonomyForm({ type, initialData, onSave, onCancel, isSubmitting }: TaxonomyFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [slug, setSlug] = useState(initialData?.slug || "");
    const [icon, setIcon] = useState(initialData?.icon || "");
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
    const [imagePath, setImagePath] = useState(initialData?.imagePath || "");
    const [colorCode, setColorCode] = useState(initialData?.color_code || initialData?.colorCode || "");
    const [sortOrder, setSortOrder] = useState(initialData?.sort_order || initialData?.sortOrder || 0);
    const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

    // Display Mode for Muscle Groups: "icon" or "image"
    // If we have an image, default to "image", otherwise "icon"
    const [displayMode, setDisplayMode] = useState<"icon" | "image">(
        (initialData?.imageUrl || initialData?.imagePath) ? "image" : "icon"
    );

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setSlug(initialData.slug || "");
            setIcon(initialData.icon || "");
            setImageUrl(initialData.imageUrl || "");
            setImagePath(initialData.imagePath || "");
            setColorCode(initialData.color_code || initialData.colorCode || "");
            setSortOrder(initialData.sort_order || initialData.sortOrder || 0);

            if (type === "muscle-group") {
                setDisplayMode((initialData.imageUrl || initialData.imagePath) ? "image" : "icon");
            }
        }
    }, [initialData, type]);

    const validate = () => {
        const newErrors: { name?: string; slug?: string } = {};
        if (!name.trim()) newErrors.name = "O nome é obrigatório";
        if (!slug.trim()) newErrors.slug = "O slug é obrigatório";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const data: any = {
                name,
                slug,
                colorCode,
                sortOrder: Number(sortOrder),
            };

            if (type === "muscle-group") {
                if (displayMode === "image") {
                    data.imageUrl = imageUrl;
                    data.imagePath = imagePath;
                    data.icon = ""; // Clear icon if image is selected? Or keep both? Keeping both is safer, but UI dictates "one or other".
                    // For now, let's keep icon accessible if we switch back, but strictly speaking "use image" implies filtering logic check for image.
                } else {
                    data.icon = icon;
                    data.imageUrl = null; // Explicitly clear image to fallback to icon
                    data.imagePath = null;
                }
            } else {
                data.icon = icon;
            }

            onSave(data);
        }
    };

    const getTitle = () => {
        const titles = {
            "exercise-type": "Tipo de Exercício",
            "exercise-level": "Nível de Dificuldade",
            "muscle-group": "Grupo Muscular",
        };
        return `${initialData?.id ? "Editar" : "Novo"} ${titles[type]}`;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {getTitle()}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!initialData?.id) {
                                        setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''));
                                    }
                                }}
                                placeholder="Ex: Força"
                                className={cn(errors.name && "border-destructive")}
                            />
                            {errors.name && <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (URL/ID) *</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="ex: forca"
                                className={cn(errors.slug && "border-destructive")}
                            />
                            {errors.slug && <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{errors.slug}</p>}
                        </div>

                        {type === "muscle-group" && (
                            <div className="md:col-span-2 space-y-4 border rounded-lg p-4 bg-muted/20">
                                <Label className="text-base font-semibold">Modo de Exibição</Label>
                                <RadioGroup
                                    value={displayMode}
                                    onValueChange={(v) => setDisplayMode(v as "icon" | "image")}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors bg-background">
                                        <RadioGroupItem value="icon" id="mode-icon" />
                                        <Label htmlFor="mode-icon" className="flex items-center gap-2 cursor-pointer">
                                            <Type className="h-4 w-4" />
                                            Ícone (Lucide)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors bg-background">
                                        <RadioGroupItem value="image" id="mode-image" />
                                        <Label htmlFor="mode-image" className="flex items-center gap-2 cursor-pointer">
                                            <ImageIcon className="h-4 w-4" />
                                            Imagem
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {displayMode === "icon" ? (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label htmlFor="icon">Ícone (Lucide)</Label>
                                        <Select
                                            value={icon}
                                            onValueChange={setIcon}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecione um ícone" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="p-2">
                                                    <Input
                                                        placeholder="Filtrar ícones..."
                                                        className="mb-2 h-8"
                                                        onChange={(e) => { }}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <ScrollArea className="h-[200px]">
                                                    {COMMON_ICONS.map((iconName) => (
                                                        <SelectItem key={iconName} value={iconName}>
                                                            <div className="flex items-center gap-2">
                                                                <span>{iconName}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </ScrollArea>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Selecione um ícone da lista.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label>Imagem do Grupo Muscular</Label>
                                        <ImageUploader
                                            bucket="muscle-groups"
                                            storagePath="admin-uploads"
                                            currentImageUrl={imageUrl}
                                            currentImagePath={imagePath}
                                            onImageChange={({ imageUrl, imagePath }) => {
                                                setImageUrl(imageUrl || "");
                                                setImagePath(imagePath || "");
                                            }}
                                            aspectRatio="square"
                                            placeholder="Imagem do músculo (quadrada)"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {type !== "exercise-level" && type !== "muscle-group" && (
                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícone (Lucide)</Label>
                                <Select
                                    value={icon}
                                    onValueChange={setIcon}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione um ícone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2">
                                            <Input
                                                placeholder="Filtrar ícones..."
                                                className="mb-2 h-8"
                                                onChange={(e) => {
                                                    // Simple client-side filter could be added here if needed, 
                                                    // but for now let's just list common ones.
                                                }}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <ScrollArea className="h-[200px]">
                                            {COMMON_ICONS.map((iconName) => (
                                                <SelectItem key={iconName} value={iconName}>
                                                    <div className="flex items-center gap-2">
                                                        {/* Dynamic Icon Render would be ideal, but for now text is fine */}
                                                        <span>{iconName}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {type === "exercise-level" && (
                            <div className="space-y-2">
                                <Label htmlFor="color">Cor (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        value={colorCode || "#3b82f6"}
                                        onChange={(e) => setColorCode(e.target.value)}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={colorCode}
                                        onChange={(e) => setColorCode(e.target.value)}
                                        placeholder="#3b82f6"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="sort">Ordem de Exibição</Label>
                            <Input
                                id="sort"
                                type="number"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
