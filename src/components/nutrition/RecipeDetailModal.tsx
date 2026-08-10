import { useState, useEffect, useRef } from "react";
import {
    X,
    Clock,
    Flame,
    ChefHat,
    List,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Trash2
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { resolveImageUrl } from "@/hooks/useStorageUpload";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogMealDialog } from "./LogMealDialog";
import { cn } from "@/lib/utils";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { useSmartPortions } from "@/hooks/useSmartPortions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDiary } from "@/contexts/DiaryContext";
import { DishHistory } from "./DishHistory";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface RecipeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipes: any[];
    initialIndex: number;
    onEdit?: (recipe: any) => void;
    onDelete?: (id: string) => void;
}


export function RecipeDetailModal({ isOpen, onClose, recipes, initialIndex, onEdit, onDelete }: RecipeDetailModalProps) {
    const { user } = useAuth();

    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
    const { entries } = useDiary();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Update active index when initial index changes (e.g. user clicks a different card)
    useEffect(() => {
        if (isOpen) {
            setActiveIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    if (!recipes || recipes.length === 0 || activeIndex < 0 || activeIndex >= recipes.length) return null;

    const recipe = recipes[activeIndex];
    const { multiplier, suggestedMacros, isSmart } = useSmartPortions(recipe);
    const displayMacros = isSmart ? suggestedMacros : recipe.macros;
    const filteredEntries = entries.filter(e => e.type === "meal" && (e as any).dietId === recipe.id);
    const isOwner = recipe.ownerType === 'student' && recipe.ownerId === user?.id;


    const handleNext = () => {
        if (activeIndex < recipes.length - 1) {
            setActiveIndex(prev => prev + 1);
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.x < -100) handleNext();
        else if (info.offset.x > 100) handlePrev();
    };

    const Content = (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Top Thumbnails Navigator (Super Swipe) */}
            <div className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border/40 py-3 px-4 z-50">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full bg-muted/50"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        {recipes.map((r, idx) => (
                            <button
                                key={`${r.id}-${idx}`}
                                onClick={() => setActiveIndex(idx)}
                                className={cn(
                                    "relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-300 active:scale-95",
                                    idx === activeIndex
                                        ? "border-primary scale-110 shadow-lg shadow-primary/20 ring-4 ring-primary/10"
                                        : "border-transparent opacity-40 hover:opacity-100"
                                )}
                            >
                                <img src={resolveImageUrl('diet-images', r.imagePath, r.imageUrl)} className="h-full w-full object-cover" />
                                {idx === activeIndex && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white shadow-xl animate-pulse" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    className="flex-1 flex flex-col h-full overflow-hidden"
                >
                    <ScrollArea className="flex-1 h-full" scrollHideDelay={0}>
                        <div className="flex flex-col pb-24">
                            {/* Hero Image Area */}
                            <div className="relative h-[45vh] md:h-80 shrink-0 w-full overflow-hidden">
                                <img
                                    src={resolveImageUrl('diet-images', recipe.imagePath, recipe.imageUrl)}
                                    alt={recipe.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                                <div className="absolute bottom-6 left-6 right-6">
                                    <Badge className="mb-2 bg-primary text-white border-none px-3 py-1 font-black uppercase text-[10px] tracking-widest shadow-xl">
                                        {recipe.category || "Geral"}
                                    </Badge>
                                    <h2 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl">
                                        {recipe.title}
                                    </h2>
                                </div>
                            </div>

                            <div className="px-6 -mt-8 pt-8 rounded-t-[32px] bg-background relative z-10 space-y-8">
                                {/* Smart Portion Alert */}
                                {isSmart && multiplier !== 1 && (
                                    <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/20 flex flex-col items-center text-center shadow-inner">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">RECOMENDAÇÃO INTELIGENTE</span>
                                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                                            Sugerimos <strong className="text-primary">{multiplier}x</strong> a porção para atingir seu objetivo.
                                        </p>
                                    </div>
                                )}

                                {/* Macros Minimalist Bar - Centered & Premium */}
                                <div className="flex items-center justify-center py-2">
                                    <div className="flex items-center gap-4 bg-muted/20 backdrop-blur-md p-4 rounded-[32px] border border-border/40 shadow-sm">
                                        <div className="flex flex-col items-center px-2">
                                            <Flame className="h-4 w-4 mb-1 text-orange-500" />
                                            <span className="text-xl font-black text-foreground leading-none">{displayMacros.calories}</span>
                                            <span className="text-[8px] uppercase font-black text-muted-foreground mt-0.5">Kcal</span>
                                        </div>

                                        <div className="w-px h-10 bg-border/40 shrink-0" />

                                        <div className="flex items-center gap-4 px-2">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="text-base font-black text-foreground">{displayMacros.protein}g</span>
                                                    <span className="text-[9px] font-black text-red-500">P</span>
                                                </div>
                                                <span className="text-[8px] uppercase font-bold text-muted-foreground opacity-60">Prot</span>
                                            </div>

                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="text-base font-black text-foreground">{displayMacros.carbs}g</span>
                                                    <span className="text-[9px] font-black text-amber-500">C</span>
                                                </div>
                                                <span className="text-[8px] uppercase font-bold text-muted-foreground opacity-60">Carb</span>
                                            </div>

                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="text-base font-black text-foreground">{displayMacros.fat}g</span>
                                                    <span className="text-[9px] font-black text-blue-500">G</span>
                                                </div>
                                                <span className="text-[8px] uppercase font-bold text-muted-foreground opacity-60">Gord</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Tabs defaultValue="ingredients" className="w-full">
                                    <TabsList className="w-full grid grid-cols-3 bg-muted/20 p-1.5 h-12 rounded-2xl mb-8">
                                        <TabsTrigger value="ingredients" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Ingredientes</TabsTrigger>
                                        <TabsTrigger value="prep" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Preparo</TabsTrigger>
                                        <TabsTrigger value="history" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Histórico</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="ingredients" className="space-y-4 focus-visible:outline-none">
                                        <div className="space-y-3">
                                            {recipe.ingredients?.map((item: any, idx: number) => {
                                                const baseQty = Number(item.quantity) || 0;
                                                const recQty = Math.round(baseQty * multiplier);

                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-black">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm text-foreground">{item.name}</span>
                                                                {isSmart && multiplier !== 1 && (
                                                                    <span className="text-[10px] text-primary font-black uppercase">
                                                                        Ideal: {recQty} {item.unit}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                                                            {baseQty} {item.unit}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="prep" className="space-y-4 focus-visible:outline-none">
                                        <div className="space-y-6">
                                            {recipe.preparation?.sort((a: any, b: any) => a.order - b.order).map((step: any) => (
                                                <div key={step.id} className="flex gap-5 group">
                                                    <div className="flex-none flex items-center justify-center w-10 h-10 rounded-2xl bg-muted/50 text-muted-foreground font-black text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        {step.order}
                                                    </div>
                                                    <div className="flex-1 pt-1.5">
                                                        <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                                                            {step.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
                                        <DishHistory entries={filteredEntries} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Indicators (Mobile) */}
            <div className="absolute top-[50%] -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none opacity-20 hover:opacity-100 transition-opacity hidden md:flex">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-background shadow-2xl pointer-events-auto"
                    disabled={activeIndex === 0}
                    onClick={handlePrev}
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-background shadow-2xl pointer-events-auto"
                    disabled={activeIndex === recipes.length - 1}
                    onClick={handleNext}
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>

            {/* Fixed Bottom Action Bar - Premium Floating Style */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 md:pb-6 bg-gradient-to-t from-background via-background/98 to-transparent pt-12 z-50">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    {isOwner && (
                        <div className="flex gap-2.5">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-14 w-14 rounded-2xl border-border/40 bg-muted/20 backdrop-blur-xl hover:bg-muted/40 transition-all active:scale-90"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    onEdit?.(recipe);
                                }}
                            >
                                <Edit2 className="h-5 w-5 text-muted-foreground" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-14 w-14 rounded-2xl border-red-500/20 bg-red-500/5 text-red-500 backdrop-blur-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(); // Close modal to show confirmation dialog
                                    onDelete?.(recipe.id);
                                }}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    <Button
                        onClick={() => setIsLogDialogOpen(true)}
                        className="flex-1 h-14 rounded-2xl text-sm font-black uppercase tracking-[0.1em] shadow-[0_8px_30px_rgb(var(--primary-rgb),0.3)] hover:shadow-[0_8px_30px_rgb(var(--primary-rgb),0.5)] transition-all active:scale-[0.98] bg-primary text-primary-foreground group"
                    >
                        Registrar
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>


            {/* Log Meal Dialog */}
            <LogMealDialog
                isOpen={isLogDialogOpen}
                onClose={() => setIsLogDialogOpen(false)}
                recipe={{
                    ...recipe,
                    calories: recipe.macros.calories,
                    protein: recipe.macros.protein,
                    carbs: recipe.macros.carbs,
                    fat: recipe.macros.fat,
                }}
                initialPortion={multiplier}
            />
        </div >
    );

    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-none h-[85vh] rounded-[32px]">
                    <div className="sr-only">
                        <DialogTitle>{recipe.title}</DialogTitle>
                        <DialogDescription>Detalhes da receita e macros nutricionais</DialogDescription>
                    </div>
                    {Content}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="h-[96vh] rounded-t-[40px] p-0 overflow-hidden outline-none ring-0 border-none bg-background">
                <div className="sr-only">
                    <DialogTitle>{recipe.title}</DialogTitle>
                    <DialogDescription>Detalhes da receita e macros nutricionais</DialogDescription>
                </div>
                {Content}
            </DrawerContent>
        </Drawer>
    );
}
