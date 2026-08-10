import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ChevronRight, Clock, Utensils, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { DietPlan, DietPlanMeal } from "@/types/content";

interface StudentDietPlanCardProps {
    plan: DietPlan;
    onDownload: (plan: DietPlan) => void;
}

export function StudentDietPlanCard({ plan, onDownload }: StudentDietPlanCardProps) {
    const totalCalories = plan.meals.reduce((acc, meal) =>
        acc + meal.options.reduce((mAcc, opt) => mAcc + opt.macros.calories, 0), 0
    );

    // Group meals by Day
    const mealsByDay: Record<string, DietPlanMeal[]> = {};
    plan.meals.forEach(meal => {
        const dayIdx = (meal as any).dayName || "Dia Padrão";
        if (!mealsByDay[dayIdx]) mealsByDay[dayIdx] = [];
        mealsByDay[dayIdx].push(meal);
    });

    const days = Object.keys(mealsByDay);

    return (
        <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl font-bold text-primary">{plan.title}</CardTitle>
                        {plan.objective && (
                            <Badge variant="outline" className="mt-2 text-xs font-normal text-muted-foreground border-primary/20 bg-primary/5">
                                {plan.objective}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(plan)}
                        title="Baixar PDF"
                        className="text-muted-foreground hover:text-primary"
                    >
                        <Download className="h-5 w-5" />
                    </Button>
                </div>
                {plan.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {plan.description}
                    </p>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 bg-muted/30 p-2 rounded-lg justify-center">
                    <div className="flex items-center gap-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="font-semibold">{Math.round(totalCalories / (days.length || 1))}</span> kcal/dia
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-1">
                        <Utensils className="h-4 w-4" />
                        <span>{plan.meals.length} refeições</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 pr-3 -mr-3">
                    <Accordion type="single" collapsible className="w-full">
                        {days.map((dayName, dayIndex) => (
                            <div key={dayName} className="mb-4 last:mb-0">
                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    {dayName}
                                </h4>
                                {mealsByDay[dayName].map((meal) => (
                                    <AccordionItem key={meal.id} value={meal.id} className="border-b-0 mb-2">
                                        <AccordionTrigger className="py-2 px-3 bg-muted/20 hover:bg-muted/40 rounded-lg text-sm [&[data-state=open]]:bg-muted/60 data-[state=open]:rounded-b-none transition-all">
                                            <div className="flex items-center justify-between w-full mr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{meal.name}</span>
                                                </div>
                                                {meal.timeSuggestion && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                        {meal.timeSuggestion}
                                                    </Badge>
                                                )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-muted/10 rounded-b-lg p-3 pt-2">
                                            <div className="space-y-3">
                                                {meal.options.length === 0 && <p className="text-xs text-muted-foreground italic">Opções não configuradas.</p>}
                                                {meal.options.map(opt => (
                                                    <div key={opt.id} className="flex gap-3 items-start p-2 bg-background rounded border border-border/50">
                                                        {opt.dishImage ? (
                                                            <div className="h-10 w-10 rounded overflow-hidden shrink-0 bg-muted">
                                                                <img src={opt.dishImage} alt={opt.dishTitle} className="h-full w-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                                                <Utensils className="h-5 w-5 text-muted-foreground/50" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-sm font-medium leading-none truncate">{opt.dishTitle}</p>
                                                                {opt.portionModifier !== 1 && (
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-orange-200 text-orange-700 bg-orange-50">
                                                                        x{opt.portionModifier}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {Math.round(opt.macros.calories)}</span>
                                                                <span className="flex items-center gap-0.5"><Beef className="h-3 w-3" /> {Math.round(opt.macros.protein)}</span>
                                                                <span className="flex items-center gap-0.5"><Wheat className="h-3 w-3" /> {Math.round(opt.macros.carbs)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </div>
                        ))}
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
