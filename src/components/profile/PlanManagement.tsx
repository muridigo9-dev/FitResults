import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Lock, ArrowUpCircle, Sparkles } from 'lucide-react';
import { PlanComparison } from '@/hooks/useProfileData';
import { FeatureFlagMap } from '@/hooks/useFeatureFlags';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PlanManagementProps {
    plans: (PlanComparison & { price_id?: string })[];
    currentPlanId: string | null;
    userFlags: FeatureFlagMap | null;
    subscriptionId?: string | null;
}

export function PlanManagement({ plans, currentPlanId, userFlags, subscriptionId }: PlanManagementProps) {
    const { t, language } = useI18n();
    const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

    const currentPlan = plans.find(p => p.plan_id === currentPlanId);
    const otherPlans = plans.filter(p => p.plan_id !== currentPlanId);

    const handleUpgrade = async (plan: PlanComparison & { price_id?: string }) => {
        if (!plan.price_id) {
            toast.error(t("states.error"));
            return;
        }

        setIsProcessing(plan.plan_id);

        try {
            // SEAMLESS UPGRADE (Se o usuário já tem assinatura ativa no Stripe)
            if (subscriptionId) {
                const { data, error } = await supabase.functions.invoke("update-subscription", {
                    body: { price_id: plan.price_id, plan_id: plan.plan_id }
                });

                if (error) throw error;

                toast.success(t("notifications.success"));
                // Recarregar a página para atualizar o status (o hook useProfileData cuidará disso)
                window.location.reload();
                return;
            }

            // CHECKOUT NORMAL (Se o usuário não tem assinatura Stripe ainda)
            const { data: userData } = await supabase.auth.getUser();
            const { data, error } = await supabase.functions.invoke("create-checkout-session", {
                body: {
                    price_id: plan.price_id,
                    email: userData.user?.email,
                    name: userData.user?.user_metadata?.full_name,
                    success_url: `${window.location.origin}/dashboard?reactivated=true`,
                    cancel_url: window.location.href,
                }
            });

            if (error) throw error;
            if (data?.url) window.location.href = data.url;

        } catch (err: any) {
            console.error("Erro no upgrade:", err);
            toast.error(err.message || t("states.error"));
        } finally {
            setIsProcessing(null);
        }
    };


    return (
        <div className="space-y-6">
            {/* Current Plan Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                {currentPlan?.plan_name || t("plan.currentPlanTitle")}
                                <Badge variant="secondary" className="bg-primary text-primary-foreground">{t("plan.currentBadge")}</Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {currentPlan?.description || t("plan.basicFeatures")}
                            </CardDescription>
                        </div>
                        <Sparkles className="h-8 w-8 text-primary opacity-50" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mt-4 pt-4 border-t border-primary/10">
                        {currentPlan && currentPlan.feature_details && Object.entries(currentPlan.feature_details).map(([key, details]) => {
                            if (!details.enabled || details.show_in_plans === false) return null;

                            let displayName = details.display_name;

                            if (language.startsWith('en')) displayName = details.display_name_en || displayName;
                            else if (language.startsWith('es')) displayName = details.display_name_es || displayName;

                            const label = displayName || t(`plan.features.${key}`) || key.replace(/_enabled|_mode/g, '').replace(/_/g, ' ');

                            return (
                                <div key={key} className="flex items-start gap-2.5 text-sm group/feat">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                                        <Check className="h-3 w-3 text-primary stroke-[3]" />
                                    </div>
                                    <span className="font-semibold text-foreground/90 leading-tight">
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Other Plans / Upsell */}
            {otherPlans.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">
                        {t("plan.upgradesAvailable")}
                    </h3>

                    {otherPlans.map(plan => (
                        <Card key={plan.plan_id} className="group hover:border-primary/40 transition-all duration-300 overflow-hidden bg-card/60 backdrop-blur-sm">
                            <div className="h-1 bg-muted group-hover:bg-primary/40 transition-all" />
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-black text-xl flex items-center gap-2 text-foreground">
                                                {plan.plan_name}
                                                <Badge variant="outline" className="border-primary/30 text-primary font-bold">{t("plan.premiumBadge")}</Badge>
                                            </h4>
                                            <p className="text-sm text-muted-foreground max-w-md mt-1 font-medium italic">
                                                {plan.description || t("plan.unlockPotencial")}
                                            </p>
                                        </div>

                                        {/* Benefits list (New style) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 pt-2">
                                            {plan.feature_details && Object.entries(plan.feature_details).map(([key, details]) => {
                                                const hasIt = currentPlan?.features[key];
                                                if (details.enabled && !hasIt && details.show_in_plans !== false) {
                                                    let displayName = details.display_name;

                                                    if (language.startsWith('en')) displayName = details.display_name_en || displayName;
                                                    else if (language.startsWith('es')) displayName = details.display_name_es || displayName;

                                                    const label = displayName || t(`plan.features.${key}`) || key;

                                                    return (
                                                        <div key={key} className="flex items-start gap-2 text-[12px] text-primary font-bold leading-tight">
                                                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                <Sparkles className="h-2 w-2 text-primary" />
                                                            </div>
                                                            <span>{label}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <Button
                                            onClick={() => handleUpgrade(plan)}
                                            disabled={isProcessing === plan.plan_id}
                                            className="w-full md:w-auto gap-2 shadow-lg hover:shadow-primary/20 transition-all"
                                        >
                                            {isProcessing === plan.plan_id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                            ) : (
                                                <ArrowUpCircle className="h-4 w-4" />
                                            )}
                                            {t("plan.upgradeAction")}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
