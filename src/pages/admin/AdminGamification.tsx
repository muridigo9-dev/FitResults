import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeToNumber } from "@/lib/numberUtils";
import { 
  Trophy, 
  Star, 
  Flame, 
  Crown, 
  Award,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/states";
import { toast } from "sonner";

interface LevelConfig {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  xpReward: number;
  isActive: boolean;
}

// TODO: Load from database when backend is connected
// Initial state is empty - levels and achievements should be loaded from Supabase
const initialLevels: LevelConfig[] = [];

const initialAchievements: Achievement[] = [];

const xpConfig = {
  checkInComplete: 0,
  habitComplete: 0,
  dailyBonus: 0,
  streakBonus: 0,
};

const iconOptions = [
  { value: "Trophy", icon: Trophy },
  { value: "Star", icon: Star },
  { value: "Flame", icon: Flame },
  { value: "Crown", icon: Crown },
  { value: "Award", icon: Award },
  { value: "Zap", icon: Zap },
];

const getIconComponent = (iconName: string) => {
  return iconOptions.find(o => o.value === iconName)?.icon || Trophy;
};

export default function AdminGamification() {
  const [levels, setLevels] = useState(initialLevels);
  const [achievements, setAchievements] = useState(initialAchievements);
  const [xpSettings, setXpSettings] = useState(xpConfig);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Trophy",
    color: "gold",
    requirement: "",
    xpReward: 100,
  });

  const handleCreateAchievement = () => {
    setEditingAchievement(null);
    setFormData({ name: "", description: "", icon: "Trophy", color: "gold", requirement: "", xpReward: 100 });
    setIsDialogOpen(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      color: achievement.color,
      requirement: achievement.requirement,
      xpReward: achievement.xpReward,
    });
    setIsDialogOpen(true);
  };

  const handleSaveAchievement = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingAchievement) {
      setAchievements(prev => prev.map(a => 
        a.id === editingAchievement.id ? { ...a, ...formData } : a
      ));
      toast.success("Conquista atualizada!");
    } else {
      const newAchievement: Achievement = {
        id: Date.now().toString(),
        ...formData,
        isActive: true,
      };
      setAchievements(prev => [...prev, newAchievement]);
      toast.success("Conquista criada!");
    }

    setIsDialogOpen(false);
  };

  const handleToggleAchievement = (id: string) => {
    setAchievements(prev => prev.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ));
  };

  const handleDeleteAchievement = (id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
    toast.success("Conquista removida!");
  };

  const handleSaveXPSettings = () => {
    toast.success("Configurações de XP salvas!");
  };

  return (
    <AdminLayout title="Gamificação">
      <div className="space-y-6">
        <Tabs defaultValue="levels">
          <TabsList>
            <TabsTrigger value="levels">Níveis</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="xp">Pontos XP</TabsTrigger>
          </TabsList>

          {/* Levels Tab */}
          <TabsContent value="levels" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Níveis</CardTitle>
                <CardDescription>
                  Defina a progressão de níveis e faixas de XP
                </CardDescription>
              </CardHeader>
              <CardContent>
                {levels.length === 0 ? (
                  <EmptyState
                    type="achievements"
                    title="Nenhum nível configurado"
                    description="Configure os níveis de gamificação"
                    action={{ 
                      label: "Adicionar nível", 
                      onClick: () => setLevels([
                        { level: 1, name: "Bronze", minXP: 0, maxXP: 500, color: "bronze" }
                      ])
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {levels.map((level) => (
                      <div 
                        key={level.level}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border"
                      >
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-level-${level.color}/20`}>
                          <span className={`text-lg font-bold text-level-${level.color}`}>
                            {level.level}
                          </span>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome</Label>
                            <Input
                              value={level.name}
                              onChange={(e) => setLevels(prev => prev.map(l => 
                                l.level === level.level ? { ...l, name: e.target.value } : l
                              ))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">XP Mínimo</Label>
                            <Input
                              type="number"
                              value={level.minXP}
                              onChange={(e) => setLevels(prev => prev.map(l => 
                                l.level === level.level ? { ...l, minXP: parseInt(e.target.value) || 0 } : l
                              ))}
                              onBlur={(e) => setLevels(prev => prev.map(l => 
                                l.level === level.level ? { ...l, minXP: sanitizeToNumber(e.target.value) || 0 } : l
                              ))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">XP Máximo</Label>
                            <Input
                              type="number"
                              value={level.maxXP}
                              onChange={(e) => setLevels(prev => prev.map(l => 
                                l.level === level.level ? { ...l, maxXP: parseInt(e.target.value) || 0 } : l
                              ))}
                              onBlur={(e) => setLevels(prev => prev.map(l => 
                                l.level === level.level ? { ...l, maxXP: sanitizeToNumber(e.target.value) || 0 } : l
                              ))}
                            />
                          </div>
                        </div>

                        <Badge variant={level.color as any}>
                          {level.color}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                
                {levels.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => toast.success("Níveis salvos!")}>
                      Salvar Níveis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Conquistas que os usuários podem desbloquear
              </p>
              <Button onClick={handleCreateAchievement}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conquista
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conquistas</CardTitle>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <EmptyState
                    type="achievements"
                    title="Nenhuma conquista"
                    description="Crie conquistas para motivar os usuários"
                    action={{ label: "Criar conquista", onClick: handleCreateAchievement }}
                  />
                ) : (
                  <div className="space-y-3">
                    {achievements.map((achievement) => {
                      const IconComponent = getIconComponent(achievement.icon);
                      return (
                        <div 
                          key={achievement.id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50"
                        >
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-level-${achievement.color}/20`}>
                            <IconComponent className={`h-6 w-6 text-level-${achievement.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{achievement.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="soft" size="sm">
                                +{achievement.xpReward} XP
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {achievement.requirement}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <Switch
                              checked={achievement.isActive}
                              onCheckedChange={() => handleToggleAchievement(achievement.id)}
                            />

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAchievement(achievement)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAchievement(achievement.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* XP Settings Tab */}
          <TabsContent value="xp" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Pontos XP</CardTitle>
                <CardDescription>
                  Defina quantos pontos cada ação concede
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Check-in Completo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={xpSettings.checkInComplete}
                        onChange={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          checkInComplete: parseInt(e.target.value) || 0 
                        }))}
                        onBlur={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          checkInComplete: sanitizeToNumber(e.target.value) || 0 
                        }))}
                      />
                      <span className="text-sm text-muted-foreground">XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pontos por completar 100% do check-in diário
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Por Hábito Completo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={xpSettings.habitComplete}
                        onChange={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          habitComplete: parseInt(e.target.value) || 0 
                        }))}
                        onBlur={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          habitComplete: sanitizeToNumber(e.target.value) || 0 
                        }))}
                      />
                      <span className="text-sm text-muted-foreground">XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pontos por cada meta de hábito atingida
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Bônus Diário</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={xpSettings.dailyBonus}
                        onChange={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          dailyBonus: parseInt(e.target.value) || 0 
                        }))}
                        onBlur={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          dailyBonus: sanitizeToNumber(e.target.value) || 0 
                        }))}
                      />
                      <span className="text-sm text-muted-foreground">XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bônus por fazer login e completar ações
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Bônus por Sequência</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={xpSettings.streakBonus}
                        onChange={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          streakBonus: parseInt(e.target.value) || 0 
                        }))}
                        onBlur={(e) => setXpSettings(prev => ({ 
                          ...prev, 
                          streakBonus: sanitizeToNumber(e.target.value) || 0 
                        }))}
                      />
                      <span className="text-sm text-muted-foreground">XP/dia</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pontos extras por cada dia de sequência
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveXPSettings}>
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Achievement Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAchievement ? "Editar" : "Nova"} Conquista
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes da conquista
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Primeira Semana"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Complete 7 dias seguidos"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Requisito</Label>
                <Input
                  value={formData.requirement}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                  placeholder="Ex: 7 dias de sequência"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: opt.value }))}
                          className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
                            formData.icon === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recompensa XP</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.xpReward}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      xpReward: parseInt(e.target.value) || 0
                    }))}
                    onBlur={(e) => setFormData(prev => ({
                      ...prev,
                      xpReward: sanitizeToNumber(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAchievement}>
                {editingAchievement ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
