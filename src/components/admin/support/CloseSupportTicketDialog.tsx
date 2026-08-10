import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CloseSupportTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (data: { notes: string; resolved: boolean }) => void;
    isLoading?: boolean;
}

export function CloseSupportTicketDialog({
    open,
    onOpenChange,
    onConfirm,
    isLoading,
}: CloseSupportTicketDialogProps) {
    const [notes, setNotes] = useState("");
    const [resolved, setResolved] = useState<"true" | "false">("true");

    const handleConfirm = () => {
        onConfirm({
            notes,
            resolved: resolved === "true",
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle>Encerrar Ticket</DialogTitle>
                    <DialogDescription>
                        Forneça um breve resumo da resolução antes de encerrar este ticket.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label>O problema foi resolvido?</Label>
                        <RadioGroup
                            value={resolved}
                            onValueChange={(v) => setResolved(v as "true" | "false")}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="resolved-true" />
                                <Label
                                    htmlFor="resolved-true"
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Sim, resolvido
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="resolved-false" />
                                <Label
                                    htmlFor="resolved-false"
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                    Não resolvido
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Relatório de Encerramento (opcional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Descreva o que foi feito ou o motivo do encerramento..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[120px] rounded-xl resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="rounded-full"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="rounded-full px-8"
                    >
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar Encerramento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
