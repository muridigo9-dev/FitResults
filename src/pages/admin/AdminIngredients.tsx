import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button as GhostButton } from "@/components/ui/button";
import { useRef } from "react";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Loader2, Download, Upload } from "lucide-react";
import { useAdminIngredients } from "@/hooks/useAdminIngredients";
import { Ingredient } from "@/types/content";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

export function AdminIngredients() {
    const { ingredients, isLoading, saveIngredient, toggleIngredientActive, deleteIngredient, exportIngredients, importIngredients } = useAdminIngredients();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("create") === "true") {
            handleCreate();
            // Optional: Clean up URL after opening
            // navigate(location.pathname, { replace: true });
        }
    }, [location.search]);

    const handleExport = async () => {
        await exportIngredients();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (entry) => {
            const text = entry.target?.result as string;
            try {
                await importIngredients(text);
            } catch (e) { } // Error handled in hook
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const handleCreate = () => {
        setEditingIngredient({
            name: "",
            unit: "g",
            referenceValue: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            isActive: true
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editingIngredient) return;
        setIsSaving(true);
        try {
            await saveIngredient(editingIngredient.id, editingIngredient as Ingredient);
            setIsDialogOpen(false);
            setEditingIngredient(null);
            toast.success("Ingrediente salvo!");
        } catch {
            toast.error("Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (ing: Ingredient) => {
        try {
            await toggleIngredientActive(ing.id, !ing.isActive);
            toast.success(`Ingrediente ${!ing.isActive ? "ativado" : "desativado"}`);
        } catch {
            toast.error("Erro ao alterar status");
        }
    }

    const handleEdit = (ing: Ingredient) => {
        setEditingIngredient(ing);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este ingrediente?")) {
            try {
                await deleteIngredient(id);
                toast.success("Ingrediente excluído");
            } catch {
                toast.error("Erro ao excluir");
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-full xl:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ingredientes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                    />
                    <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
                        <Download className="h-4 w-4 mr-2" />
                        <span className="truncate">Exportar JSON</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImportClick} className="flex-1 sm:flex-none">
                        <Upload className="h-4 w-4 mr-2" />
                        <span className="truncate">Importar JSON</span>
                    </Button>
                    <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Ingrediente
                    </Button>
                </div>
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Unidade Ref.</TableHead>
                                <TableHead>Kcal</TableHead>
                                <TableHead>Prot (g)</TableHead>
                                <TableHead>Carb (g)</TableHead>
                                <TableHead>Gord (g)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredIngredients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhum ingrediente encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredIngredients.map((ing) => (
                                    <TableRow key={ing.id}>
                                        <TableCell className="font-medium">{ing.name}</TableCell>
                                        <TableCell>{ing.referenceValue}{ing.unit}</TableCell>
                                        <TableCell>{ing.calories}</TableCell>
                                        <TableCell>{ing.protein}</TableCell>
                                        <TableCell>{ing.carbs}</TableCell>
                                        <TableCell>{ing.fat}</TableCell>
                                        <TableCell>
                                            <Badge variant={ing.isActive ? "success" : "secondary"}>
                                                {ing.isActive ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <GhostButton variant="ghost" size="icon" onClick={() => handleToggleActive(ing)}>
                                                    {ing.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </GhostButton>
                                                <GhostButton variant="ghost" size="icon" onClick={() => handleEdit(ing)}>
                                                    <Edit className="h-4 w-4" />
                                                </GhostButton>
                                                <GhostButton variant="ghost" size="icon" onClick={() => handleDelete(ing.id)} className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </GhostButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </div>
                ) : filteredIngredients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        Nenhum ingrediente encontrado
                    </div>
                ) : (
                    filteredIngredients.map((ing) => (
                        <Card key={ing.id}>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{ing.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Ref: {ing.referenceValue}{ing.unit}
                                        </p>
                                    </div>
                                    <Badge variant={ing.isActive ? "success" : "secondary"}>
                                        {ing.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-center text-sm bg-muted/30 p-2 rounded-lg">
                                    <div>
                                        <div className="font-bold text-muted-foreground text-xs">Kcal</div>
                                        <div>{ing.calories}</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-muted-foreground text-xs">Prot</div>
                                        <div>{ing.protein}</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-muted-foreground text-xs">Carb</div>
                                        <div>{ing.carbs}</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-muted-foreground text-xs">Gord</div>
                                        <div>{ing.fat}</div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-3">
                                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(ing)} className="w-full sm:w-auto">
                                        {ing.isActive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                                        {ing.isActive ? "Desativar" : "Ativar"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(ing)} className="w-full sm:w-auto">
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(ing.id)} className="w-full sm:w-auto">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingIngredient?.id ? "Editar Ingrediente" : "Novo Ingrediente"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={editingIngredient?.name || ""}
                                onChange={(e) => setEditingIngredient(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Arroz Branco Cozido"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="unit">Unidade de Medida</Label>
                                <Select
                                    value={editingIngredient?.unit || "g"}
                                    onValueChange={(v) => setEditingIngredient(prev => ({ ...prev, unit: v, referenceValue: v === 'unidade' ? 1 : 100 }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="g">Gramas (g)</SelectItem>
                                        <SelectItem value="ml">Mililitros (ml)</SelectItem>
                                        <SelectItem value="unidade">Unidade</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="referenceValue">Valor de Referência</Label>
                                <Input
                                    id="referenceValue"
                                    type="number"
                                    value={editingIngredient?.referenceValue || 0}
                                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, referenceValue: Number(e.target.value) }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ex: 100 para 100g, 1 para 1 unidade
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="calories">Kcal</Label>
                                <Input
                                    id="calories"
                                    type="number"
                                    min="0"
                                    value={editingIngredient?.calories || 0}
                                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, calories: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="protein">Prot</Label>
                                <Input
                                    id="protein"
                                    type="number"
                                    min="0"
                                    value={editingIngredient?.protein || 0}
                                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, protein: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="carbs">Carb</Label>
                                <Input
                                    id="carbs"
                                    type="number"
                                    min="0"
                                    value={editingIngredient?.carbs || 0}
                                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, carbs: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="fat">Gord</Label>
                                <Input
                                    id="fat"
                                    type="number"
                                    min="0"
                                    value={editingIngredient?.fat || 0}
                                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, fat: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
