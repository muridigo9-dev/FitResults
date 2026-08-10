import * as React from "react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStudentNutrition } from "@/hooks/useStudentNutrition";
import { useStudentDietPlans } from "@/hooks/useStudentDietPlans"; // New Hook
import { StudentDishForm } from "@/components/nutrition/StudentDishForm";
import { StudentDietPlanCard } from "@/components/nutrition/StudentDietPlanCard";
import { RecipeGallery } from "@/components/nutrition/RecipeGallery";
import { StoryFilter } from "@/components/nutrition/StoryFilter";

import { toast } from "sonner";
import {
  Plus,
  Utensils,
  Edit2,
  Trash2,
  User,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Loader2,
  CalendarDays,
  Search
} from "lucide-react";
import { useSmartPortions } from "@/hooks/useSmartPortions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { Diet } from "@/types/content";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function MyDiets() {
  const { user } = useAuth();
  const { dishes, isLoadingDishes } = useStudentNutrition();
  const { dietPlans, isLoading: isLoadingPlans, downloadPDF } = useStudentDietPlans();
  const { isEnabled } = useFeatureFlags();
  const canCreate = isEnabled("user_custom_diets");

  const [showForm, setShowForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Diet | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { deleteDish, isDeleting } = useStudentNutrition();


  const handleEdit = (dish: Diet) => {
    setEditingDish(dish);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDish(deleteId);
      setDeleteId(null);
    }
  };

  // Categories Calculation
  const categories = React.useMemo(() => {
    if (!dishes) return [];
    const dynamicCats = Array.from(new Set(dishes.map(d => d.category).filter(Boolean)));
    return dynamicCats.sort().map(cat => ({ id: cat, label: cat }));
  }, [dishes]);

  // Filter Logic
  const filteredDishes = React.useMemo(() => {
    return dishes.filter(d => {
      const matchesCategory = selectedCategory ? d.category === selectedCategory : true;
      const lowerQ = searchQuery.toLowerCase();
      const matchesTitle = d.title.toLowerCase().includes(lowerQ);
      const matchesIngredients = (d.ingredients || []).some(
        ing => ing.name?.toLowerCase().includes(lowerQ)
      );
      return matchesCategory && (matchesTitle || matchesIngredients);
    });
  }, [dishes, searchQuery, selectedCategory]);

  // Separation of dishes
  const systemDiets = filteredDishes.filter(d => d.ownerType !== 'student');
  const userDiets = filteredDishes.filter(d => d.ownerType === 'student' && d.ownerId === user?.id);


  // Default tab logic: If has plans, show plans. Else show suggestions.
  const [activeTab, setActiveTab] = useState<"plans" | "suggestions" | "mine">("plans");


  if (showForm) {
    return (
      <AppLayout>
        <StudentDishForm
          initialData={editingDish}
          onSuccess={() => {
            setShowForm(false);
            setEditingDish(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingDish(null);
          }}
        />
      </AppLayout>
    );
  }

  const isLoading = isLoadingDishes || isLoadingPlans;

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dietas & Receitas</h1>
            <p className="text-muted-foreground">
              Seus planos alimentares e receitas personalizadas
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowForm(true)} className="gap-2 hidden md:flex">
              <Plus className="h-4 w-4" />
              Criar Prato
            </Button>
          )}
        </div>

        {/* Mobile Floating Action Button */}
        {canCreate && !showForm && (
          <Button
            className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Search Bar & Categories Global */}
        {!showForm && activeTab !== "plans" && (
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nome ou ingrediente..."
                className="pl-9 bg-muted/30 border-border/50 h-12 rounded-xl focus:bg-background transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <StoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}


        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/20 p-1 rounded-xl h-12">
            <TabsTrigger value="plans" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CalendarDays className="h-4 w-4" />
              Planos ({dietPlans.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Utensils className="h-4 w-4" />
              Receitas ({systemDiets.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              Meus Pratos ({userDiets.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ... existing plans content ... */}
              <TabsContent value="plans" className="mt-6 focus-visible:outline-none">
                {dietPlans.length === 0 ? (
                  <EmptyPlansState />
                ) : (
                  <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                    {dietPlans.map(plan => (
                      <StudentDietPlanCard
                        key={plan.id}
                        plan={plan}
                        onDownload={downloadPDF}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* System Dishes (Suggestions) */}
              <TabsContent value="suggestions" className="mt-6 focus-visible:outline-none">
                <RecipeGallery dishes={systemDiets} hideSearch hideCategories />
              </TabsContent>



              {/* User Dishes */}
              <TabsContent value="mine" className="mt-6">
                {userDiets.length === 0 ? (
                  <EmptyUserDietsState
                    canCreate={canCreate}
                    onCreate={() => setShowForm(true)}
                  />
                ) : (
                  <RecipeGallery
                    dishes={userDiets}
                    hideSearch
                    hideCategories
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                )}
              </TabsContent>

            </>
          )}
        </Tabs>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Prato?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O prato será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>

  );
}

// Empty state for Plans
function EmptyPlansState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          Nenhum plano alimentar
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Você ainda não possui um plano alimentar atribuído. Converse com seu treinador ou nutricionista.
        </p>
      </CardContent>
    </Card>
  );
}

// Empty state for system diets
function EmptyDietsState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Utensils className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          Nenhuma sugestão disponível
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Seu nutricionista ou academia ainda não adicionaram pratos.
        </p>
      </CardContent>
    </Card>
  );
}

// Empty state for user diets
function EmptyUserDietsState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Utensils className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          Seus Pratos Personalizados
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {canCreate
            ? "Crie pratos que se encaixam na sua rotina e preferências."
            : "A criação de pratos personalizados não está disponível no momento."}
        </p>
        {canCreate && (
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeiro Prato
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

