import { useDiary } from "@/contexts/DiaryContext";
import { format } from "date-fns";
import { Trash2, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDateLocale } from "@/lib/dateLocale";

export function DailyMealHistory() {
    const dateLocale = useDateLocale();
    const { todayEntries, removeMealLog } = useDiary();

    const meals = todayEntries
        .filter(e => e.type === "meal")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (meals.length === 0) {
        return null;
    }

    return (
        <Card className="mt-8 border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Histórico de Hoje
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-full rounded-md">
                    <div className="space-y-3">
                        {meals.map((entry) => {
                            const time = format(new Date(entry.createdAt), "HH:mm", { locale: dateLocale });

                            // Specific type guard processing
                            const mealEntry = entry as any;

                            return (
                                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 group">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {time}
                                            </span>
                                            <span className="font-medium text-sm">{entry.dietTitle}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                {entry.dietCategory}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-orange-500/80">
                                                <Flame className="h-3 w-3" />
                                                <span>{Math.round(mealEntry.macros?.calories || 0)} kcal</span>
                                            </div>

                                            {/* Ingredients Summary */}
                                            {mealEntry.ingredients && Array.isArray(mealEntry.ingredients) && mealEntry.ingredients.length > 0 && (
                                                <div className="hidden group-hover:block absolute left-48 top-0 bg-popover text-popover-foreground p-2 rounded-md shadow-md text-xs border z-50">
                                                    <p className="font-semibold mb-1">Ingredientes:</p>
                                                    <ul className="list-disc pl-3">
                                                        {mealEntry.ingredients.map((ing: any, i: number) => (
                                                            <li key={i}>{ing.name}: {ing.currentQuantity || ing.quantity}{ing.unit}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeMealLog(entry.id)}
                                            title="Remover registro"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
