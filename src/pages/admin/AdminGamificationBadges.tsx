import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as BadgeUI } from "@/components/ui/badge";
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
import { Award, Plus, Edit, Trash2, Sparkles } from "lucide-react";
import { useBadges } from "@/hooks/useBadges";
import { AnimatedLoader, EmptyState } from "@/components/loaders";
import { cn } from "@/lib/utils";

export default function AdminGamificationBadges() {
  const { data: badges, isLoading } = useBadges();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredBadges = badges?.filter((badge) => {
    const matchesSearch =
      badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || badge.badge_type === filterType;
    return matchesSearch && matchesType;
  });

  const types = Array.from(new Set(badges?.map((b) => b.badge_type) || []));

  if (isLoading) {
    return (
      <AdminLayout title="Badges">
        <AnimatedLoader type="default" message="Carregando badges..." fullScreen />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Badges">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{badges?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Ativos</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {badges?.filter((b) => b.is_active).length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Tipos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{types.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Animados</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {badges?.filter((b) => b.is_animated).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Badges</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Badge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Badge</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input placeholder="Ex: Mestre dos Treinos" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea placeholder="Descreva o badge..." />
                    </div>
                    <div>
                      <Label>Ícone (Emoji)</Label>
                      <Input placeholder="🏆" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="achievement">Conquista</SelectItem>
                            <SelectItem value="special">Especial</SelectItem>
                            <SelectItem value="seasonal">Sazonal</SelectItem>
                            <SelectItem value="exclusive">Exclusivo</SelectItem>
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
                      <Label>Cor (Hex)</Label>
                      <Input placeholder="#FFD700" />
                    </div>
                    <Button className="w-full">Criar Badge</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Buscar badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Badges Grid */}
            {filteredBadges && filteredBadges.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBadges.map((badge) => (
                  <Card key={badge.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">{badge.icon}</div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <h4 className="font-semibold mb-1">{badge.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {badge.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <BadgeUI
                          variant={
                            badge.rarity === "legendary" ? "default" : "secondary"
                          }
                          className={cn(
                            "text-xs",
                            badge.rarity === "legendary" && "bg-yellow-500"
                          )}
                        >
                          {badge.rarity}
                        </BadgeUI>
                        <BadgeUI variant="outline" className="text-xs">
                          {badge.badge_type}
                        </BadgeUI>
                        {badge.is_animated && (
                          <BadgeUI variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Animado
                          </BadgeUI>
                        )}
                        {!badge.is_active && (
                          <BadgeUI variant="destructive" className="text-xs">
                            Inativo
                          </BadgeUI>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum badge encontrado"
                description="Tente ajustar os filtros ou criar um novo badge"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
