import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Shield,
    Users,
    Settings,
    Layers,
    Sparkles,
    Dumbbell,
    Apple,
    Target,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import {
    useAdminPermissions,
    type RolePermission,
} from "@/hooks/useAdminPermissions";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { PermissionModuleCard, type PermissionModule, type PermissionItem } from "@/components/admin/PermissionModuleCard";
import { toast } from "sonner";

// Mapeamento de permissões para módulos funcionais (mesmos do AdminPermissions.tsx)
const PERMISSION_MODULES: Omit<PermissionModule, "permissions">[] = [
    {
        id: "workouts",
        title: "Treinos & Exercícios",
        icon: Dumbbell,
        description: "Gerenciar treinos e biblioteca de exercícios",
        color: "bg-orange-500",
    },
    {
        id: "diets",
        title: "Dietas & Nutrição",
        icon: Apple,
        description: "Gerenciar pratos e planos alimentares",
        color: "bg-green-500",
    },
    {
        id: "challenges",
        title: "Desafios & Gamificação",
        icon: Target,
        description: "Gerenciar desafios e sistema de pontos",
        color: "bg-purple-500",
    },
    {
        id: "users",
        title: "Gestão de Usuários",
        icon: Users,
        description: "Gerenciar usuários e permissões",
        color: "bg-blue-500",
    },
    {
        id: "system",
        title: "Configurações do Sistema",
        icon: Settings,
        description: "Configurações gerais e painel admin",
        color: "bg-gray-500",
    },
];

const PERMISSION_LABELS: Record<string, string> = {
    manage_users: "Gerenciar Usuários",
    manage_content: "Gerenciar Todo Conteúdo",
    manage_settings: "Gerenciar Configurações",
    view_admin: "Acessar Painel Admin",
    create_content: "Criar Conteúdo",
    view_content: "Ver Conteúdo",
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
    manage_users: "CRUD completo de usuários e roles",
    manage_content: "Editar qualquer conteúdo do sistema",
    manage_settings: "Alterar configurações globais",
    view_admin: "Acesso à URL /admin",
    create_content: "Criar novos itens (treinos, dietas, etc.)",
    view_content: "Visualizar conteúdo existente",
};

export function AdminRolePermissions() {
    const {
        rolePermissions,
        isLoadingRoles,
        togglePermission,
        isTogglingPermission,
        stats,
        invalidateAll,
    } = useAdminPermissions();

    const [selectedRole, setSelectedRole] = useState("admin");
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(["workouts"]));
    const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

    const permissionsByRole = useMemo(() => {
        return rolePermissions.reduce((acc, perm) => {
            if (!acc[perm.role]) acc[perm.role] = [];
            acc[perm.role].push(perm);
            return acc;
        }, {} as Record<string, RolePermission[]>);
    }, [rolePermissions]);

    const currentRolePermissions = permissionsByRole[selectedRole] || [];

    const permissionModules: PermissionModule[] = useMemo(() => {
        return PERMISSION_MODULES.map((module) => {
            let permissions: PermissionItem[] = [];

            if (module.id === "workouts") {
                const perms = currentRolePermissions.filter(
                    (p) => p.resource === "workouts" || p.resource === "exercises" || p.resource === "all"
                );
                permissions = perms.map((p) => ({
                    key: p.permission,
                    label: PERMISSION_LABELS[p.permission] || p.permission,
                    description: PERMISSION_DESCRIPTIONS[p.permission] || "",
                    resource: p.resource,
                    allowed: p.allowed,
                    permissionId: p.id,
                }));
            } else if (module.id === "diets") {
                const perms = currentRolePermissions.filter(
                    (p) => p.resource === "diets" || p.resource === "all"
                );
                permissions = perms.map((p) => ({
                    key: p.permission,
                    label: PERMISSION_LABELS[p.permission] || p.permission,
                    description: PERMISSION_DESCRIPTIONS[p.permission] || "",
                    resource: p.resource,
                    allowed: p.allowed,
                    permissionId: p.id,
                }));
            } else if (module.id === "challenges") {
                const perms = currentRolePermissions.filter(
                    (p) => p.resource === "challenges" || p.resource === "all"
                );
                permissions = perms.map((p) => ({
                    key: p.permission,
                    label: PERMISSION_LABELS[p.permission] || p.permission,
                    description: PERMISSION_DESCRIPTIONS[p.permission] || "",
                    resource: p.resource,
                    allowed: p.allowed,
                    permissionId: p.id,
                }));
            } else if (module.id === "users") {
                const perms = currentRolePermissions.filter(
                    (p) => p.permission === "manage_users" || p.resource === "users"
                );
                permissions = perms.map((p) => ({
                    key: p.permission,
                    label: PERMISSION_LABELS[p.permission] || p.permission,
                    description: PERMISSION_DESCRIPTIONS[p.permission] || "",
                    resource: p.resource,
                    allowed: p.allowed,
                    permissionId: p.id,
                }));
            } else if (module.id === "system") {
                const perms = currentRolePermissions.filter(
                    (p) =>
                        p.permission === "manage_settings" ||
                        p.permission === "view_admin" ||
                        p.resource === "all"
                );
                permissions = perms.map((p) => ({
                    key: p.permission,
                    label: PERMISSION_LABELS[p.permission] || p.permission,
                    description: PERMISSION_DESCRIPTIONS[p.permission] || "",
                    resource: p.resource,
                    allowed: p.allowed,
                    permissionId: p.id,
                }));
            }

            return {
                ...module,
                permissions,
            };
        });
    }, [currentRolePermissions]);

    const permissionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.keys(permissionsByRole).forEach((role) => {
            counts[role] = permissionsByRole[role].length;
        });
        return counts;
    }, [permissionsByRole]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            if (next.has(moduleId)) {
                next.delete(moduleId);
            } else {
                next.add(moduleId);
            }
            return next;
        });
    };

    const handlePermissionToggle = (
        permissionKey: string,
        resource: string,
        currentValue: boolean
    ) => {
        const changeKey = `${permissionKey}-${resource}`;
        const permission = currentRolePermissions.find(
            (p) => p.permission === permissionKey && p.resource === resource
        );

        if (!permission) {
            toast.error("Permissão não encontrada");
            return;
        }

        togglePermission(
            { id: permission.id, allowed: !currentValue },
            {
                onSuccess: () => {
                    const action = !currentValue ? "ativada" : "desativada";
                    toast.success(`Permissão ${action} com sucesso`);
                    setPendingChanges((prev) => {
                        const next = new Map(prev);
                        next.delete(changeKey);
                        return next;
                    });
                },
                onError: () => {
                    toast.error("Erro ao alterar permissão");
                },
            }
        );

        setPendingChanges((prev) => new Map(prev).set(changeKey, !currentValue));
    };

    const hasChanges = pendingChanges.size > 0;

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={invalidateAll} disabled={isLoadingRoles}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRoles ? 'animate-spin' : ''}`} />
                    Atualizar Dados
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Roles</p>
                                <p className="text-2xl font-bold">{stats.totalRoles}</p>
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Permissões</p>
                                <p className="text-2xl font-bold">{stats.totalPermissions}</p>
                            </div>
                            <Shield className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Módulos</p>
                                <p className="text-2xl font-bold">{PERMISSION_MODULES.length}</p>
                            </div>
                            <Layers className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Alterações</p>
                                <p className="text-2xl font-bold">{pendingChanges.size}</p>
                            </div>
                            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Role Selector */}
            <RoleSelector
                selectedRole={selectedRole}
                onRoleChange={(role) => {
                    setSelectedRole(role);
                    setPendingChanges(new Map());
                }}
                counts={permissionCounts}
            />

            <Separator />

            {/* Alert de alterações pendentes */}
            {hasChanges && (
                <Alert className="border-primary/50 bg-primary/5">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                        As alterações são aplicadas automaticamente. {pendingChanges.size} permissão(ões)
                        modificada(s) para <strong>{selectedRole}</strong>.
                    </AlertDescription>
                </Alert>
            )}

            {/* Permission Modules */}
            <div className="space-y-4">
                {isLoadingRoles ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                ) : permissionModules.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">
                                Nenhuma permissão configurada para {selectedRole}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    permissionModules.map((module) => (
                        <PermissionModuleCard
                            key={module.id}
                            module={module}
                            isExpanded={expandedModules.has(module.id)}
                            onToggleExpand={() => toggleModule(module.id)}
                            onPermissionToggle={handlePermissionToggle}
                            isUpdating={isTogglingPermission}
                            changedPermissions={new Set(pendingChanges.keys())}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
