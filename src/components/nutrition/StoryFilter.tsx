import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface StoryFilterProps {
    categories: { id: string; label: string; image?: string }[];
    selectedCategory: string | null;
    onSelectCategory: (id: string | null) => void;
}

export function StoryFilter({
    categories,
    selectedCategory,
    onSelectCategory,
}: StoryFilterProps) {
    return (
        <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-4 p-4">
                {/* 'All' Option */}
                <button
                    onClick={() => onSelectCategory(null)}
                    className="group flex flex-col items-center gap-2 outline-none transition-all active:scale-95"
                >
                    <div
                        className={cn(
                            "h-16 w-16 rounded-full p-[2px] transition-all duration-300",
                            selectedCategory === null
                                ? "bg-gradient-to-tr from-primary to-purple-500"
                                : "bg-muted hover:bg-muted/80"
                        )}
                    >
                        <div className="h-full w-full rounded-full border-2 border-background bg-card flex items-center justify-center overflow-hidden">
                            <span className={cn("text-xs font-bold", selectedCategory === null ? "text-primary" : "text-muted-foreground")}>
                                Tudo
                            </span>
                        </div>
                    </div>
                    <span
                        className={cn(
                            "text-xs font-medium transition-colors",
                            selectedCategory === null ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        Todos
                    </span>
                </button>

                {categories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelectCategory(category.id)}
                            className="group flex flex-col items-center gap-2 outline-none transition-all active:scale-95"
                        >
                            <div
                                className={cn(
                                    "h-16 w-16 rounded-full p-[2px] transition-all duration-300",
                                    isSelected
                                        ? "bg-gradient-to-tr from-primary to-purple-500"
                                        : "bg-gradient-to-tr from-muted to-muted/50 hover:from-primary/50 hover:to-purple-500/50"
                                )}
                            >
                                <div className="h-full w-full rounded-full border-2 border-background bg-card flex items-center justify-center overflow-hidden relative">
                                    {category.image ? (
                                        <img src={category.image} alt={category.label} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-muted/20">
                                            <span className="text-xl capitalize text-muted-foreground/50 font-bold">
                                                {category.label.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {category.label}
                            </span>
                        </button>
                    )
                })}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
    );
}
