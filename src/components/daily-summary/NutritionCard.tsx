import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Utensils, Zap, Plus, Circle, ChevronRight, Pencil, Trash2, Save, X as CloseIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerClose,
    DrawerFooter
} from "@/components/ui/drawer";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/hooks/useI18n";

interface NutritionCardProps {
    data: {
        caloriesConsumed: number;
        proteinConsumed: number;
        carbsConsumed: number;
        fatConsumed: number;
        mealsLogged: number;
        entries: any[];
    } | null;
}

function MealDetailDrawer({ entry, onClose }: { entry: any; onClose?: () => void }) {
    const { t } = useI18n();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editedIngredients, setEditedIngredients] = useState(entry.ingredients || []);

    // Recalculate macros based on ingredient changes vs original entry
    const currentCalculatedMacros = useMemo(() => {
        return editedIngredients.reduce((acc: any, ing: any) => {
            const newQty = parseFloat(ing.quantity) || 0;
            // Find original ingredient to get base macros
            const orig = (entry.ingredients || []).find((i: any) => i.name === ing.name);
            const origQty = parseFloat(orig?.quantity) || 1; // Avoid division by zero

            const ratio = newQty / origQty;

            return {
                calories: acc.calories + ((orig?.calories || 0) * ratio),
                protein: acc.protein + ((orig?.protein || 0) * ratio),
                carbs: acc.carbs + ((orig?.carbs || 0) * ratio),
                fat: acc.fat + ((orig?.fat || 0) * ratio),
            };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [editedIngredients, entry.ingredients]);

    // Reset local state when drawer closes/opens
    useEffect(() => {
        setEditedIngredients(entry.ingredients || []);
    }, [entry, isEditing]);

    const handleSave = () => {
        const updates = {
            calories: Math.round(currentCalculatedMacros.calories),
            protein: Math.round(currentCalculatedMacros.protein),
            carbs: Math.round(currentCalculatedMacros.carbs),
            fat: Math.round(currentCalculatedMacros.fat),
            ingredients: editedIngredients,
        };
        (window as any).updateMealLog?.(entry.id, updates);
        setIsEditing(false);
    };

    const handleDelete = () => {
        (window as any).removeMealLog?.(entry.id);
        setIsDeleteDialogOpen(false);
        onClose?.(); // Close drawer after deletion
    };

    const updateIngredientQuantity = (idx: number, newQty: string) => {
        const newIngs = [...editedIngredients];
        // Only allow numbers and decimal
        const cleanQty = newQty.replace(/[^0-9.]/g, '');
        newIngs[idx] = { ...newIngs[idx], quantity: cleanQty };
        setEditedIngredients(newIngs);
    };

    const displayMacros = isEditing ? currentCalculatedMacros : entry;

    return (
        <DrawerContent>
            <DrawerHeader className="text-left border-b pb-4">
                <div className="flex items-center justify-between">
                    <DrawerTitle className="flex items-center gap-2 truncate pr-4 text-orange-500">
                        <Utensils className="h-5 w-5 shrink-0" />
                        <span className="truncate">{entry.title}</span>
                    </DrawerTitle>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-9 w-9 rounded-full", isEditing && "bg-primary/10 text-primary")}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90vw] max-w-sm rounded-2xl border-destructive/20" aria-describedby="delete-confirmation-description">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-center">{t("summary.nutrition.deleteTitle")}</AlertDialogTitle>
                                    <AlertDialogDescription id="delete-confirmation-description" className="text-center">
                                        {t("summary.nutrition.deleteDescription", { title: entry.title })}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-2 mt-4 sm:flex-col">
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-black h-12 w-full"
                                    >
                                        Excluir Agora
                                    </AlertDialogAction>
                                    <AlertDialogCancel className="rounded-xl border-none h-12 w-full font-bold bg-muted/50">
                                        Cancelar
                                    </AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </DrawerHeader>

            <div className="p-4 max-h-[65vh] overflow-y-auto space-y-6">
                {/* Visual Macros - Total recalculated based on proportions */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-muted/30 p-2 rounded-xl border border-border/50 text-center relative overflow-hidden">
                        <span className="block text-xs font-black text-foreground">{Math.round(displayMacros.calories)}</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black">Kcal</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-xl border border-border/50 text-center relative overflow-hidden">
                        <span className="block text-xs font-black text-foreground">{Math.round(displayMacros.protein)}g</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black">Prot</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-xl border border-border/50 text-center relative overflow-hidden">
                        <span className="block text-xs font-black text-foreground">{Math.round(displayMacros.carbs)}g</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black">Carb</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-xl border border-border/50 text-center relative overflow-hidden">
                        <span className="block text-xs font-black text-foreground">{Math.round(displayMacros.fat)}g</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black">Gord</span>
                    </div>
                </div>

                {/* Ingredients Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ingredientes</p>
                        {isEditing && <span className="text-[10px] text-primary font-bold animate-pulse">{t("summary.nutrition.adjustPortions")}</span>}
                    </div>
                    <div className="space-y-2">
                        {editedIngredients.map((ingredient: any, idx: number) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                                    isEditing ? "bg-background border-primary/40 shadow-sm" : "bg-muted/20 border-border/50"
                                )}
                            >
                                <span className="text-sm font-medium pr-4">{ingredient.name}</span>
                                {isEditing ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={ingredient.quantity}
                                            onChange={(e) => updateIngredientQuantity(idx, e.target.value)}
                                            className="w-16 bg-muted/40 border-b-2 border-primary/60 text-right px-1 text-sm font-black focus:bg-muted outline-none rounded-t-lg"
                                        />
                                        <span className="text-[10px] font-black text-muted-foreground min-w-[24px] uppercase">{ingredient.unit}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border/30">
                                        {ingredient.quantity} {ingredient.unit}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DrawerFooter className="pt-2">
                {isEditing ? (
                    <Button className="w-full h-14 gap-2 text-base font-black shadow-xl animate-in fade-in zoom-in-95" onClick={handleSave}>
                        <Save className="h-5 w-5" />
                        Atualizar Registro
                    </Button>
                ) : (
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full h-12 font-bold rounded-xl bg-muted/20">Fechar Detalhes</Button>
                    </DrawerClose>
                )}
            </DrawerFooter>
        </DrawerContent>
    );
}

export function NutritionCard({ data }: NutritionCardProps) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
    const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);
    const { calorieGoal } = useDashboardPreferences();

    if (!data || data.mealsLogged === 0) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <Utensils className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground font-medium">{t("summary.nutrition.noMeals")}</p>
                    <Button
                        variant="link"
                        size="sm"
                        className="text-primary mt-2"
                        onClick={() => navigate("/nutrition")}
                    >
                        {t("summary.nutrition.logFirst")}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Target calories from user goals
    const targetCalories = calorieGoal;
    const calPercent = Math.min(100, (data.caloriesConsumed / targetCalories) * 100);


    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-orange-500" />
                        {t("checkin.meals")}
                    </CardTitle>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 uppercase">
                        {t("summary.nutrition.mealCount", { count: data.mealsLogged })}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                {/* Calories Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black">{data.caloriesConsumed}</span>
                            <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">Kcal Consumidas</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-black mb-1">/{targetCalories}</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${calPercent}%` }}
                        />
                    </div>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50 text-center">
                        <span className="block text-xs font-black text-foreground">{Math.round(data.proteinConsumed)}g</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black">{t("nutrition.protein")}</span>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50 text-center">
                        <span className="block text-xs font-black text-foreground">{Math.round(data.carbsConsumed)}g</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black">Carbos</span>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50 text-center">
                        <span className="block text-xs font-black text-foreground">{Math.round(data.fatConsumed)}g</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black">Gordura</span>
                    </div>
                </div>

                {/* Entry List with Details */}
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Linha do Tempo</p>
                    {(isExpanded ? data.entries : data.entries.slice(0, 3)).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 group">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{entry.title}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">{entry.calories} kcal</p>
                            </div>

                            <Drawer
                                open={openDrawerId === entry.id}
                                onOpenChange={(open) => setOpenDrawerId(open ? entry.id : null)}
                            >
                                <DrawerTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-[10px] font-black h-7 ml-2 shrink-0 bg-muted/30 px-3 rounded-lg border border-transparent hover:border-primary/20">
                                        DETALHES <ChevronRight className="h-3 w-3 ml-0.5" />
                                    </Button>
                                </DrawerTrigger>
                                <MealDetailDrawer
                                    entry={entry}
                                    onClose={() => setOpenDrawerId(null)}
                                />
                            </Drawer>
                        </div>
                    ))}

                    {data.entries.length > 3 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-[10px] font-black uppercase text-muted-foreground mt-2 h-9 rounded-xl hover:bg-muted/50 active:scale-95 transition-all"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? t("summary.showLess") : t("summary.hiddenItems", { count: data.entries.length - 3 })}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
