import { useState, useMemo } from "react";
import { useStudentNutrition } from "@/hooks/useStudentNutrition";
import { StoryFilter } from "./StoryFilter";
import { RecipeCard } from "./RecipeCard";
import { RecipeDetailModal } from "./RecipeDetailModal";
import { useAuth } from "@/contexts/AuthContext";

import { AnimatedLoader } from "@/components/loaders";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface RecipeGalleryProps {
    dishes?: any[];
    hideSearch?: boolean;
    hideCategories?: boolean;
    onEdit?: (dish: any) => void;
    onDelete?: (id: string) => void;
}


export function RecipeGallery({ dishes: propDishes, hideSearch = false, hideCategories = false, onEdit, onDelete }: RecipeGalleryProps) {

    const { user } = useAuth();
    const { dishes: hookDishes, isLoadingDishes } = useStudentNutrition();

    const dishes = propDishes || hookDishes;

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null); // For Modal

    // 1. Extract Categories dynamically - Clean synchronization
    const categories = useMemo(() => {
        if (!dishes) return [];

        // Extract all unique categories present in the data
        const dynamicCats = Array.from(new Set(dishes.map(d => d.category).filter(Boolean)));

        // Sort alphabetically to maintain order
        const sortedCats = dynamicCats.sort((a, b) => a.localeCompare(b));

        return sortedCats.map(cat => ({
            id: cat,
            label: cat,
        }));
    }, [dishes]);

    // 2. Filter Logic
    const filteredRecipes = useMemo(() => {
        if (!dishes) return [];
        return dishes.filter(d => {
            const matchesCategory = selectedCategory ? d.category === selectedCategory : true;
            const lowerQuery = searchQuery.toLowerCase();
            const matchesTitle = d.title.toLowerCase().includes(lowerQuery);
            const matchesIngredients = (d.ingredients || []).some(
                ing => ing.name?.toLowerCase().includes(lowerQuery)
            );

            return matchesCategory && (matchesTitle || matchesIngredients);
        });
    }, [dishes, selectedCategory, searchQuery]);

    if (isLoadingDishes) {
        return <AnimatedLoader type="diet" message="Carregando receitas..." />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Filters */}
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 border-b border-border/40 -mx-4 px-4 pt-2 md:mx-0 md:px-0 md:rounded-xl">
                {!hideSearch && (
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar receitas..."
                            className="pl-9 bg-muted/50 border-none shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
                {!hideCategories && (
                    <StoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                )}
            </div>


            {/* Grid - Change to 2 cols on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
                {filteredRecipes.length > 0 ? (
                    filteredRecipes.map((recipe, index) => (
                        <RecipeCard
                            key={recipe.id}
                            title={recipe.title}
                            image={recipe.imageUrl}
                            imagePath={recipe.imagePath}
                            category={recipe.category || "Geral"}
                            calories={recipe.macros?.calories || 0}
                            protein={Number(recipe.macros?.protein) || 0}
                            carbs={Number(recipe.macros?.carbs) || 0}
                            fat={Number(recipe.macros?.fat) || 0}
                            isOwner={recipe.ownerType === 'student' && recipe.ownerId === user?.id}
                            onEdit={() => onEdit?.(recipe)}
                            onDelete={() => onDelete?.(recipe.id)}
                            onClick={() => setSelectedRecipeIndex(index)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-muted-foreground">
                        <p>Nenhuma receita encontrada.</p>
                        <button
                            onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                            className="text-primary hover:underline mt-2 text-sm"
                        >
                            Limpar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal - Improved for Swiping */}
            <RecipeDetailModal
                isOpen={selectedRecipeIndex !== null}
                onClose={() => setSelectedRecipeIndex(null)}
                recipes={filteredRecipes}
                initialIndex={selectedRecipeIndex ?? 0}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
}
