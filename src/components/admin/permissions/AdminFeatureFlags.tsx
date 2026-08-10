import { useState } from "react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Search,
    Settings2,
    Eye,
    EyeOff,
    ExternalLink,
    Save,
    RefreshCw,
    Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminFeatureFlags() {
    const {
        featureFlags,
        isLoadingFlags,
        updateFeatureFlagMetadata,
        isUpdatingFeatureFlagMetadata,
        toggleFeatureFlag
    } = useAdminPermissions();

    const [searchTerm, setSearchTerm] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        display_name: string;
        display_name_en: string;
        display_name_es: string;
        description: string;
        description_en: string;
        description_es: string;
        show_in_plans: boolean;
        is_marketing_only: boolean;
    }>({
        display_name: "",
        display_name_en: "",
        display_name_es: "",
        description: "",
        description_en: "",
        description_es: "",
        show_in_plans: true,
        is_marketing_only: false
    });

    const filteredFlags = featureFlags.filter(flag => {
        const search = searchTerm.toLowerCase();
        return (
            flag.key.toLowerCase().includes(search) ||
            (flag.display_name?.toLowerCase() || "").includes(search) ||
            (flag.display_name_en?.toLowerCase() || "").includes(search) ||
            (flag.display_name_es?.toLowerCase() || "").includes(search)
        );
    });

    const handleEdit = (flag: any) => {
        setEditingKey(flag.key);
        setEditForm({
            display_name: flag.display_name || "",
            display_name_en: flag.display_name_en || "",
            display_name_es: flag.display_name_es || "",
            description: flag.description || "",
            description_en: flag.description_en || "",
            description_es: flag.description_es || "",
            show_in_plans: flag.show_in_plans,
            is_marketing_only: flag.is_marketing_only
        });
    };

    const handleSave = () => {
        if (!editingKey) return;

        updateFeatureFlagMetadata({
            key: editingKey,
            ...editForm
        }, {
            onSuccess: () => {
                toast.success("Informações da feature atualizadas!");
                setEditingKey(null);
            },
            onError: (err) => {
                toast.error("Erro ao atualizar: " + err.message);
            }
        });
    };

    if (isLoadingFlags) return <div className="p-8 text-center text-muted-foreground">Carregando features...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por chave ou nome..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                    <Info className="h-4 w-4" />
                    <span>Features com visualização ativa aparecem no Checkout</span>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredFlags.map((flag) => {
                    const isEditing = editingKey === flag.key;

                    return (
                        <Card key={flag.key} className={cn(
                            "transition-all duration-200",
                            isEditing ? "ring-2 ring-primary border-transparent" : "hover:border-primary/30"
                        )}>
                            <CardContent className="p-0">
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                                        {/* Info Section */}
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Settings2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-lg">
                                                            {flag.display_name || flag.key}
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-mono opacity-60">
                                                            {flag.key}
                                                        </Badge>
                                                    </div>
                                                    {!isEditing && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {flag.description || "Sem descrição definida."}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 ml-auto md:ml-0">
                                                    {flag.is_marketing_only && (
                                                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                                                            Apenas Visibilidade
                                                        </Badge>
                                                    )}
                                                    {flag.show_in_plans ? (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                                                            <Eye className="h-3 w-3" /> Visível nos Planos
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1 opacity-50">
                                                            <EyeOff className="h-3 w-3" /> Oculto
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="grid gap-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <Tabs defaultValue="pt" className="w-full pt-4">
                                                        <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
                                                            <TabsTrigger value="pt" className="text-xs">Português (PT)</TabsTrigger>
                                                            <TabsTrigger value="en" className="text-xs">Inglês (EN)</TabsTrigger>
                                                            <TabsTrigger value="es" className="text-xs">Espanhol (ES)</TabsTrigger>
                                                        </TabsList>

                                                        <TabsContent value="pt" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="flex items-center gap-2">
                                                                        Nome Público (PT)
                                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                                    </Label>
                                                                    <Input
                                                                        value={editForm.display_name}
                                                                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                                                        placeholder="Ex: Suporte Prioritário 24/7"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Descrição Interna (PT)</Label>
                                                                    <Input
                                                                        value={editForm.description}
                                                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                                        placeholder="Ex: Habilita o sistema de tickets para o aluno"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TabsContent>

                                                        <TabsContent value="en" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Public Name (EN)</Label>
                                                                    <Input
                                                                        value={editForm.display_name_en}
                                                                        onChange={(e) => setEditForm({ ...editForm, display_name_en: e.target.value })}
                                                                        placeholder="Ex: 24/7 Priority Support"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Internal Description (EN)</Label>
                                                                    <Input
                                                                        value={editForm.description_en}
                                                                        onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })}
                                                                        placeholder="Ex: Enables the ticket system for the student"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TabsContent>

                                                        <TabsContent value="es" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Nombre Público (ES)</Label>
                                                                    <Input
                                                                        value={editForm.display_name_es}
                                                                        onChange={(e) => setEditForm({ ...editForm, display_name_es: e.target.value })}
                                                                        placeholder="Ex: Soporte Prioritario 24/7"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Descripción Interna (ES)</Label>
                                                                    <Input
                                                                        value={editForm.description_es}
                                                                        onChange={(e) => setEditForm({ ...editForm, description_es: e.target.value })}
                                                                        placeholder="Ex: Habilita el sistema de tickets para el alumno"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TabsContent>
                                                    </Tabs>

                                                    <div className="flex flex-col gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                        <div className="flex items-start space-x-3">
                                                            <Checkbox
                                                                id={`show-${flag.key}`}
                                                                checked={editForm.show_in_plans}
                                                                onCheckedChange={(checked) => setEditForm({ ...editForm, show_in_plans: !!checked })}
                                                                className="mt-1"
                                                            />
                                                            <div className="grid gap-1.5 leading-none">
                                                                <Label htmlFor={`show-${flag.key}`} className="text-sm font-bold cursor-pointer">
                                                                    Exibir na lista de recursos do plano
                                                                </Label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Se marcado, esta feature aparecerá como um item (com ícone de check) na página de checkout e planos.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start space-x-3">
                                                            <Checkbox
                                                                id={`marketing-${flag.key}`}
                                                                checked={editForm.is_marketing_only}
                                                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_marketing_only: !!checked })}
                                                                className="mt-1"
                                                            />
                                                            <div className="grid gap-1.5 leading-none">
                                                                <Label htmlFor={`marketing-${flag.key}`} className="text-sm font-bold cursor-pointer flex items-center gap-2">
                                                                    Apenas Informativo (Marketing Only)
                                                                    <Badge variant="outline" className="text-[9px] h-4">Sem Lógica de Sistema</Badge>
                                                                </Label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Use para itens que não possuem código (ex: "Acesso à Comunidade VIP").
                                                                    A feature será listada no plano mas não bloqueia nenhuma funcionalidade técnica.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Section */}
                                        <div className="flex flex-row md:flex-col gap-2 justify-end items-center self-start">
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        onClick={handleSave}
                                                        disabled={isUpdatingFeatureFlagMetadata}
                                                        size="sm"
                                                        className="w-full md:w-auto shadow-glow-sm"
                                                    >
                                                        {isUpdatingFeatureFlagMetadata ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="h-4 w-4 mr-2" />
                                                        )}
                                                        Salvar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setEditingKey(null)}
                                                        size="sm"
                                                        className="w-full md:w-auto"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleEdit(flag)}
                                                    size="sm"
                                                    className="w-full md:w-auto"
                                                >
                                                    Editar Display
                                                </Button>
                                            )}

                                            <div className="hidden md:block w-full">
                                                <Separator className="my-2" />
                                            </div>

                                            <div className="flex flex-col items-center gap-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sistema</Label>
                                                <Switch
                                                    checked={flag.enabled}
                                                    onCheckedChange={(enabled) => toggleFeatureFlag({ key: flag.key, enabled })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {filteredFlags.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl">
                        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                            <RefreshCw className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold">Nenhuma feature encontrada</h3>
                        <p className="text-muted-foreground">Tente buscar por outro termo ou limpe os filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
