
import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    MoreVertical,
    Utensils,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    FileText,
    User
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DishForm } from "@/components/admin/DishForm";
import { useAdminContent } from "@/hooks/useAdminContent";
import { Skeleton } from "@/components/ui/skeleton";
import type { Diet } from "@/types/content";

type ViewMode = "list" | "form";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useAdminDishes } from "@/hooks/useAdminDishes";

// ... (retain imports)

export default function AdminDishesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [activeTab, setActiveTab] = useState<"system" | "community">("system");
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        dishes: diets, // Alias for compatibility with rest of component logic momentarily
        isLoading,
        deleteDish,
        exportDishes,
        importDishes
    } = useAdminDishes();

    // ... (helpers)

    const handleExport = async () => {
        await exportDishes();
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
            try { await importDishes(text); } catch (e) { }
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const getEditingItem = () => {
        if (!editingId) return undefined;
        return diets.find((item) => item.id === editingId) as any;
    };

    const filteredContent = diets.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const isSystem = item.visibilityType === "global";

        if (activeTab === "system") return matchesSearch && isSystem;
        return matchesSearch && !isSystem;
    });

    const handleCreate = () => {
        setEditingId(null);
        setViewMode("form");
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setViewMode("form");
    };

    const handleSaveDiet = async (data: any) => {
        try {
            // TODO: Implement save logic in useAdminDishes hook
            // useAdminDishes doesn't expose save yet, assume legacy for now or placeholder
            toast.info("Funcionalidade de salvar em migração para novo esquema RPC");
            setViewMode("list");
            setEditingId(null);
        } catch {
            toast.error("Erro ao salvar prato");
        }
    };

    const handleToggleActive = async (id: string) => {
        // TODO: Implement toggle
        toast.info("Toggle em migração");
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDish(id);
        } catch { } // Error handled in hook
    };

    const handleCancel = () => {
        setViewMode("list");
        setEditingId(null);
    };

    if (viewMode === "form") {
        const editingItem = getEditingItem();
        return (
            <AdminLayout title={`${editingId ? "Editar" : "Novo"} Prato`}>
                <div className="space-y-4">
                    <Button variant="ghost" onClick={handleCancel} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Button>
                    <ScrollArea className="h-[calc(100vh-200px)]">
                        <DishForm diet={editingItem} onSave={handleSaveDiet} onCancel={handleCancel} />
                    </ScrollArea>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Gestão de Pratos">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar pratos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
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
                        <Button variant="outline" onClick={() => {
                            const template = [
                                {
                                    "title": "Prato Exemplo",
                                    "description": "Descrição do prato",
                                    "category": "Almoço",
                                    "calories": 500,
                                    "protein": 30,
                                    "carbs": 50,
                                    "fats": 20,
                                    "ingredients": [
                                        { "name": "Arroz", "amount": 100, "unit": "g" }
                                    ],
                                    "preparation_steps": ["Passo 1", "Passo 2"]
                                }
                            ];
                            const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "modelo_importacao_pratos.json";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Modelo
                        </Button>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                        <Button variant="outline" onClick={handleImportClick}>
                            <Upload className="h-4 w-4 mr-2" />
                            Importar
                        </Button>
                        <Button onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Prato
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{diets.length}</p>}
                            <p className="text-sm text-muted-foreground">Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-success">{diets.filter((c) => c.isActive).length}</p>}
                            <p className="text-sm text-muted-foreground">Ativos</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-habit-workout">{diets.filter((c) => c.visibilityType !== 'global').length}</p>}
                            <p className="text-sm text-muted-foreground">Comunidade</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Utensils className="h-5 w-5 text-habit-meals" />
                            Pratos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-6">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="system">Sistema</TabsTrigger>
                                <TabsTrigger value="community">Comunidade (Usuários)</TabsTrigger>
                            </TabsList>
                        </Tabs>

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
                                title="Nenhum prato encontrado"
                                description={searchQuery ? `Não há resultados para "${searchQuery}"` : "Clique em 'Novo Prato' para adicionar"}
                                action={!searchQuery ? { label: "Criar primeiro", onClick: handleCreate } : undefined}
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredContent.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.isActive ? "bg-habit-meals/10" : "bg-muted"}`}>
                                            <Utensils className={`h-5 w-5 ${item.isActive ? "text-habit-meals" : "text-muted-foreground"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">{item.title}</p>
                                                {item.category && <Badge variant="secondary">{item.category}</Badge>}
                                                {item.visibilityType === 'private' && <Badge variant="outline" className="text-[10px] uppercase">Privado</Badge>}
                                                {item.visibilityType === 'academy' && <Badge variant="outline" className="text-[10px] uppercase border-blue-200 text-blue-600 bg-blue-50">Academia</Badge>}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                {item.description && <p className="text-sm text-muted-foreground truncate">{item.description}</p>}
                                                {item.owner && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <User className="h-3 w-3" />
                                                        Criado por: <span className="font-medium text-foreground">{item.owner.full_name || item.owner.email}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={item.isActive ? "success" : "outline"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(item.id)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(item.id)}>
                                                    {item.isActive ? <><EyeOff className="h-4 w-4 mr-2" />Desativar</> : <><Eye className="h-4 w-4 mr-2" />Ativar</>}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout >
    );
}
