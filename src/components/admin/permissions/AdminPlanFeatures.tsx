import { useState, useEffect } from "react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { PlanSelector } from "@/components/admin/permissions/PlanSelector";
import { PlanFeatureList } from "@/components/admin/permissions/PlanFeatureList";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function AdminPlanFeatures() {
    const {
        plans,
        featureFlags,
        planFeatures: allPlanFeatures,
        isLoadingPlans,
        createPlan,
        isCreatingPlan,
        togglePlanFeature,
        isTogglingPlanFeature,
    } = useAdminPermissions();

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // Auto-select first plan if available and none selected
    useEffect(() => {
        if (!selectedPlanId && plans.length > 0) {
            setSelectedPlanId(plans[0].id);
        }
    }, [plans, selectedPlanId]);

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
    const currentPlanFeatures = allPlanFeatures.filter(
        (pf) => pf.plan_id === selectedPlanId
    );

    const handleCreatePlan = (data: { name: string; description?: string }) => {
        createPlan(data, {
            onSuccess: (plan) => {
                toast.success(`Plano ${plan.name} criado com sucesso!`);
                setSelectedPlanId(plan.id);
            },
            onError: (e) => {
                toast.error("Erro ao criar plano: " + e.message);
            },
        });
    };

    const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
        if (!selectedPlanId) return;

        togglePlanFeature(
            { plan_id: selectedPlanId, feature_key: featureKey, enabled },
            {
                onSuccess: () => {
                    // toast.success("Feature atualizada"); // Can be noisy with toggles
                },
                onError: () => {
                    toast.error("Erro ao atualizar feature");
                },
            }
        );
    };

    if (isLoadingPlans) {
        return <div className="p-8 text-center text-muted-foreground">Carregando planos...</div>;
    }

    return (
        <Card className="min-h-[600px]">
            <CardContent className="p-0">
                <div className="flex h-full min-h-[600px]">
                    {/* Sidebar */}
                    <div className="w-1/3 min-w-[280px] p-6">
                        <PlanSelector
                            plans={plans}
                            selectedPlanId={selectedPlanId}
                            onSelectPlan={setSelectedPlanId}
                            onCreatePlan={handleCreatePlan}
                            isCreating={isCreatingPlan}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/10">
                        <PlanFeatureList
                            plan={selectedPlan}
                            planFeatures={currentPlanFeatures}
                            featureFlags={featureFlags}
                            onToggle={handleFeatureToggle}
                            isToggling={isTogglingPlanFeature}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
