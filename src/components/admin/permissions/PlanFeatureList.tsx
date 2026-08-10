import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dumbbell, Apple, Trophy, Layout, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface PlanFeatureListProps {
    plan: { id: string; name: string } | null;
    planFeatures: { feature_key: string; enabled: boolean }[];
    featureFlags: {
        key: string;
        description: string;
        enabled: boolean;
        display_name?: string | null;
        is_marketing_only?: boolean;
    }[];
    onToggle: (featureKey: string, enabled: boolean) => void;
    isToggling: boolean;
}

const FEATURE_CATEGORIES = [
    {
        id: "workouts",
        title: "Treinos & Exercícios",
        icon: Dumbbell,
        keywords: ["workout", "exercise", "training"],
        color: "text-orange-500",
    },
    {
        id: "nutrition",
        title: "Nutrição & Dieta",
        icon: Apple,
        keywords: ["diet", "food", "dish", "meal", "nutrition", "water", "hydration"],
        color: "text-green-500",
    },
    {
        id: "gamification",
        title: "Gamificação",
        icon: Trophy,
        keywords: ["challenge", "gamification", "points", "badge"],
        color: "text-purple-500",
    },
    {
        id: "content",
        title: "Conteúdos & Sistema",
        icon: Layout,
        keywords: ["content", "blog", "post", "summary", "resumo"],
        color: "text-blue-500",
    },
];

export function PlanFeatureList({
    plan,
    planFeatures,
    featureFlags,
    onToggle,
    isToggling,
}: PlanFeatureListProps) {
    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                <div className="p-4 bg-muted rounded-full">
                    <Layout className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold">Nenhum plano selecionado</h3>
                    <p className="text-muted-foreground">
                        Selecione um plano na lista ao lado para configurar suas features.
                    </p>
                </div>
            </div>
        );
    }

    // Helper to categorize features
    const getCategory = (key: string) => {
        for (const cat of FEATURE_CATEGORIES) {
            if (cat.keywords.some((k) => key.toLowerCase().includes(k))) {
                return cat.id;
            }
        }
        return "other";
    };

    const groupedFeatures = featureFlags.reduce((acc, flag) => {
        const cat = getCategory(flag.key);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(flag);
        return acc;
    }, {} as Record<string, typeof featureFlags>);

    return (
        <div className="space-y-6 h-full">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    {plan.name}
                </h2>
                <p className="text-muted-foreground">
                    Gerencie quais funcionalidades este plano oferece aos usuários.
                </p>
            </div>

            <Separator />

            <Accordion type="multiple" defaultValue={["workouts", "nutrition", "gamification", "content", "other"]}>
                {FEATURE_CATEGORIES.map((category) => {
                    const features = groupedFeatures[category.id] || [];
                    if (features.length === 0) return null;

                    const Icon = category.icon;
                    const activeCount = features.filter((f) =>
                        planFeatures.some((pf) => pf.feature_key === f.key && pf.enabled)
                    ).length;

                    return (
                        <AccordionItem key={category.id} value={category.id} className="border-b-0 mb-4">
                            <Card>
                                <AccordionTrigger className="px-6 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn("h-5 w-5", category.color)} />
                                        <span className="font-semibold text-lg">{category.title}</span>
                                        <Badge variant="secondary" className="ml-2">
                                            {activeCount} / {features.length}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <div className="grid gap-4 pt-2">
                                        {features.map((feature) => {
                                            const isEnabled = planFeatures.some(
                                                (pf) => pf.feature_key === feature.key && pf.enabled
                                            );

                                            return (
                                                <div
                                                    key={feature.key}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                                                        isEnabled
                                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                                            : "bg-card border-border hover:bg-accent/50"
                                                    )}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm">
                                                                {feature.display_name || feature.key}
                                                            </span>
                                                            {isEnabled && (
                                                                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200 h-5 text-[10px]">
                                                                    Ativo no Plano
                                                                </Badge>
                                                            )}
                                                            {feature.is_marketing_only && (
                                                                <Badge variant="outline" className="text-[9px] opacity-60 h-5">
                                                                    Informativo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {feature.description || "Sem descrição definida."}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => onToggle(feature.key, checked)}
                                                        disabled={isToggling}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    );
                })}

                {/* Others */}
                {groupedFeatures["other"]?.length > 0 && (
                    <AccordionItem value="other" className="border-b-0">
                        <Card>
                            <AccordionTrigger className="px-6 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-gray-500" />
                                    <span className="font-semibold text-lg">Outras Features</span>
                                    <Badge variant="secondary" className="ml-2">
                                        {groupedFeatures["other"].filter((f) =>
                                            planFeatures.some((pf) => pf.feature_key === f.key && pf.enabled)
                                        ).length} / {groupedFeatures["other"].length}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                                {/* Reuse rendering logic or componentize if strictly needed, but inline is fine for speed */}
                                <div className="grid gap-4 pt-2">
                                    {groupedFeatures["other"].map((feature) => {
                                        const isEnabled = planFeatures.some(
                                            (pf) => pf.feature_key === feature.key && pf.enabled
                                        );
                                        return (
                                            <div key={feature.key} className={cn("flex items-center justify-between p-3 rounded-lg border", isEnabled ? "bg-primary/5 border-primary/20" : "bg-card border-border")}>
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-sm">{feature.display_name || feature.key}</div>
                                                    <p className="text-xs text-muted-foreground">{feature.description || "Sem descrição definida."}</p>
                                                </div>
                                                <Switch
                                                    checked={isEnabled}
                                                    onCheckedChange={(checked) => onToggle(feature.key, checked)}
                                                    disabled={isToggling}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
}
