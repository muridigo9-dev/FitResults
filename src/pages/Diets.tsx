import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Beef, Wheat, ChevronRight,
  Search, Calendar,
  UtensilsCrossed, Check, ListFilter, Pizza
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiary } from "@/contexts/DiaryContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDiets } from "@/hooks/useDiets";
import { useDietPlans } from "@/hooks/useDietPlans";
import { AnimatedLoader } from "@/components/loaders";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { EmptyStateReason } from "@/components/states/EmptyStateReason";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/useI18n";

const OBJECTIVE_COLORS: Record<string, string> = {
  emagrecimento: "bg-green-500/10 text-green-600 border-green-500/20",
  hipertrofia: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  manutencao: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  detox: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function Diets() {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const { isMealLogged, getTodaySummary } = useDiary();
  const { systemDiets, isLoading: loadingRecipes, blockReason } = useDiets();
  const { dietPlans, isLoading: loadingPlans } = useDietPlans();
  const summary = getTodaySummary();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"plans" | "recipes">("plans");

  const isLoading = loadingRecipes || loadingPlans;

  // Filter Logic
  const filteredPlans = dietPlans.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecipes = systemDiets.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <AppLayout>
        <AnimatedLoader
          type="diet"
          message={t("diets.loading")}
          fullScreen
        />
      </AppLayout>
    );
  }

  if (blockReason) {
    return (
      <AppLayout>
        <EmptyStateReason reason={blockReason} />
      </AppLayout>
    );
  }

  const renderPlansList = () => (
    <div className="space-y-4">
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
          <p className="text-muted-foreground">{t("diets.noPlans")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {filteredPlans.map((plan) => (
            <Link key={plan.id} to={`/diets/${plan.id}`} className="group block">
              <div className="relative bg-card rounded-2xl overflow-hidden shadow-sm border group-hover:shadow-md transition-all duration-300">
                <div className="flex h-36">
                  <div className="w-1/3 md:w-48 relative shrink-0">
                    <img
                      src={plan.imageUrl || "/placeholder.svg"}
                      alt={plan.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded-md justify-center">
                      <Calendar className="w-3 h-3" />
                      {plan.durationDays} {t("challenges.days")}
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 font-bold uppercase tracking-wider">
                        {plan.objectiveBadge && (
                          <Badge variant="secondary" className={cn("px-1.5 py-0 h-5 text-[10px] border-0", OBJECTIVE_COLORS[plan.objectiveBadge.toLowerCase()])}>
                            {plan.objectiveBadge}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Pizza className="w-3 h-3" />
                          {plan.sessions.length} {t("diets.mealsPerDay")}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {plan.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {plan.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-dashed border-border/50 flex items-center justify-between">
                      <div className="text-[10px] font-medium text-muted-foreground">
                        {plan.visibilityType === 'global' ? t("diets.systemStandard") : t("diets.academy")}
                      </div>
                      <div className="flex items-center gap-1 text-primary text-sm font-bold">
                        {t("diets.viewPlan")}
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecipesList = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredRecipes.map((diet) => {
        const isLogged = isMealLogged(diet.id);
        return (
          <Link key={diet.id} to={`/diets/${diet.id}?type=recipe`}>
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full border-border/50">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={diet.imageUrl || "/placeholder.svg"}
                  alt={diet.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <Badge variant="secondary" className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white border-0">
                  {MEAL_TYPE_LABELS[diet.category] || diet.category}
                </Badge>

                {isLogged && (
                  <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold text-lg line-clamp-2">{diet.title}</h3>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-1.5 bg-orange-500/5 rounded-lg border border-orange-500/10">
                    <p className="font-bold text-xs text-orange-600">{diet.macros.calories}</p>
                    <p className="text-[8px] text-muted-foreground uppercase">kcal</p>
                  </div>
                  <div className="text-center p-1.5 bg-red-500/5 rounded-lg border border-red-500/10">
                    <p className="font-bold text-xs text-red-600">{diet.macros.protein}g</p>
                    <p className="text-[8px] text-muted-foreground uppercase">prot</p>
                  </div>
                  <div className="text-center p-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10">
                    <p className="font-bold text-xs text-amber-600">{diet.macros.carbs}g</p>
                    <p className="text-[8px] text-muted-foreground uppercase">carb</p>
                  </div>
                  <div className="text-center p-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <p className="font-bold text-xs text-blue-600">{diet.macros.fat}g</p>
                    <p className="text-[8px] text-muted-foreground uppercase">gord</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{diet.ingredients.length} {t("diets.ingredients")}</span>
                  <span className="flex items-center gap-1 text-primary font-bold group-hover:gap-2 transition-all">
                    {t("diets.viewRecipe")}
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  return (
    <AppLayout header={{ title: t("diets.title"), showBack: false }}>
      <div className="container max-w-4xl mx-auto pb-24 px-4">

        {/* Today's Summary Card */}
        {summary.mealsCount > 0 && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <UtensilsCrossed className="h-24 w-24 rotate-12" />
            </div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-0.5">{t("diets.todaySoFar")}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {summary.mealsCount} {t("diets.registeredMeals")}
                    </p>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <Link to="/daily-summary" className="text-xs font-bold text-primary hover:underline">
                      {t("diets.viewHistory")}
                    </Link>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="h-5 w-5 fill-current" />
                      <span className="font-black text-xl leading-none">{summary.totalCalories}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t("diets.totalKcal")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Tabs */}
        <div className="space-y-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'plans' ? t("diets.searchPlan") : t("diets.searchRecipe")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-0 h-11 rounded-xl focus-visible:ring-1"
              />
            </div>

            {/* Main Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-xl h-12">
                <TabsTrigger value="plans" className="rounded-lg gap-2 font-bold data-[state=active]:shadow-sm">
                  <ListFilter className="h-4 w-4" />
                  {t("diets.plans")}
                </TabsTrigger>
                <TabsTrigger value="recipes" className="rounded-lg gap-2 font-bold data-[state=active]:shadow-sm">
                  <Pizza className="h-4 w-4" />
                  {t("diets.recipes")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plans" className="mt-6 animate-in fade-in duration-300">
                {renderPlansList()}
              </TabsContent>

              <TabsContent value="recipes" className="mt-6 animate-in fade-in duration-300">
                {renderRecipesList()}
              </TabsContent>
            </Tabs>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
