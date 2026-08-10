import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, Check, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Plan {
    id: string;
    name: string;
    is_active: boolean;
}

interface PlanSelectorProps {
    plans: Plan[];
    selectedPlanId: string | null;
    onSelectPlan: (planId: string) => void;
    onCreatePlan: (data: { name: string; description?: string }) => void;
    isCreating: boolean;
}

export function PlanSelector({
    plans,
    selectedPlanId,
    onSelectPlan,
    onCreatePlan,
    isCreating,
}: PlanSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: "", description: "" });

    const filteredPlans = plans.filter((plan) =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        if (!newPlan.name) return;
        onCreatePlan(newPlan);
        setIsDialogOpen(false);
        setNewPlan({ name: "", description: "" });
    };

    return (
        <div className="flex flex-col h-full border-r pr-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Planos</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Plano</DialogTitle>
                            <DialogDescription>
                                Crie um novo plano para configurar suas features.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Plano</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Platinum, Enterprise"
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição (Opcional)</Label>
                                <Input
                                    id="description"
                                    placeholder="Breve descrição"
                                    value={newPlan.description}
                                    onChange={(e) =>
                                        setNewPlan({ ...newPlan, description: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={isCreating || !newPlan.name}>
                                {isCreating ? "Criando..." : "Criar Plano"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar plano..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <ScrollArea className="flex-1 -mr-4 pr-4 h-[400px]">
                {filteredPlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum plano encontrado.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredPlans.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => onSelectPlan(plan.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all border",
                                    selectedPlanId === plan.id
                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                        : "bg-card hover:bg-accent border-transparent hover:border-border"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-full",
                                            selectedPlanId === plan.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <Package className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium">{plan.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {plan.is_active ? "Ativo" : "Inativo"}
                                        </div>
                                    </div>
                                </div>
                                {selectedPlanId === plan.id && (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
