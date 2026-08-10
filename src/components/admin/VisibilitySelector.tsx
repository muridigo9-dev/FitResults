/**
 * VisibilitySelector Component
 * 
 * Componente reutilizável para configurar visibilidade de entidades por plano.
 * Suporta: global, academy, private, plan_restricted
 */

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Globe, Building2, Lock, Gem, Info, AlertTriangle } from "lucide-react";
import { useUnifiedVisibility, type EntityType, type VisibilityType } from "@/hooks/useUnifiedVisibility";
import { Skeleton } from "@/components/ui/skeleton";

interface VisibilitySelectorProps {
    entityType: EntityType;
    value: {
        visibilityType: VisibilityType;
        planIds: string[];
    };
    onChange: (value: { visibilityType: VisibilityType; planIds: string[] }) => void;
    disabled?: boolean;
    showDescription?: boolean;
}

const VISIBILITY_OPTIONS = [
    {
        value: 'global' as const,
        label: 'Global (Todos)',
        icon: Globe,
        description: 'Visível para todos os usuários autenticados',
        color: 'text-blue-600'
    },
    {
        value: 'academy' as const,
        label: 'Academia',
        icon: Building2,
        description: 'Visível apenas para membros da academia',
        color: 'text-purple-600'
    },
    {
        value: 'private' as const,
        label: 'Privado',
        icon: Lock,
        description: 'Visível apenas para o criador',
        color: 'text-gray-600'
    },
    {
        value: 'plan_restricted' as const,
        label: 'Restrito por Plano',
        icon: Gem,
        description: 'Visível apenas para usuários com planos específicos',
        color: 'text-amber-600'
    }
];

export function VisibilitySelector({
    entityType,
    value,
    onChange,
    disabled = false,
    showDescription = true
}: VisibilitySelectorProps) {
    const { plans, isLoadingPlans } = useUnifiedVisibility();
    const [selectedPlans, setSelectedPlans] = useState<string[]>(value.planIds);

    useEffect(() => {
        setSelectedPlans(value.planIds);
    }, [value.planIds]);

    const handleVisibilityChange = (newType: VisibilityType) => {
        onChange({
            visibilityType: newType,
            planIds: newType === 'plan_restricted' ? selectedPlans : []
        });
    };

    const handlePlanToggle = (planId: string) => {
        const newPlans = selectedPlans.includes(planId)
            ? selectedPlans.filter(id => id !== planId)
            : [...selectedPlans, planId];

        setSelectedPlans(newPlans);
        onChange({
            visibilityType: value.visibilityType,
            planIds: newPlans
        });
    };

    const selectedOption = VISIBILITY_OPTIONS.find(opt => opt.value === value.visibilityType);
    const SelectedIcon = selectedOption?.icon || Globe;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <SelectedIcon className={`h-5 w-5 ${selectedOption?.color}`} />
                    Visibilidade por Plano
                </CardTitle>
                {showDescription && (
                    <CardDescription>
                        Controle quem pode visualizar este conteúdo baseado em planos de assinatura
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Visibility Type Selector */}
                <div className="space-y-2">
                    <Label htmlFor="visibility-type">Tipo de Visibilidade</Label>
                    <Select
                        value={value.visibilityType}
                        onValueChange={handleVisibilityChange}
                        disabled={disabled}
                    >
                        <SelectTrigger id="visibility-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {VISIBILITY_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${option.color}`} />
                                            <span>{option.label}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    {selectedOption && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            {selectedOption.description}
                        </p>
                    )}
                </div>

                {/* Plan Selector (only for plan_restricted) */}
                {value.visibilityType === 'plan_restricted' && (
                    <div className="space-y-3 pt-4 border-t">
                        <Label>Planos com Acesso</Label>

                        {isLoadingPlans ? (
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : plans.length === 0 ? (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Nenhum plano cadastrado. Crie planos em Configurações → Planos.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {plans.map((plan) => {
                                        const isSelected = selectedPlans.includes(plan.id);
                                        return (
                                            <Badge
                                                key={plan.id}
                                                variant={isSelected ? "default" : "outline"}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => !disabled && handlePlanToggle(plan.id)}
                                            >
                                                {plan.name}
                                                {isSelected && (
                                                    <X className="ml-1 h-3 w-3" />
                                                )}
                                            </Badge>
                                        );
                                    })}
                                </div>

                                {/* Fallback Warning */}
                                {selectedPlans.length === 0 && (
                                    <Alert className="bg-yellow-50 border-yellow-200">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        <AlertDescription className="text-yellow-800">
                                            <strong>Atenção:</strong> Nenhum plano selecionado significa que o conteúdo será{' '}
                                            <strong>visível para TODOS</strong> os usuários (comportamento fallback).
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Selected Plans Summary */}
                                {selectedPlans.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        <strong>{selectedPlans.length}</strong> plano(s) selecionado(s).
                                        Apenas usuários com estes planos poderão visualizar este conteúdo.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Academy Info (for academy visibility) */}
                {value.visibilityType === 'academy' && (
                    <Alert className="bg-purple-50 border-purple-200">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800">
                            Este conteúdo será visível apenas para membros da academia associada.
                            Certifique-se de que a academia está corretamente configurada.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Private Info */}
                {value.visibilityType === 'private' && (
                    <Alert className="bg-gray-50 border-gray-200">
                        <Lock className="h-4 w-4 text-gray-600" />
                        <AlertDescription className="text-gray-800">
                            Este conteúdo será visível apenas para você (criador).
                            Outros usuários não poderão visualizá-lo.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Global Info */}
                {value.visibilityType === 'global' && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            Este conteúdo será visível para <strong>todos os usuários</strong> autenticados,
                            independente de plano ou academia.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Compact version for inline use
 */
export function VisibilitySelectorCompact({
    entityType,
    value,
    onChange,
    disabled = false
}: VisibilitySelectorProps) {
    const { plans, isLoadingPlans } = useUnifiedVisibility();
    const [selectedPlans, setSelectedPlans] = useState<string[]>(value.planIds);

    useEffect(() => {
        setSelectedPlans(value.planIds);
    }, [value.planIds]);

    const handleVisibilityChange = (newType: VisibilityType) => {
        onChange({
            visibilityType: newType,
            planIds: newType === 'plan_restricted' ? selectedPlans : []
        });
    };

    const handlePlanToggle = (planId: string) => {
        const newPlans = selectedPlans.includes(planId)
            ? selectedPlans.filter(id => id !== planId)
            : [...selectedPlans, planId];

        setSelectedPlans(newPlans);
        onChange({
            visibilityType: value.visibilityType,
            planIds: newPlans
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Label className="min-w-[100px]">Visibilidade:</Label>
                <Select
                    value={value.visibilityType}
                    onValueChange={handleVisibilityChange}
                    disabled={disabled}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {VISIBILITY_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${option.color}`} />
                                        <span>{option.label}</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {value.visibilityType === 'plan_restricted' && !isLoadingPlans && (
                <div className="flex items-start gap-2">
                    <Label className="min-w-[100px] pt-2">Planos:</Label>
                    <div className="flex-1 flex flex-wrap gap-2">
                        {plans.map((plan) => {
                            const isSelected = selectedPlans.includes(plan.id);
                            return (
                                <Badge
                                    key={plan.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => !disabled && handlePlanToggle(plan.id)}
                                >
                                    {plan.name}
                                    {isSelected && <X className="ml-1 h-3 w-3" />}
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
