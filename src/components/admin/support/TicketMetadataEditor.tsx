import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SupportTicket, useAdminSupportTickets } from "@/hooks/useSupport";
import {
    Tag,
    AlertCircle,
    Clock,
    Zap,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketMetadataEditorProps {
    ticket: SupportTicket;
}

const CATEGORIES = [
    { value: "onboarding", label: "Onboarding / Início" },
    { value: "billing", label: "Pagamento / Plano" },
    { value: "technical", label: "Problema Técnico" },
    { value: "exercise", label: "Dúvida Treino" },
    { value: "nutrition", label: "Dúvida Dieta" },
    { value: "other", label: "Outros" },
];

const PRIORITIES = [
    { value: "low", label: "Baixa", color: "text-blue-500", icon: Clock },
    { value: "medium", label: "Média", color: "text-amber-500", icon: AlertCircle },
    { value: "high", label: "Alta", color: "text-orange-500", icon: AlertCircle },
    { value: "urgent", label: "Urgente", color: "text-destructive", icon: Zap },
];

export function TicketMetadataEditor({ ticket }: TicketMetadataEditorProps) {
    const { updateMetadata } = useAdminSupportTickets();

    return (
        <div className="flex flex-wrap items-center gap-6 p-4 bg-muted/30 border-b border-border animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Category */}
            <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                    <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight mb-1">
                        Categoria
                    </Label>
                    <Select
                        value={ticket.category || "other"}
                        onValueChange={(v) => updateMetadata({ ticketId: ticket.id, category: v })}
                    >
                        <SelectTrigger className="h-8 min-w-[140px] text-xs border-none bg-background shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                    <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight mb-1">
                        Prioridade
                    </Label>
                    <Select
                        value={ticket.priority || "medium"}
                        onValueChange={(v) => updateMetadata({ ticketId: ticket.id, priority: v as any })}
                    >
                        <SelectTrigger className="h-8 min-w-[110px] text-xs border-none bg-background shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={p.value} className="text-xs">
                                    <div className="flex items-center gap-2">
                                        <p.icon className={cn("h-3 w-3", p.color)} />
                                        {p.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
