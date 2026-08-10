import { useState, useRef } from "react";
import { Download, Upload, FileText, Plus, Search, MoreVertical, BookOpen, Edit, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DietPlanForm } from "@/components/admin/DietPlanForm";
import { useAdminDietPlans } from "@/hooks/useAdminDietPlans";
import { Skeleton } from "@/components/ui/skeleton";
import type { DietPlan } from "@/types/content";

type ViewMode = "list" | "form";

export default function AdminDietPlansPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        dietPlans: plans,
        isLoading,
        saveDietPlan: savePlan,
        toggleActive: togglePlanActive,
        deleteDietPlan: deletePlan,
        exportDietPlans: exportPlans,
        importDietPlans: importPlans,
        downloadDietPlanPDF: downloadPDF
    } = useAdminDietPlans();

    const getEditingItem = () => {
        if (!editingId) return undefined;
        return plans.find((item) => item.id === editingId);
    };

    const filteredContent = plans.filter((item) => {
        return item.title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleCreate = () => {
        setEditingId(null);
        setViewMode("form");
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setViewMode("form");
    };

    const handleSave = async (data: Omit<DietPlan, "id" | "createdAt">) => {
        try {
            await savePlan(editingId || undefined, data);
            toast.success(editingId ? "Plano atualizado!" : "Plano criado!");
            setViewMode("list");
            setEditingId(null);
        } catch {
            toast.error("Erro ao salvar plano");
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            const item = plans.find(p => p.id === id);
            if (item) {
                await togglePlanActive(id, !item.isActive);
                toast.success("Status atualizado!");
            }
        } catch {
            toast.error("Erro ao atualizar status");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deletePlan(id);
            toast.success("Plano removido!");
        } catch {
            toast.error("Erro ao remover plano");
        }
    };

    const handleCancel = () => {
        setViewMode("list");
        setEditingId(null);
    };

    const handleExport = async () => {
        await exportPlans();
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
                await importPlans(text);
            } catch (e) {
                // Error handled in hook
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const handlePDF = async (id: string) => {
        await downloadPDF(id);
    };

    if (viewMode === "form") {
        const editingItem = getEditingItem();
        return (
            <AdminLayout title={`${editingId ? "Editar" : "Novo"} Plano Alimentar`}>
                <div className="space-y-4">
                    <Button variant="ghost" onClick={handleCancel} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Button>
                    <ScrollArea className="h-[calc(100vh-200px)]">
                        <DietPlanForm plan={editingItem} onSave={handleSave} onCancel={handleCancel} />
                    </ScrollArea>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Gestão de Planos Alimentares">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar planos..."
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
                            Novo Plano
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{plans.length}</p>}
                            <p className="text-sm text-muted-foreground">Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-success">{plans.filter((c) => c.isActive).length}</p>}
                            <p className="text-sm text-muted-foreground">Ativos</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            Planos Alimentares
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
                                title="Nenhum plano encontrado"
                                description={searchQuery ? `Não há resultados para "${searchQuery}"` : "Clique em 'Novo Plano' para adicionar"}
                                action={!searchQuery ? { label: "Criar primeiro", onClick: handleCreate } : undefined}
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredContent.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                                        <div className="h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-muted overflow-hidden ring-1 ring-border">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <BookOpen className={`h-5 w-5 ${item.isActive ? "text-blue-600" : "text-muted-foreground"}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">{item.title}</p>
                                                {item.objective && <Badge variant="secondary">{item.objective}</Badge>}
                                            </div>
                                            {item.description && <p className="text-sm text-muted-foreground truncate">{item.description}</p>}
                                        </div>
                                        <Badge variant={item.isActive ? "success" : "outline"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handlePDF(item.id)}>
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    Download PDF
                                                </DropdownMenuItem>
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
        </AdminLayout>
    );
}
