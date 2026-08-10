import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDiary } from "@/contexts/DiaryContext";
import { Loader2, Plus, Minus, Flame, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { cn } from "@/lib/utils";

interface LogMealDialogProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: {
        id: string;
        title: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        category?: string;
        ingredients?: any[];
    };
    initialPortion?: number;
}

export function LogMealDialog({ isOpen, onClose, recipe, initialPortion = 1.0 }: LogMealDialogProps) {
    const { logMeal } = useDiary();
    const { user } = useAuth();
    const { calorieTarget } = useUserMetrics();

    const [loading, setLoading] = useState(false);

    // Default time to now
    const [selectedTime, setSelectedTime] = useState(() => {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    });

    // Calculate Intelligent Recommendation Scale
    const smartScale = useMemo(() => {
        if (!calorieTarget?.target || !recipe.calories) return null;
        return initialPortion;
    }, [calorieTarget, recipe.calories, initialPortion]);

    // Initialize ingredients with the recommended portion
    const [ingredients, setIngredients] = useState<any[]>(() => {
        return (recipe.ingredients || []).map((ing: any) => {
            const baseQty = Number(ing.quantity) || 0;
            const initialQty = Math.round(baseQty * initialPortion);

            return {
                ...ing,
                currentQuantity: initialQty,
                baseQuantity: baseQty,
                // Pro-rata macros
                kcalPerUnit: baseQty > 0 ? (ing.calories / baseQty) : (recipe.calories / 100),
                proteinPerUnit: baseQty > 0 ? (ing.protein / baseQty) : (recipe.protein / 100),
                carbsPerUnit: baseQty > 0 ? (ing.carbs / baseQty) : (recipe.carbs / 100),
                fatPerUnit: baseQty > 0 ? (ing.fat / baseQty) : (recipe.fat / 100),
            };
        });
    });

    // Calculate dynamic totals
    const totals = useMemo(() => {
        if (ingredients.length === 0) {
            return {
                calories: recipe.calories * initialPortion,
                protein: recipe.protein * initialPortion,
                carbs: recipe.carbs * initialPortion,
                fat: recipe.fat * initialPortion,
            };
        }
        return ingredients.reduce((acc, ing) => {
            const qty = Number(ing.currentQuantity) || 0;
            return {
                calories: acc.calories + (qty * (ing.kcalPerUnit || 0)),
                protein: acc.protein + (qty * (ing.proteinPerUnit || 0)),
                carbs: acc.carbs + (qty * (ing.carbsPerUnit || 0)),
                fat: acc.fat + (qty * (ing.fatPerUnit || 0)),
            };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [ingredients, recipe, initialPortion]);

    const updateIngredientQuantity = (id: string, newQty: number) => {
        setIngredients(prev => prev.map(ing =>
            ing.id === id ? { ...ing, currentQuantity: Math.max(0, newQty) } : ing
        ));
    };

    const handleLogMeal = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            const consumedAt = date.toISOString();

            await logMeal({
                id: recipe.id,
                title: recipe.title,
                category: recipe.category,
                macros: {
                    calories: Math.round(totals.calories),
                    protein: Math.round(totals.protein),
                    carbs: Math.round(totals.carbs),
                    fat: Math.round(totals.fat)
                },
                imageUrl: "",
                isActive: true,
                createdAt: "",
                visibilityType: "private",
                ownerType: "student",
                ingredients: ingredients,
                preparation: [],
                consumedAt: consumedAt
            } as any);

            toast.success("Refeição registrada!");
            onClose();
        } catch (error) {
            console.error("Error logging meal:", error);
            toast.error("Erro ao registrar refeição");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-none rounded-t-[32px] sm:rounded-[32px] flex flex-col h-[90vh] sm:h-auto">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/40 rounded-full sm:hidden" />

                <div className="p-6 pb-2 pt-8 sm:pt-6 flex justify-between items-start">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 bg-muted/20">
                        <Minus className="h-5 w-5 rotate-45" />
                    </Button>

                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-sm">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                    </div>

                    <div className="w-10" />
                </div>

                <DialogHeader className="sr-only">
                    <DialogTitle>Registrar {recipe.title}</DialogTitle>
                    <DialogDescription>Ajuste sua porção e confirme o registro.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
                    {smartScale && (
                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 mb-1">Recomendação Inteligente</p>
                            <p className="text-sm font-bold text-foreground/80 leading-tight">
                                Sugerimos <span className="text-primary font-black text-lg underline decoration-primary/30 underline-offset-4">{smartScale.toFixed(2)}x</span> a porção para atingir seu objetivo.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between bg-muted/30 rounded-[2.5rem] p-6 border border-border/40">
                        <div className="flex flex-col items-center flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Flame className="h-4 w-4 text-orange-500 fill-current" />
                                <span className="text-2xl font-black">{Math.round(totals.calories)}</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Kcal</span>
                        </div>

                        <div className="w-px h-10 bg-border/60 mx-2" />

                        <div className="grid grid-cols-3 gap-6 flex-[2] text-center">
                            <div>
                                <span className="block font-black text-lg leading-none">{Math.round(totals.protein)}g</span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1 block">Prot</span>
                            </div>
                            <div>
                                <span className="block font-black text-lg leading-none">{Math.round(totals.carbs)}g</span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1 block">Carb</span>
                            </div>
                            <div>
                                <span className="block font-black text-lg leading-none">{Math.round(totals.fat)}g</span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1 block">Gord</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 px-2">
                        <div>
                            <h2 className="text-xl font-black leading-tight line-clamp-2">{recipe.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                                    <Clock className="h-3 w-3" />
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="bg-transparent border-none outline-none text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pb-8">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Ajustar Ingredientes</Label>
                        {ingredients.map((ing, i) => (
                            <div key={`ing-${ing.id || i}-${i}`} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-[2rem] hover:bg-muted/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shadow-sm">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm block">{ing.name}</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">Ideal: {Math.round(ing.baseQuantity * initialPortion)}{ing.unit}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 bg-background p-1.5 rounded-2xl border shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-xl hover:bg-muted"
                                        onClick={() => updateIngredientQuantity(ing.id, ing.currentQuantity - 5)}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={ing.currentQuantity}
                                        onChange={(e) => updateIngredientQuantity(ing.id, Number(e.target.value))}
                                        className="w-14 h-8 border-none bg-transparent text-center font-black text-sm p-0 focus-visible:ring-0"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-xl hover:bg-muted"
                                        onClick={() => updateIngredientQuantity(ing.id, ing.currentQuantity + 5)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0 z-10">
                    <Button
                        onClick={handleLogMeal}
                        disabled={loading}
                        className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[2rem] font-black text-lg gap-2 shadow-premium"
                    >
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <>
                                REGISTRAR
                                <ChevronRight className="h-5 w-5" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
