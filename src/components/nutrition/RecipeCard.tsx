import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Flame, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
    title: string;
    image?: string;
    imagePath?: string;
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    prepTime?: number;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onClick?: () => void;
}

import { Edit2, Trash2, User } from "lucide-react";
import { resolveImageUrl } from "@/hooks/useStorageUpload";

export function RecipeCard({
    title,
    image,
    imagePath,
    category,
    calories,
    protein,
    carbs,
    fat,
    prepTime,
    isOwner,
    onEdit,
    onDelete,
    onClick,
}: RecipeCardProps) {

    return (
        <Card
            className="group relative overflow-hidden border-border/40 bg-card/60 hover:bg-card hover:shadow-2xl transition-all duration-500 cursor-pointer active:scale-[0.97] rounded-2xl flex flex-col h-full"
            onClick={onClick}
        >
            {/* Image Section - More Immersion */}
            <div className="relative aspect-[1/1] overflow-hidden shrink-0">
                <img
                    src={resolveImageUrl('diet-images', imagePath, image)}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                    loading="lazy"
                />

                {/* Dynamic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                {/* Floating Category Badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className="bg-background/90 backdrop-blur-xl text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border border-border/50 text-foreground shadow-xl w-fit">
                        {category}
                    </span>
                    {isOwner && (
                        <span className="bg-primary/95 backdrop-blur-xl text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border border-primary/20 text-white shadow-xl flex items-center gap-1 w-fit">
                            <User className="h-2 w-2" />
                            Meu Prato
                        </span>
                    )}
                </div>

                {isOwner && (
                    <div className="absolute top-2 right-2 flex gap-1 z-20">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="bg-background/90 h-7 w-7 flex items-center justify-center rounded-lg border border-border/50 shadow-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="bg-destructive/90 h-7 w-7 flex items-center justify-center rounded-lg border border-destructive/20 shadow-xl text-white hover:bg-destructive transition-all active:scale-95"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Bottom Center Info (Minimalist) */}
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 backdrop-blur-md rounded-full border border-orange-500/20">
                        <Flame className="h-2.5 w-2.5 text-orange-500 fill-orange-500" />
                        <span className="text-[10px] font-bold text-orange-600">{calories}</span>
                    </div>
                </div>
            </div>

            {/* Title Section */}
            <div className="p-2.5 flex-1 flex flex-col justify-between">
                <h3 className="font-bold text-xs leading-tight line-clamp-2 text-foreground mb-2 group-hover:text-primary transition-colors">
                    {title}
                </h3>

                {/* Macros Row (Ultra Compact & Unified - No Wrap) */}
                <div className="flex flex-row items-center justify-between text-[9px] font-black uppercase tracking-tight gap-1 opacity-90 px-0.5">
                    <div className="flex items-center gap-0.5 whitespace-nowrap">
                        <span className="text-red-500">{protein}g</span>
                        <span className="text-[7px] text-muted-foreground font-medium">P</span>
                    </div>
                    <div className="w-px h-3 bg-border/20 shrink-0" />
                    <div className="flex items-center gap-0.5 whitespace-nowrap">
                        <span className="text-amber-500">{carbs}g</span>
                        <span className="text-[7px] text-muted-foreground font-medium">C</span>
                    </div>
                    <div className="w-px h-3 bg-border/20 shrink-0" />
                    <div className="flex items-center gap-0.5 whitespace-nowrap">
                        <span className="text-blue-500">{fat}g</span>
                        <span className="text-[7px] text-muted-foreground font-medium">G</span>
                    </div>
                </div>
            </div>

            {/* Hover Indicator */}
            <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-500" />
        </Card>
    );
}
