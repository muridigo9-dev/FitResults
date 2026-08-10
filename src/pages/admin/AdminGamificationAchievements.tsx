import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Plus, Edit, Trash2, Award } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { cn } from "@/lib/utils";

export default function AdminGamificationAchievements() {
  const { data: achievements, isLoading } = useAchievements();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredAchievements = achievements?.filter((achievement) => {
    const matchesSearch =
      achievement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || achievement.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(achievements?.map((a) => a.category) || [])
  );

  if (isLoading) {
    return (
      <AdminLayout title="Conquistas">
        <AnimatedLoader type="default" message="Carregando conquistas..." fullScreen />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Conquistas">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{achievements?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Ativas</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {achievements?.filter((a) => a.is_active).length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Categorias</span>
              </div>
              <p className="text-2xl font-bold mt-1">{categories.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Lendárias</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {achievements?.filter((a) => a.rarity === "legendary").length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conquistas</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conquista
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Conquista</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input placeholder="Ex: Primeira Conquista" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea placeholder="Descreva a conquista..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Categoria</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="workout">Treino</SelectItem>
                            <SelectItem value="health">Saúde</SelectItem>
                            <SelectItem value="challenge">Desafio</SelectItem>
                            <SelectItem value="engagement">Engajamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Raridade</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Comum</SelectItem>
                            <SelectItem value="uncommon">Incomum</SelectItem>
                            <SelectItem value="rare">Raro</SelectItem>
                            <SelectItem value="epic">Épico</SelectItem>
                            <SelectItem value="legendary">Lendário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>XP Recompensa</Label>
                      <Input type="number" placeholder="100" />
                    </div>
                    <Button className="w-full">Criar Conquista</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Buscar conquistas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Achievements List */}
            {filteredAchievements && filteredAchievements.length > 0 ? (
              <div className="space-y-2">
                {filteredAchievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{achievement.icon || "🏆"}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <Badge
                                variant={
                                  achievement.rarity === "legendary"
                                    ? "default"
                                    : "secondary"
                                }
                                className={cn(
                                  achievement.rarity === "legendary" && "bg-yellow-500"
                                )}
                              >
                                {achievement.rarity}
                              </Badge>
                              {!achievement.is_active && (
                                <Badge variant="outline">Inativa</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Categoria: {achievement.category}</span>
                              <span>XP: {achievement.xp_reward}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma conquista encontrada"
                description="Tente ajustar os filtros ou criar uma nova conquista"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
