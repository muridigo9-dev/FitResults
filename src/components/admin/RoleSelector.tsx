import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, Users, Sparkles, GraduationCap, User } from "lucide-react";

export interface Role {
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
}

export const ROLE_DEFINITIONS: Role[] = [
    {
        value: "admin",
        label: "Admin",
        icon: Shield,
        description: "Acesso total ao sistema",
        color: "bg-purple-500",
    },
    {
        value: "academy_admin",
        label: "Academia",
        icon: Building2,
        description: "Gerencia academia",
        color: "bg-blue-500",
    },
    {
        value: "personal_trainer",
        label: "PT",
        icon: Users,
        description: "Personal Trainer",
        color: "bg-green-500",
    },
    {
        value: "content_creator",
        label: "Criador",
        icon: Sparkles,
        description: "Cria conteúdo",
        color: "bg-amber-500",
    },
    {
        value: "aluno",
        label: "Aluno",
        icon: GraduationCap,
        description: "Estudante",
        color: "bg-cyan-500",
    },
    {
        value: "user",
        label: "Usuário",
        icon: User,
        description: "Acesso básico",
        color: "bg-gray-500",
    },
];

interface RoleSelectorProps {
    selectedRole: string;
    onRoleChange: (role: string) => void;
    counts?: Record<string, number>;
}

export function RoleSelector({ selectedRole, onRoleChange, counts }: RoleSelectorProps) {
    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Selecione uma Role</h3>
                <p className="text-xs text-muted-foreground">
                    Escolha o tipo de usuário para visualizar e editar suas permissões
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {ROLE_DEFINITIONS.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.value;
                    const count = counts?.[role.value] || 0;

                    return (
                        <button
                            key={role.value}
                            onClick={() => onRoleChange(role.value)}
                            className={cn(
                                "group relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all",
                                "hover:scale-105 hover:shadow-lg",
                                isSelected
                                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                                    : "border-border bg-card hover:border-primary/50"
                            )}
                            title={role.description}
                        >
                            <Icon className={cn(
                                "h-5 w-5 transition-transform group-hover:scale-110",
                                isSelected ? "text-primary-foreground" : "text-muted-foreground"
                            )} />

                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-sm">{role.label}</span>
                                {count > 0 && (
                                    <span className={cn(
                                        "text-xs",
                                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                    )}>
                                        {count} permissões
                                    </span>
                                )}
                            </div>

                            {isSelected && (
                                <div className="absolute -top-1 -right-1">
                                    <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
