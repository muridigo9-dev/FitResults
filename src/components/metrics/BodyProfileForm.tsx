/**
 * BodyProfileForm Component
 * 
 * Form for entering and editing user body profile data.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  User,
  Calendar,
  Ruler,
  Scale,
  Activity,
  Target,
  ChevronDown,
  Save
} from "lucide-react";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { useState } from "react";
import { toast } from "sonner";
import { sanitizeToNumber } from "@/lib/numberUtils";
import type { ActivityLevel, FitnessGoal, Gender } from "@/types/metrics";

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício" },
  { value: "light", label: "Leve", description: "Exercício 1-3x/semana" },
  { value: "moderate", label: "Moderado", description: "Exercício 3-5x/semana" },
  { value: "active", label: "Ativo", description: "Exercício 6-7x/semana" },
  { value: "very_active", label: "Muito Ativo", description: "Exercício intenso diário" },
];

const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string }[] = [
  { value: "lose_weight", label: "Emagrecer", description: "Déficit calórico" },
  { value: "maintain", label: "Manter", description: "Equilíbrio calórico" },
  { value: "gain_muscle", label: "Ganhar Massa", description: "Superávit calórico" },
];

export function BodyProfileForm() {
  const { profile, updateProfile, saveProfile } = useUserMetrics();
  const [showMeasurements, setShowMeasurements] = useState(false);

  const handleSave = async () => {
    try {
      await saveProfile();
      toast.success("Perfil atualizado!", {
        description: "Suas métricas foram recalculadas e salvas com sucesso.",
      });
    } catch (error) {
      toast.error("Erro ao salvar perfil", {
        description: "Tente novamente mais tarde.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Dados Básicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gender */}
          <div className="space-y-2">
            <Label>Sexo biológico</Label>
            <Select
              value={profile?.gender || "male"}
              onValueChange={(value: Gender) => updateProfile({ gender: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Idade</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="age"
                type="number"
                className="pl-10"
                value={profile?.age || ""}
                onChange={(e) => updateProfile({ age: Number(e.target.value) })}
                onBlur={(e) => updateProfile({ age: sanitizeToNumber(e.target.value) })}
                placeholder="25"
              />
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="height">Altura (cm)</Label>
            <div className="relative">
              <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="height"
                type="number"
                className="pl-10"
                value={profile?.height || ""}
                onChange={(e) => updateProfile({ height: Number(e.target.value) })}
                onBlur={(e) => updateProfile({ height: sanitizeToNumber(e.target.value) })}
                placeholder="170"
              />
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight">Peso atual (kg)</Label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="weight"
                type="number"
                step="0.1"
                className="pl-10"
                value={profile?.currentWeight || ""}
                onChange={(e) => updateProfile({ currentWeight: Number(e.target.value) })}
                onBlur={(e) => updateProfile({ currentWeight: sanitizeToNumber(e.target.value) })}
                placeholder="70"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity & Goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Atividade & Objetivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activity Level */}
          <div className="space-y-2">
            <Label>Nível de atividade</Label>
            <Select
              value={profile?.activityLevel || "moderate"}
              onValueChange={(value: ActivityLevel) => updateProfile({ activityLevel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex flex-col">
                      <span>{level.label}</span>
                      <span className="text-xs text-muted-foreground">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fitness Goal */}
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Select
              value={profile?.fitnessGoal || "maintain"}
              onValueChange={(value: FitnessGoal) => updateProfile({ fitnessGoal: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FITNESS_GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    <div className="flex flex-col">
                      <span>{goal.label}</span>
                      <span className="text-xs text-muted-foreground">{goal.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal Weight (optional) */}
          <div className="space-y-2">
            <Label htmlFor="goalWeight">Peso objetivo (opcional)</Label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="goalWeight"
                type="number"
                step="0.1"
                className="pl-10"
                value={profile?.goalWeight || ""}
                onChange={(e) => updateProfile({ goalWeight: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="65"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Measurements (Collapsible) */}
      <Collapsible open={showMeasurements} onOpenChange={setShowMeasurements}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Medidas Corporais
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMeasurements ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Para métricas precisas:</strong> Essas medidas permitem calcular
                  gordura corporal (método Navy) e relação cintura-quadril (WHR).
                </p>
              </div>

              {/* Waist */}
              <div className="space-y-2">
                <Label htmlFor="waist">Cintura (cm)</Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.1"
                  value={profile?.waistCircumference || ""}
                  onChange={(e) => updateProfile({ waistCircumference: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="85"
                />
                <p className="text-xs text-muted-foreground">
                  Meça na altura do umbigo, relaxado.
                </p>
              </div>

              {/* Hip */}
              <div className="space-y-2">
                <Label htmlFor="hip">Quadril (cm)</Label>
                <Input
                  id="hip"
                  type="number"
                  step="0.1"
                  value={profile?.hipCircumference || ""}
                  onChange={(e) => updateProfile({ hipCircumference: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Meça na parte mais larga dos glúteos.
                </p>
              </div>

              {/* Neck */}
              <div className="space-y-2">
                <Label htmlFor="neck">Pescoço (cm)</Label>
                <Input
                  id="neck"
                  type="number"
                  step="0.1"
                  value={profile?.neckCircumference || ""}
                  onChange={(e) => updateProfile({ neckCircumference: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="38"
                />
                <p className="text-xs text-muted-foreground">
                  Meça logo abaixo do pomo de Adão.
                </p>
              </div>

              {/* Visual guide hint */}
              <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                <span>💡</span>
                <span>Use uma fita métrica flexível. Meça de manhã, antes de comer.</span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      <Button className="w-full" onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Salvar Alterações
      </Button>
    </div>
  );
}
