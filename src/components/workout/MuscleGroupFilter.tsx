import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMuscleGroups } from "@/hooks/useExercises";
import { resolveImageUrl } from "@/hooks/useStorageUpload";
import type { MuscleGroup } from "@/types/content";

interface MuscleGroupFilterProps {
  selectedId?: string;
  onSelect: (muscleGroup: MuscleGroup | null) => void;
  showAll?: boolean;
  className?: string;
}

// Fallback icons for muscle groups without images
const MUSCLE_GROUP_FALLBACK_ICONS: Record<string, string> = {
  peito: "💪",
  costas: "🔙",
  ombros: "🎯",
  biceps: "💪",
  triceps: "💪",
  antebraco: "✊",
  quadriceps: "🦵",
  posterior: "🦵",
  gluteos: "🍑",
  panturrilha: "🦶",
  abdomen: "🔥",
  lombar: "🔙",
  core: "🎯",
  "corpo-inteiro": "🏋️",
};

// Gradient colors for each category
// Gradient colors removed in favor of theme constants for cleaner look
// const CATEGORY_GRADIENTS ...

export function MuscleGroupFilter({
  selectedId,
  onSelect,
  showAll = true,
  className,
}: MuscleGroupFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { muscleGroups, isLoading } = useMuscleGroups();

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className={cn("relative", className)}>
        <div className="flex gap-3 overflow-hidden py-2" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-muted" />
              <div className="w-12 h-3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-[2.5rem] -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity border"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-4 -mx-4 items-start"
        onScroll={handleScroll}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All Option */}
        {showAll && (
          <MuscleGroupItem
            muscleGroup={null}
            isSelected={!selectedId}
            onClick={() => onSelect(null)}
          />
        )}

        {/* Muscle Groups */}
        {muscleGroups.map((mg) => (
          <MuscleGroupItem
            key={mg.id}
            muscleGroup={mg}
            isSelected={selectedId === mg.id}
            onClick={() => onSelect(mg)}
          />
        ))}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-[2.5rem] -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity border"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Gradient Overlays for scroll hint */}
      <div className="absolute left-0 top-0 bottom-8 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-8 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

interface MuscleGroupItemProps {
  muscleGroup: MuscleGroup | null;
  isSelected: boolean;
  onClick: () => void;
}

function MuscleGroupItem({ muscleGroup, isSelected, onClick }: MuscleGroupItemProps) {
  // Using theme colors instead of hardcoded gradients
  const fallbackIcon = muscleGroup
    ? MUSCLE_GROUP_FALLBACK_ICONS[muscleGroup.slug] || "💪"
    : "🏋️";

  const hasImage = muscleGroup?.imageUrl;

  // Dynamic color for "Todos" could be primary, others neutral
  const bgColor = isSelected
    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 hover:border-border";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 min-w-[72px] transition-all duration-300 group/item",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
      )}
    >
      {/* Circle Container */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300",
          isSelected ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "scale-100 group-hover/item:scale-105",
          !hasImage && bgColor
        )}
      >
        {hasImage ? (
          <img
            src={resolveImageUrl('muscle-groups', muscleGroup?.imagePath, muscleGroup?.imageUrl)}
            alt={muscleGroup?.name || ""}
            className="w-full h-full object-cover"
          />
        ) : (
          // Icon Display - Clean and Mineral
          <div className="flex items-center justify-center">
            {muscleGroup ? (
              <span className={cn("text-2xl drop-shadow-sm", isSelected ? "text-primary-foreground" : "opacity-70 grayscale group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all")}>
                {fallbackIcon}
              </span>
            ) : (
              <Dumbbell className={cn("h-6 w-6", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
            )}
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-xs font-medium text-center line-clamp-1 max-w-[80px] transition-colors leading-tight px-1",
          isSelected ? "text-primary font-semibold" : "text-muted-foreground group-hover/item:text-foreground"
        )}
      >
        {muscleGroup?.name || "Todos"}
      </span>
    </button>
  );
}

// ============================================
// COMPACT VERSION (Pills)
// ============================================

interface MuscleGroupPillsProps {
  selectedId?: string;
  onSelect: (muscleGroup: MuscleGroup | null) => void;
  showAll?: boolean;
  className?: string;
}

export function MuscleGroupPills({
  selectedId,
  onSelect,
  showAll = true,
  className,
}: MuscleGroupPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { muscleGroups, isLoading } = useMuscleGroups();

  if (isLoading) {
    return (
      <div className={cn("flex gap-2 overflow-hidden", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-hide py-1",
        className
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {showAll && (
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            !selectedId
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          Todos
        </button>
      )}

      {muscleGroups.map((mg) => {
        const isSelected = selectedId === mg.id;
        const emoji = MUSCLE_GROUP_FALLBACK_ICONS[mg.slug] || "💪";

        return (
          <button
            key={mg.id}
            onClick={() => onSelect(mg)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <span>{emoji}</span>
            {mg.name}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// GRID VERSION
// ============================================

interface MuscleGroupGridProps {
  selectedIds?: string[];
  onToggle: (muscleGroup: MuscleGroup) => void;
  className?: string;
}

export function MuscleGroupGrid({
  selectedIds = [],
  onToggle,
  className,
}: MuscleGroupGridProps) {
  const { muscleGroups, groupedMuscleGroups, isLoading } = useMuscleGroups();

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3", className)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const categories = [
    { key: "upper" as const, label: "Superior" },
    { key: "lower" as const, label: "Inferior" },
    { key: "core" as const, label: "Core" },
    { key: "full" as const, label: "Completo" },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {categories.map(({ key, label }) => {
        const items = groupedMuscleGroups[key];
        if (items.length === 0) return null;

        return (
          <div key={key}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">{label}</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((mg) => {
                const isSelected = selectedIds.includes(mg.id);
                const emoji = MUSCLE_GROUP_FALLBACK_ICONS[mg.slug] || "💪";
                // New logic: neutral background, primary ring if selected
                const bgColor = isSelected
                  ? "bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "bg-muted/30 hover:bg-muted/80 hover:ring-2 hover:ring-primary/20";

                return (
                  <button
                    key={mg.id}
                    onClick={() => onToggle(mg)}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden transition-all duration-300 relative group/card",
                      isSelected ? "scale-95" : "hover:scale-95",
                      !mg.imageUrl && bgColor
                    )}
                  >
                    {mg.imageUrl ? (
                      <div className={cn("w-full h-full relative", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl")}>
                        <img
                          src={resolveImageUrl('muscle-groups', mg.imagePath, mg.imageUrl)}
                          alt={mg.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {/* Dark overlay for text readability on images */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-full h-full flex flex-col items-center justify-center p-2",
                          "transition-colors"
                        )}
                      >
                        {/* Centered Icon without gradient */}
                        <span className={cn(
                          "text-3xl filter drop-shadow-sm transition-all duration-300",
                          isSelected ? "scale-110 opacity-100 grayscale-0" : "opacity-70 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-100"
                        )}>{emoji}</span>
                      </div>
                    )}

                    {/* Overlay with name - Adaptive color */}
                    <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-center">
                      <span className={cn(
                        "text-xs font-medium text-center line-clamp-1 w-full",
                        mg.imageUrl ? "text-white" : (isSelected ? "text-primary" : "text-muted-foreground group-hover/card:text-foreground")
                      )}>
                        {mg.name}
                      </span>
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
