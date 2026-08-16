import { DiaryEntry, MealLogEntry } from "@/types/diary";
import { format } from "date-fns";
import { Clock, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDateLocale } from "@/lib/dateLocale";

interface DishHistoryProps {
    entries: DiaryEntry[];
}

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function DishHistory({ entries }: DishHistoryProps) {
    const dateLocale = useDateLocale();
    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                <Clock className="h-10 w-10 mb-2 opacity-20" />
                <p>Você ainda não registrou este prato.</p>
            </div>
        );
    }

    // Sort by date desc
    const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <ScrollArea className="h-[300px] pr-4">
            <Accordion type="single" collapsible className="space-y-3">
                {sorted.map((entry) => {
                    const date = new Date(entry.createdAt);
                    const mealEntry = entry as MealLogEntry;
                    const ingredients = (mealEntry as any).ingredients || [];

                    // Calculate total weight if possible
                    const totalWeight = ingredients.reduce((acc: number, ing: any) => {
                        const qty = Number(ing.currentQuantity || ing.quantity || 0);
                        return acc + (isNaN(qty) ? 0 : qty);
                    }, 0);

                    return (
                        <AccordionItem key={entry.id} value={entry.id} className="border border-border/40 rounded-lg bg-card/50 overflow-hidden px-0">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Calendar className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm capitalize truncate">
                                            {format(date, "EEE, d MMM", { locale: dateLocale })}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{format(date, "HH:mm")}</span>
                                            {totalWeight > 0 && <span>• ~{Math.round(totalWeight)}g</span>}
                                        </div>
                                    </div>
                                    <div className="text-right mr-2">
                                        <span className="font-bold text-primary block leading-none">{Math.round(mealEntry.macros.calories)}</span>
                                        <span className="text-[10px] uppercase text-muted-foreground font-medium">kcal</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3 pt-1 border-t border-border/30 bg-muted/20">
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Ingredientes Utilizados
                                    </p>
                                    {ingredients.length > 0 ? (
                                        <ul className="space-y-1">
                                            {ingredients.map((ing: any, i: number) => (
                                                <li key={i} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                                    <span className="text-foreground/80 truncate pr-2">{ing.name}</span>
                                                    <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">
                                                        {ing.currentQuantity || ing.quantity}{ing.unit}
                                                    </Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">Detalhes não disponíveis.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </ScrollArea>
    );
}
