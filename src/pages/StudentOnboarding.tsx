import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  Activity,
  Heart,
  Target,
  ChevronRight,
  ChevronLeft,
  Check,
  Dumbbell,
  Utensils,
  Moon,
  Briefcase,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserMetrics } from "@/contexts/UserMetricsContext";

interface OnboardingData {
  // Personal
  full_name: string;
  phone: string;
  birth_date: string;
  gender: string;
  occupation: string;

  // Physical
  height_cm: number | null;
  weight_kg: number | null;

  // Lifestyle
  activity_level: string;
  sleep_hours: number | null;
  sleep_quality: string;
  stress_level: string;
  water_intake_liters: number | null;

  // Fitness
  experience_level: string;
  workout_frequency: number | null;
  preferred_workout_time: string;
  available_equipment: string[];
  workout_limitations: string;

  // Health
  has_health_conditions: boolean;
  health_conditions: string;
  has_injuries: boolean;
  injuries: string;
  medications: string;
  allergies: string;

  // Goals
  primary_goal: string;
  secondary_goals: string[];
  target_weight: number | null;
  motivation: string;
  additional_notes: string;
}

const STEPS = [
  { id: "personal", icon: User, title: "Dados Pessoais" },
  { id: "physical", icon: Activity, title: "Medidas" },
  { id: "lifestyle", icon: Moon, title: "Estilo de Vida" },
  { id: "fitness", icon: Dumbbell, title: "Fitness" },
  { id: "health", icon: Heart, title: "Saúde" },
  { id: "goals", icon: Target, title: "Objetivos" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário", description: "Pouco ou nenhum exercício" },
  { value: "lightly_active", label: "Levemente Ativo", description: "1-2 dias/semana" },
  { value: "moderately_active", label: "Moderadamente Ativo", description: "3-4 dias/semana" },
  { value: "very_active", label: "Muito Ativo", description: "5-6 dias/semana" },
  { value: "extremely_active", label: "Extremamente Ativo", description: "Treinos intensos diários" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Iniciante", description: "Menos de 6 meses de treino" },
  { value: "intermediate", label: "Intermediário", description: "6 meses a 2 anos" },
  { value: "advanced", label: "Avançado", description: "Mais de 2 anos" },
];

const PRIMARY_GOALS = [
  { value: "lose_weight", label: "Perder Peso", icon: "🔥" },
  { value: "gain_muscle", label: "Ganhar Massa Muscular", icon: "💪" },
  { value: "improve_fitness", label: "Melhorar Condicionamento", icon: "🏃" },
  { value: "maintain", label: "Manter Forma", icon: "⚖️" },
  { value: "improve_health", label: "Melhorar Saúde", icon: "❤️" },
  { value: "sport_performance", label: "Performance Esportiva", icon: "🏆" },
];

const SECONDARY_GOALS = [
  "Aumentar força",
  "Melhorar flexibilidade",
  "Reduzir estresse",
  "Melhorar sono",
  "Aumentar energia",
  "Melhorar postura",
  "Ganhar definição",
  "Preparação para evento",
];

const EQUIPMENT_OPTIONS = [
  "Nenhum (peso corporal)",
  "Halteres",
  "Barras",
  "Elásticos",
  "Kettlebells",
  "Academia completa",
  "Esteira/Bike",
  "TRX/Suspensão",
];

export default function StudentOnboarding() {
  const { user } = useAuth();
  const { refreshProfile } = useUserMetrics();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileName, setProfileName] = useState("");

  // Fetch profile name
  useEffect(() => {
    if (user?.id) {
      supabase.from("profiles").select("full_name").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.full_name) {
            setProfileName(data.full_name);
            setData(prev => ({ ...prev, full_name: data.full_name || "" }));
          }
        });
    }
  }, [user?.id]);

  const [data, setData] = useState<OnboardingData>({
    full_name: "",
    phone: "",
    birth_date: "",
    gender: "",
    occupation: "",
    height_cm: null,
    weight_kg: null,
    activity_level: "",
    sleep_hours: null,
    sleep_quality: "good",
    stress_level: "moderate",
    water_intake_liters: null,
    experience_level: "",
    workout_frequency: null,
    preferred_workout_time: "morning",
    available_equipment: [],
    workout_limitations: "",
    has_health_conditions: false,
    health_conditions: "",
    has_injuries: false,
    injuries: "",
    medications: "",
    allergies: "",
    primary_goal: "",
    secondary_goals: [],
    target_weight: null,
    motivation: "",
    additional_notes: "",
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSecondaryGoal = (goal: string) => {
    setData((prev) => ({
      ...prev,
      secondary_goals: prev.secondary_goals.includes(goal)
        ? prev.secondary_goals.filter((g) => g !== goal)
        : [...prev.secondary_goals, goal],
    }));
  };

  const toggleEquipment = (equipment: string) => {
    setData((prev) => ({
      ...prev,
      available_equipment: prev.available_equipment.includes(equipment)
        ? prev.available_equipment.filter((e) => e !== equipment)
        : [...prev.available_equipment, equipment],
    }));
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case "personal":
        return data.full_name && data.gender;
      case "physical":
        return data.height_cm && data.weight_kg;
      case "lifestyle":
        return data.activity_level;
      case "fitness":
        return data.experience_level;
      case "health":
        return true;
      case "goals":
        return data.primary_goal;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // 1. Map values to match DB Enums
      const activityMapping: Record<string, string> = {
        "sedentary": "sedentary",
        "lightly_active": "light",
        "moderately_active": "moderate",
        "very_active": "active",
        "extremely_active": "very_active"
      };

      const dbActivityLevel = activityMapping[data.activity_level] || "moderate";

      // Map Fitness Goal
      let fitnessGoal = "maintain";
      if (data.primary_goal === "lose_weight") fitnessGoal = "lose_weight";
      else if (data.primary_goal === "gain_muscle") fitnessGoal = "gain_muscle";

      // 2. Save to user_onboarding_data (The actual table for tracking)
      const { error: onboardingDataError } = await supabase
        .from("user_onboarding_data")
        .upsert({
          user_id: user.id,
          birth_date: data.birth_date || null,
          gender: data.gender,
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          target_weight_kg: data.target_weight,
          activity_level: dbActivityLevel,
          sleep_hours: data.sleep_hours,
          stress_level: data.stress_level,
          experience_level: data.experience_level,
          workout_frequency: data.workout_frequency,
          preferred_workout_time: data.preferred_workout_time,
          available_equipment: data.available_equipment,
          health_conditions: data.has_health_conditions ? [data.health_conditions] : [],
          injuries: data.injuries || null,
          medications: data.medications || null,
          primary_goal: data.primary_goal,
          secondary_goals: data.secondary_goals,
          motivation: data.motivation,
          updated_at: new Date().toISOString(),
        });

      if (onboardingDataError) {
        console.error("Error saving onboarding data:", onboardingDataError);
      }

      // Calculate Age
      let age = 0;
      if (data.birth_date) {
        const birthDate = new Date(data.birth_date);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // 3. IMPORTANT: Save to user_body_profiles for Health Page metrics
      const { error: metricsError } = await supabase.from("user_body_profiles").upsert({
        user_id: user.id,
        gender: data.gender === "male" || data.gender === "female" ? data.gender : "male",
        age: age,
        height: data.height_cm,
        current_weight: data.weight_kg,
        activity_level: dbActivityLevel,
        fitness_goal: fitnessGoal,
        goal_weight: data.target_weight,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (metricsError) {
        console.error("Error saving metrics:", metricsError);
        throw metricsError; // This is fatal for the healthy dashboard
      }

      // Mark as completed in profiles
      await supabase.from("profiles").update({
        full_name: data.full_name,
        onboarding_completed: true,
      }).eq("id", user.id);

      // 4. Force context refresh to sync with DB before navigating
      await refreshProfile();

      toast.success("Onboarding concluído com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "personal":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={data.full_name}
                onChange={(e) => updateData("full_name", e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Gênero *</Label>
              <RadioGroup
                value={data.gender}
                onValueChange={(v) => updateData("gender", v)}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "male", label: "Masculino" },
                  { value: "female", label: "Feminino" },
                  { value: "other", label: "Outro" },
                ].map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className={cn(
                        "flex items-center justify-center rounded-md border-2 p-3 cursor-pointer transition-all",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={data.birth_date}
                  onChange={(e) => updateData("birth_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={data.phone}
                  onChange={(e) => updateData("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Ocupação</Label>
              <Input
                id="occupation"
                value={data.occupation}
                onChange={(e) => updateData("occupation", e.target.value)}
                placeholder="Sua profissão"
              />
            </div>
          </div>
        );

      case "physical":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height_cm">Altura (cm) *</Label>
                <Input
                  id="height_cm"
                  type="number"
                  value={data.height_cm || ""}
                  onChange={(e) => updateData("height_cm", e.target.value ? Number(e.target.value) : null)}
                  placeholder="170"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Peso (kg) *</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  value={data.weight_kg || ""}
                  onChange={(e) => updateData("weight_kg", e.target.value ? Number(e.target.value) : null)}
                  placeholder="70"
                />
              </div>
            </div>

            {data.height_cm && data.weight_kg && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Seu IMC atual</p>
                    <p className="text-3xl font-bold text-primary">
                      {(data.weight_kg / Math.pow(data.height_cm / 100, 2)).toFixed(1)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "lifestyle":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Nível de Atividade Física *</Label>
              <RadioGroup
                value={data.activity_level}
                onValueChange={(v) => updateData("activity_level", v)}
                className="space-y-2"
              >
                {ACTIVITY_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem value={level.value} id={level.value} className="peer sr-only" />
                    <Label
                      htmlFor={level.value}
                      className={cn(
                        "flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      <div>
                        <p className="font-medium">{level.label}</p>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sleep_hours">Horas de Sono</Label>
                <Select
                  value={data.sleep_hours?.toString() || ""}
                  onValueChange={(v) => updateData("sleep_hours", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 6, 7, 8, 9, 10].map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h} horas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="water_intake">Água (litros/dia)</Label>
                <Select
                  value={data.water_intake_liters?.toString() || ""}
                  onValueChange={(v) => updateData("water_intake_liters", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((l) => (
                      <SelectItem key={l} value={l.toString()}>
                        {l}L
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nível de Estresse</Label>
              <RadioGroup
                value={data.stress_level}
                onValueChange={(v) => updateData("stress_level", v)}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "low", label: "Baixo" },
                  { value: "moderate", label: "Moderado" },
                  { value: "high", label: "Alto" },
                ].map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem value={option.value} id={`stress-${option.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`stress-${option.value}`}
                      className={cn(
                        "flex items-center justify-center rounded-md border-2 p-3 cursor-pointer transition-all",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case "fitness":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Experiência com Treinos *</Label>
              <RadioGroup
                value={data.experience_level}
                onValueChange={(v) => updateData("experience_level", v)}
                className="space-y-2"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem value={level.value} id={`exp-${level.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`exp-${level.value}`}
                      className={cn(
                        "flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      <div>
                        <p className="font-medium">{level.label}</p>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Frequência Desejada de Treinos</Label>
              <Select
                value={data.workout_frequency?.toString() || ""}
                onValueChange={(v) => updateData("workout_frequency", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Quantos dias por semana?" />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d}x por semana
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário Preferido para Treinar</Label>
              <RadioGroup
                value={data.preferred_workout_time}
                onValueChange={(v) => updateData("preferred_workout_time", v)}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "morning", label: "Manhã" },
                  { value: "afternoon", label: "Tarde" },
                  { value: "evening", label: "Noite" },
                ].map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem value={option.value} id={`time-${option.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`time-${option.value}`}
                      className={cn(
                        "flex items-center justify-center rounded-md border-2 p-3 cursor-pointer transition-all",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Equipamentos Disponíveis</Label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <div
                    key={equipment}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-all",
                      data.available_equipment.includes(equipment)
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleEquipment(equipment)}
                  >
                    <Checkbox checked={data.available_equipment.includes(equipment)} />
                    <span className="text-sm">{equipment}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitations">Limitações para Exercícios</Label>
              <Textarea
                id="limitations"
                value={data.workout_limitations}
                onChange={(e) => updateData("workout_limitations", e.target.value)}
                placeholder="Descreva qualquer limitação física ou restrição..."
                rows={2}
              />
            </div>
          </div>
        );

      case "health":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Possui alguma condição de saúde?</p>
                  <p className="text-sm text-muted-foreground">Diabetes, hipertensão, etc.</p>
                </div>
                <Checkbox
                  checked={data.has_health_conditions}
                  onCheckedChange={(checked) => updateData("has_health_conditions", checked)}
                />
              </div>

              {data.has_health_conditions && (
                <Textarea
                  value={data.health_conditions}
                  onChange={(e) => updateData("health_conditions", e.target.value)}
                  placeholder="Descreva suas condições de saúde..."
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Possui lesões ou dores?</p>
                  <p className="text-sm text-muted-foreground">Atuais ou anteriores</p>
                </div>
                <Checkbox
                  checked={data.has_injuries}
                  onCheckedChange={(checked) => updateData("has_injuries", checked)}
                />
              </div>

              {data.has_injuries && (
                <Textarea
                  value={data.injuries}
                  onChange={(e) => updateData("injuries", e.target.value)}
                  placeholder="Descreva suas lesões..."
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Medicamentos em Uso</Label>
              <Textarea
                id="medications"
                value={data.medications}
                onChange={(e) => updateData("medications", e.target.value)}
                placeholder="Liste os medicamentos que você toma regularmente..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias Alimentares</Label>
              <Textarea
                id="allergies"
                value={data.allergies}
                onChange={(e) => updateData("allergies", e.target.value)}
                placeholder="Liste alergias ou intolerâncias alimentares..."
                rows={2}
              />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Objetivo Principal *</Label>
              <RadioGroup
                value={data.primary_goal}
                onValueChange={(v) => updateData("primary_goal", v)}
                className="grid grid-cols-2 gap-3"
              >
                {PRIMARY_GOALS.map((goal) => (
                  <div key={goal.value}>
                    <RadioGroupItem value={goal.value} id={goal.value} className="peer sr-only" />
                    <Label
                      htmlFor={goal.value}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all h-24",
                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      )}
                    >
                      <span className="text-2xl mb-1">{goal.icon}</span>
                      <span className="text-sm font-medium text-center">{goal.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Objetivos Secundários</Label>
              <div className="flex flex-wrap gap-2">
                {SECONDARY_GOALS.map((goal) => (
                  <div
                    key={goal}
                    onClick={() => toggleSecondaryGoal(goal)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-all",
                      data.secondary_goals.includes(goal)
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {goal}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_weight">Peso Meta (kg)</Label>
              <Input
                id="target_weight"
                type="number"
                step="0.1"
                value={data.target_weight || ""}
                onChange={(e) => updateData("target_weight", e.target.value ? Number(e.target.value) : null)}
                placeholder="Seu peso objetivo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">O que te motiva?</Label>
              <Textarea
                id="motivation"
                value={data.motivation}
                onChange={(e) => updateData("motivation", e.target.value)}
                placeholder="Conte o que te motivou a buscar acompanhamento profissional..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Observações Adicionais</Label>
              <Textarea
                id="additional_notes"
                value={data.additional_notes}
                onChange={(e) => updateData("additional_notes", e.target.value)}
                placeholder="Algo mais que gostaria de compartilhar com seu treinador?"
                rows={2}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Vamos começar!</h1>
          <p className="text-muted-foreground">
            Complete seu perfil para seu treinador conhecer você melhor
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Etapa {currentStep + 1} de {STEPS.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1",
                  isActive && "text-primary",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-success text-success-foreground",
                    !isActive && !isCompleted && "bg-muted"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep].icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && "Precisamos conhecer você melhor"}
              {currentStep === 1 && "Suas medidas atuais"}
              {currentStep === 2 && "Como é sua rotina"}
              {currentStep === 3 && "Sua experiência com exercícios"}
              {currentStep === 4 && "Informações importantes de saúde"}
              {currentStep === 5 && "O que você quer alcançar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Concluir"}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
