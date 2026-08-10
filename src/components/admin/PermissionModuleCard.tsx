import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolePermission } from "@/hooks/useAdminPermissions";

export interface PermissionItem {
    key: string;
    label: string;
    description: string;
    resource: string;
    allowed: boolean;
    permissionId?: string;
}

export interface PermissionModule {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    permissions: PermissionItem[];
    color: string;
}

interface PermissionModuleCardProps {
    module: PermissionModule;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onPermissionToggle: (permissionKey: string, resource: string, currentValue: boolean) => void;
    isUpdating: boolean;
    changedPermissions: Set<string>;
}

export function PermissionModuleCard({
    module,
    isExpanded,
    onToggleExpand,
    onPermissionToggle,
    isUpdating,
    changedPermissions,
}: PermissionModuleCardProps) {
    const Icon = module.icon;
    const activeCount = module.permissions.filter((p) => p.allowed).length;
    const totalCount = module.permissions.length;
    const hasChanges = module.permissions.some((p) =>
        changedPermissions.has(`${p.key}-${p.resource}`)
    );

    return (
        <Card className={cn(
            "border-2 transition-all",
            isExpanded ? "shadow-md" : "shadow-sm",
            hasChanges && "border-primary/50 bg-primary/5"
        )}>
            <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    module.color
                                )}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {module.title}
                                        {hasChanges && (
                                            <Badge variant="outline" className="text-xs border-primary text-primary">
                                                Alterado
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {module.description}
                                    </CardDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {activeCount}/{totalCount}
                                    </Badge>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="space-y-1 pb-4">
                        {module.permissions.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Nenhuma permissão configurada para este módulo
                            </p>
                        ) : (
                            module.permissions.map((permission) => {
                                const isChanged = changedPermissions.has(`${permission.key}-${permission.resource}`);

                                return (
                                    <div
                                        key={`${permission.key}-${permission.resource}`}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                                            isChanged && "bg-primary/5 border border-primary/20"
                                        )}
                                    >
                                        <div className="flex flex-col gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">
                                                    {permission.label}
                                                </span>
                                                {permission.resource !== "all" && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {permission.resource}
                                                    </Badge>
                                                )}
                                                {isChanged && (
                                                    <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                                                        Modificado
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {permission.description}
                                            </p>
                                        </div>

                                        <Switch
                                            checked={permission.allowed}
                                            onCheckedChange={() =>
                                                onPermissionToggle(permission.key, permission.resource, permission.allowed)
                                            }
                                            disabled={isUpdating}
                                            className="ml-4"
                                        />
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
