import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock, Flame, Beef, Wheat, Droplet, Check,
  UtensilsCrossed, Calendar, ChevronRight, Info,
  ListFilter, Target
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDiary } from "@/contexts/DiaryContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDiets } from "@/hooks/useDiets";
import { useDietPlan } from "@/hooks/useDietPlans";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { StoryFilter } from "@/components/nutrition/StoryFilter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { RecipeDetailModal } from "@/components/nutrition/RecipeDetailModal";

const OBJECTIVE_COLORS: Record<string, string> = {
  emagrecimento: "bg-green-500/10 text-green-600 border-green-500/20",
  hipertrofia: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  manutencao: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  detox: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function DietDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isRecipeOnlyParam = searchParams.get("type") === "recipe";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMealLogged } = useDiary();
  const { calorieTarget } = useUserMetrics();

  // Mode Detection
  const { systemDiets, isLoading: loadingRecipes } = useDiets();
  const { data: plan, isLoading: loadingPlan } = useDietPlan(isRecipeOnlyParam ? undefined : id);

  // Selection states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeDishIndex, setActiveDishIndex] = useState<number | null>(null);

  const allDishes = useMemo(() => {
    if (!plan) return [];
    return plan.sessions.flatMap(session =>
      session.items.map(item => ({
        ...item,
        sessionName: session.name
      }))
    );
  }, [plan]);

  const isLoading = isRecipeOnlyParam ? loadingRecipes : (loadingRecipes || loadingPlan);

  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader
          type="diet"
          message={isRecipeOnlyParam ? "Carregando receita..." : "Carregando plano..."}
          fullScreen
        />
      </AppLayout>
    );
  }

  // Handle Recipe-Only entry (e.g. direct link or search result)
  if (isRecipeOnlyParam) {
    const singleRecipe = systemDiets.find(d => d.id === id);
    if (!singleRecipe) return <RecipeNotFound navigate={navigate} />;

    // Instead of a separate view, use the standard Modal experience
    return (
      <AppLayout>
        <RecipeDetailModal
          isOpen={true}
          onClose={() => navigate(-1)}
          recipes={[singleRecipe]}
          initialIndex={0}
        />
      </AppLayout>
    );
  }

  if (!plan) return <PlanNotFound navigate={navigate} />;

  // Header navigator categories
  const sessionCategories = plan.sessions.map(s => ({
    id: s.id,
    label: s.name,
    image: s.items.find(i => i.isMain)?.dishImage || s.items[0]?.dishImage
  }));

  const activeSessions = selectedSessionId
    ? [plan.sessions.find(s => s.id === selectedSessionId)!].filter(Boolean)
    : plan.sessions;

  return (
    <AppLayout header={{ title: plan.title, showBack: true }}>
      <div className="container max-w-2xl mx-auto pb-24 px-4">

        {/* Plan Header Card */}
        <div className="relative rounded-[2.5rem] overflow-hidden mb-8 aspect-[16/10] shadow-2xl border border-border/40 group">
          <img
            src={plan.imageUrl || "/placeholder.svg"}
            alt={plan.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-3">
              {plan.objectiveBadge && (
                <Badge className={cn("px-3 py-1 border-0 font-black uppercase text-[10px] tracking-widest", OBJECTIVE_COLORS[plan.objectiveBadge.toLowerCase()] || "bg-primary text-primary-foreground")}>
                  {plan.objectiveBadge}
                </Badge>
              )}
              <Badge variant="outline" className="bg-black/40 backdrop-blur-md border-white/20 text-white gap-1.5 px-3 py-1 font-bold">
                <Calendar className="w-3.5 h-3.5" />
                {plan.durationDays} dias
              </Badge>
            </div>
            <h1 className="text-3xl font-black text-white leading-tight drop-shadow-lg">{plan.title}</h1>
          </div>
        </div>

        {/* Session Filter */}
        <div className="mb-4 -mx-4 overflow-hidden">
          <StoryFilter
            categories={sessionCategories}
            selectedCategory={selectedSessionId}
            onSelectCategory={(id) => setSelectedSessionId(id)}
          />
        </div>

        {/* Sessions & Dishes List */}
        <div className="space-y-10">
          {activeSessions.map((session) => (
            <section key={session.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                  {session.name}
                </h2>
                {session.timeSuggestion && (
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-primary" />
                    {session.timeSuggestion.substring(0, 5)}
                  </span>
                )}
              </div>

              <div className="grid gap-4">
                {session.items.map((item) => {
                  const isLogged = isMealLogged(item.dishId);
                  const globalIdx = allDishes.findIndex(d => d.id === item.id);

                  return (
                    <Card key={item.id} className={cn(
                      "group overflow-hidden border-border/50 hover:border-primary/40 transition-all duration-300 rounded-3xl",
                      isLogged && "bg-primary/[0.03] border-primary/20"
                    )} onClick={() => setActiveDishIndex(globalIdx)}>
                      <div className="flex flex-col sm:flex-row cursor-pointer">
                        <div className="w-full sm:w-44 aspect-video sm:aspect-square relative overflow-hidden shrink-0">
                          <img
                            src={item.dishImage || "/placeholder.svg"}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={item.dishTitle}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {isLogged && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="bg-white rounded-full p-2.5 shadow-2xl scale-110">
                                <Check className="h-5 w-5 text-primary stroke-[3px]" />
                              </div>
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex gap-1.5">
                            {item.isMain ? (
                              <Badge className="bg-primary/90 text-white border-0 text-[10px] font-black uppercase tracking-wider h-6 shadow-lg">PADRÃO</Badge>
                            ) : (
                              <Badge className="bg-amber-500/90 text-white border-0 text-[10px] font-black uppercase tracking-wider h-6 shadow-lg">OPCIONAL</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <h3 className="font-black text-xl leading-tight group-hover:text-primary transition-colors">
                                {item.dishTitle}
                              </h3>
                              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                <ChevronRight className="h-5 w-5" />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-4">
                              <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                <Flame className="w-3.5 h-3.5 fill-current" />
                                <span className="font-black text-sm leading-none">{item.macros.calories}</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">Kcal</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-1">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-muted-foreground/60 uppercase leading-none mb-0.5">Prot</span>
                                  <span className="font-black text-sm leading-none">{item.macros.protein}g</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-muted-foreground/60 uppercase leading-none mb-0.5">Carb</span>
                                  <span className="font-black text-sm leading-none">{item.macros.carbs}g</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-muted-foreground/60 uppercase leading-none mb-0.5">Gord</span>
                                  <span className="font-black text-sm leading-none">{item.macros.fat}g</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver detalhes e registrar <ChevronRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Global Smart Recommendation */}
        {calorieTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-6 rounded-[2rem] bg-primary/[0.03] border border-primary/10 flex items-start gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wider">Metas Inteligentes</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
                Este plano está ajustado para sua meta de <strong className="text-foreground">{calorieTarget.target.toFixed(0)} kcal</strong>. Você pode alterar as porções manualmente ao registrar.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Reusable Platform Modal */}
      <RecipeDetailModal
        isOpen={activeDishIndex !== null}
        onClose={() => setActiveDishIndex(null)}
        recipes={allDishes.map(d => ({
          ...d.dish,
          id: d.dishId,
          title: d.dishTitle,
          imageUrl: d.dishImage,
          category: d.sessionName,
          // Respect plan portion: multiplier used for initial state
          multiplier: d.portionModifier || 1.0
        }))}
        initialIndex={activeDishIndex ?? 0}
      />
    </AppLayout>
  );
}

function RecipeNotFound({ navigate }: any) {
  return (
    <AppLayout>
      <EmptyState
        type="diet"
        title="Receita não encontrada"
        description="Esta receita não existe ou foi removida."
        action={{ label: "Voltar para receitas", onClick: () => navigate("/diets") }}
      />
    </AppLayout>
  );
}

function PlanNotFound({ navigate }: any) {
  return (
    <AppLayout>
      <EmptyState
        type="diet"
        title="Plano não encontrado"
        description="Este plano alimentar não existe ou foi removido."
        action={{ label: "Ver todos os planos", onClick: () => navigate("/diets") }}
      />
    </AppLayout>
  );
}
