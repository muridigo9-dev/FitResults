import { useState, useEffect } from "react";
import { Check, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarkAsDoneButtonProps {
    isDone: boolean;
    onConfirm: () => void;
    className?: string;
    skipConfirmation?: boolean;
}

export function MarkAsDoneButton({ isDone, onConfirm, className, skipConfirmation }: MarkAsDoneButtonProps) {
    const [stage, setStage] = useState<"idle" | "confirming" | "done">("idle");

    // Reset stage if isDone changes externally (e.g. from database load)
    useEffect(() => {
        if (isDone) {
            setStage("done");
        } else if (stage === "done" && !isDone) {
            setStage("idle");
        }
    }, [isDone]);

    // Auto-reset confirmation after 3 seconds
    useEffect(() => {
        if (stage === "confirming") {
            const timer = setTimeout(() => {
                setStage("idle");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [stage]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card clicks if inside a clickable area

        if (isDone) return; // Read-only state

        if (skipConfirmation) {
            onConfirm();
            setStage("done"); // Optimistic
            return;
        }

        if (stage === "idle") {
            setStage("confirming");
        } else if (stage === "confirming") {
            onConfirm();
            setStage("done"); // Optimistic update, prop will confirm it later
        }
    };

    if (isDone) {
        return (
            <Button
                variant="secondary"
                className={cn("w-full bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20 cursor-default", className)}
                disabled
            >
                <Check className="w-4 h-4 mr-2" />
                Concluído Hoje
            </Button>
        );
    }

    return (
        <Button
            onClick={handleClick}
            variant={stage === "confirming" ? "default" : "outline"}
            className={cn(
                "w-full transition-all duration-300",
                stage === "confirming"
                    ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                    : "hover:border-primary/50",
                className
            )}
        >
            {stage === "confirming" ? (
                <>Confirmar?</>
            ) : (
                <>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Marcar como Feito
                </>
            )}
        </Button>
    );
}
