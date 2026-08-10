import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import { StudentChatTab } from "@/components/trainer/StudentChatTab";
import { useMyTrainerConversation, useTrainerChatEnabled } from "@/hooks/useTrainerChat";
import {
  Utensils,
  Dumbbell,
  Trophy,
  Target,
  User,
  UsersRound,
  ChevronRight,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Extended types for content with assignment fields
interface ContentWithAssignment {
  id: string;
  created_at: string;
  assigned_to_type?: string | null;
  assigned_to_id?: string | null;
  title?: string;
  name?: string;
  description?: string | null;
  category?: string;
  total_days?: number;
}

export default function MyTrainer() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "overview";
  const { isPersonalTrainerModeEnabled, userGroupIds, isLoading: isModeLoading } = usePersonalTrainerMode();
  const { conversation } = useMyTrainerConversation();
  const { isChatEnabled } = useTrainerChatEnabled();
  const unreadMessages = conversation?.unread_count || 0;

  // Fetch personalized diets
  const { data: diets = [], isLoading: isDietsLoading } = useQuery({
    queryKey: ["my-trainer-diets", user?.id, userGroupIds],
    queryFn: async () => {
      if (!user?.id) return [];

      // Build OR conditions for assignment
      let orCondition = `assigned_to_type.eq.global,and(assigned_to_type.eq.user,assigned_to_id.eq.${user.id})`;
      if (userGroupIds.length > 0) {
        orCondition += `,and(assigned_to_type.eq.group,assigned_to_id.in.(${userGroupIds.join(",")}))`;
      }

      const { data, error } = await (supabase as any)
        .from("dishes")
        .select("id, title, description, category, created_at, assigned_to_type, assigned_to_id")
        .eq("is_active", true)
        .or(orCondition)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContentWithAssignment[];
    },
    enabled: !!user?.id && isPersonalTrainerModeEnabled,
  });

  // Fetch personalized workouts
  const { data: workouts = [], isLoading: isWorkoutsLoading } = useQuery({
    queryKey: ["my-trainer-workouts", user?.id, userGroupIds],
    queryFn: async () => {
      if (!user?.id) return [];

      let orCondition = `assigned_to_type.eq.global,and(assigned_to_type.eq.user,assigned_to_id.eq.${user.id})`;
      if (userGroupIds.length > 0) {
        orCondition += `,and(assigned_to_type.eq.group,assigned_to_id.in.(${userGroupIds.join(",")}))`;
      }

      const { data, error } = await (supabase as any)
        .from("workouts")
        .select("id, title, description, category, created_at, assigned_to_type, assigned_to_id")
        .eq("is_active", true)
        .or(orCondition)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContentWithAssignment[];
    },
    enabled: !!user?.id && isPersonalTrainerModeEnabled,
  });

  // Fetch personalized challenges
  const { data: challenges = [], isLoading: isChallengesLoading } = useQuery({
    queryKey: ["my-trainer-challenges", user?.id, userGroupIds],
    queryFn: async () => {
      if (!user?.id) return [];

      let orCondition = `assigned_to_type.eq.global,and(assigned_to_type.eq.user,assigned_to_id.eq.${user.id})`;
      if (userGroupIds.length > 0) {
        orCondition += `,and(assigned_to_type.eq.group,assigned_to_id.in.(${userGroupIds.join(",")}))`;
      }

      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("id, name, description, total_days, created_at, assigned_to_type, assigned_to_id")
        .eq("is_active", true)
        .or(orCondition)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContentWithAssignment[];
    },
    enabled: !!user?.id && isPersonalTrainerModeEnabled,
  });

  // Get personalized content (non-global)
  const personalizedDiets = diets.filter(d => d.assigned_to_type && d.assigned_to_type !== "global");
  const personalizedWorkouts = workouts.filter(w => w.assigned_to_type && w.assigned_to_type !== "global");
  const personalizedChallenges = challenges.filter(c => c.assigned_to_type && c.assigned_to_type !== "global");

  const hasPersonalizedContent =
    personalizedDiets.length > 0 ||
    personalizedWorkouts.length > 0 ||
    personalizedChallenges.length > 0;

  const isLoading = isModeLoading || isDietsLoading || isWorkoutsLoading || isChallengesLoading;

  if (!isPersonalTrainerModeEnabled) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6">
          <EmptyState
            type="documents"
            title="Modo Personal Trainer não ativo"
            description="Este recurso ainda não está habilitado para sua conta."
          />
        </div>
      </AppLayout>
    );
  }

  const getAssignmentBadge = (type: string | null | undefined) => {
    if (type === "user") {
      return (
        <Badge variant="default" className="gap-1 bg-primary/10 text-primary border-primary/20">
          <User className="h-3 w-3" />
          Exclusivo para você
        </Badge>
      );
    }
    if (type === "group") {
      return (
        <Badge variant="secondary" className="gap-1">
          <UsersRound className="h-3 w-3" />
          Sua turma
        </Badge>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Meu Treinador
          </h1>
          <p className="text-muted-foreground">
            Conteúdo personalizado criado especialmente para você
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !hasPersonalizedContent ? (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <EmptyState
                type="documents"
                title="Nenhum conteúdo personalizado"
                description="Seu treinador ainda não atribuiu conteúdos exclusivos para você. Enquanto isso, explore os conteúdos gerais do app!"
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              {isChatEnabled && (
                <TabsTrigger value="messages" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagens
                  {unreadMessages > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1">
                      {unreadMessages}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="diets" className="gap-2">
                <Utensils className="h-4 w-4" />
                Dietas
                {personalizedDiets.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{personalizedDiets.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="workouts" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                Treinos
                {personalizedWorkouts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{personalizedWorkouts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-2">
                <Trophy className="h-4 w-4" />
                Desafios
                {personalizedChallenges.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{personalizedChallenges.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Personalized Content Summary */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Seu Plano Personalizado
                  </CardTitle>
                  <CardDescription>
                    Conteúdo criado pelo seu treinador exclusivamente para você
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{personalizedDiets.length}</div>
                      <div className="text-sm text-muted-foreground">Dietas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{personalizedWorkouts.length}</div>
                      <div className="text-sm text-muted-foreground">Treinos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{personalizedChallenges.length}</div>
                      <div className="text-sm text-muted-foreground">Desafios</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Personalized Content */}
              <div className="space-y-4">
                <h3 className="font-semibold">Conteúdo Recente</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {[...personalizedDiets, ...personalizedWorkouts, ...personalizedChallenges]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 10)
                      .map((item) => {
                        const isDiet = personalizedDiets.some(d => d.id === item.id);
                        const isWorkout = personalizedWorkouts.some(w => w.id === item.id);
                        const isChallenge = personalizedChallenges.some(c => c.id === item.id);

                        let Icon = Target;
                        let href = "#";
                        let title = item.title || item.name || "";

                        if (isDiet) {
                          Icon = Utensils;
                          href = `/diets/${item.id}`;
                        } else if (isWorkout) {
                          Icon = Dumbbell;
                          href = `/workouts/${item.id}`;
                        } else if (isChallenge) {
                          Icon = Trophy;
                          href = `/challenges/${item.id}`;
                        }

                        return (
                          <Link key={item.id} to={href}>
                            <Card className="hover:bg-muted/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Icon className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium truncate">{title}</p>
                                      {getAssignmentBadge(item.assigned_to_type)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Messages Tab */}
            {isChatEnabled && (
              <TabsContent value="messages">
                <StudentChatTab />
              </TabsContent>
            )}

            {/* Diets Tab */}
            <TabsContent value="diets" className="space-y-4">
              {personalizedDiets.length === 0 ? (
                <EmptyState
                  type="documents"
                  title="Nenhuma dieta personalizada"
                  description="Seu treinador ainda não atribuiu dietas exclusivas."
                />
              ) : (
                <div className="space-y-3">
                  {personalizedDiets.map((diet) => (
                    <Link key={diet.id} to={`/diets/${diet.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-habit-meals/10 flex items-center justify-center">
                              <Utensils className="h-6 w-6 text-habit-meals" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{diet.title}</p>
                                {getAssignmentBadge(diet.assigned_to_type)}
                              </div>
                              {diet.description && (
                                <p className="text-sm text-muted-foreground truncate">{diet.description}</p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Workouts Tab */}
            <TabsContent value="workouts" className="space-y-4">
              {personalizedWorkouts.length === 0 ? (
                <EmptyState
                  type="documents"
                  title="Nenhum treino personalizado"
                  description="Seu treinador ainda não atribuiu treinos exclusivos."
                />
              ) : (
                <div className="space-y-3">
                  {personalizedWorkouts.map((workout) => (
                    <Link key={workout.id} to={`/workouts/${workout.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-habit-workout/10 flex items-center justify-center">
                              <Dumbbell className="h-6 w-6 text-habit-workout" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{workout.title}</p>
                                {getAssignmentBadge(workout.assigned_to_type)}
                              </div>
                              {workout.description && (
                                <p className="text-sm text-muted-foreground truncate">{workout.description}</p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Challenges Tab */}
            <TabsContent value="challenges" className="space-y-4">
              {personalizedChallenges.length === 0 ? (
                <EmptyState
                  type="documents"
                  title="Nenhum desafio personalizado"
                  description="Seu treinador ainda não atribuiu desafios exclusivos."
                />
              ) : (
                <div className="space-y-3">
                  {personalizedChallenges.map((challenge) => (
                    <Link key={challenge.id} to={`/challenges/${challenge.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-level-gold/10 flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-level-gold" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{challenge.name}</p>
                                {getAssignmentBadge(challenge.assigned_to_type)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {challenge.total_days} dias
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
