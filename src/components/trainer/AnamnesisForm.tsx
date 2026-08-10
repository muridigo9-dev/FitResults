import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Heart,
  Activity,
  Moon,
  Target,
  FileText,
  ChevronDown,
  ChevronUp,
  Ruler,
  Weight,
  Pill,
  AlertTriangle,
  Calendar,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sanitizeToNumber } from "@/lib/numberUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useAnamnesis } from "@/hooks/useAnamnesis";
import {
  Anamnesis,
  AssessmentType,
  SleepQuality,
  StressLevel,
  AlcoholFrequency,
  SmokingStatus,
} from "@/types/personalTrainer";

// Schema de validação
const anamnesisSchema = z.object({
  user_id: z.string().uuid(),
  assessment_type: z.enum(["initial", "followup", "monthly", "quarterly"]),
  assessment_date: z.string(),
  
  // Dados pessoais
  birth_date: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  emergency_contact: z.string().optional().nullable(),
  emergency_phone: z.string().optional().nullable(),
  
  // Histórico de saúde (arrays como strings separadas por vírgula para simplificar)
  medical_conditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  injuries: z.string().optional(),
  surgeries: z.string().optional(),
  
  // Estilo de vida
  sleep_hours: z.coerce.number().min(0).max(24).optional().nullable(),
  sleep_quality: z.enum(["poor", "fair", "good", "excellent"]).optional().nullable(),
  stress_level: z.enum(["low", "moderate", "high", "very_high"]).optional().nullable(),
  alcohol_frequency: z.enum(["never", "rarely", "weekly", "daily"]).optional().nullable(),
  smoking_status: z.enum(["never", "former", "current"]).optional().nullable(),
  
  // Avaliação física
  height_cm: z.coerce.number().min(100).max(250).optional().nullable(),
  weight_kg: z.coerce.number().min(30).max(300).optional().nullable(),
  body_fat_percentage: z.coerce.number().min(3).max(60).optional().nullable(),
  muscle_mass_kg: z.coerce.number().min(10).max(150).optional().nullable(),
  waist_cm: z.coerce.number().min(40).max(200).optional().nullable(),
  hip_cm: z.coerce.number().min(50).max(200).optional().nullable(),
  chest_cm: z.coerce.number().min(50).max(200).optional().nullable(),
  arm_cm: z.coerce.number().min(15).max(70).optional().nullable(),
  thigh_cm: z.coerce.number().min(30).max(100).optional().nullable(),
  
  // Avaliação fitness
  resting_heart_rate: z.coerce.number().min(30).max(200).optional().nullable(),
  blood_pressure_systolic: z.coerce.number().min(70).max(250).optional().nullable(),
  blood_pressure_diastolic: z.coerce.number().min(40).max(150).optional().nullable(),
  flexibility_test: z.string().optional().nullable(),
  strength_test: z.string().optional().nullable(),
  endurance_test: z.string().optional().nullable(),
  
  // Objetivos
  primary_goal: z.string().optional().nullable(),
  secondary_goals: z.string().optional(),
  target_weight_kg: z.coerce.number().min(30).max(200).optional().nullable(),
  target_body_fat: z.coerce.number().min(3).max(40).optional().nullable(),
  
  // Observações
  observations: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
});

type FormData = z.infer<typeof anamnesisSchema>;

interface AnamnesisFormProps {
  studentId: string;
  existingAnamnesis?: Anamnesis | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon}
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function AnamnesisForm({
  studentId,
  existingAnamnesis,
  onSuccess,
  onCancel,
}: AnamnesisFormProps) {
  const { createAnamnesis, updateAnamnesis, isCreating, isUpdating } = useAnamnesis(studentId);
  const isEditing = !!existingAnamnesis;

  // Converter arrays para strings para o formulário
  const arrayToString = (arr?: string[] | null) => arr?.join(", ") || "";
  
  // Converter strings para arrays para salvar
  const stringToArray = (str?: string) => 
    str ? str.split(",").map(s => s.trim()).filter(Boolean) : [];

  // Helper para sanitizar inputs numéricos no onBlur
  const handleNumericBlur = (fieldName: keyof FormData) => (e: React.FocusEvent<HTMLInputElement>) => {
    const sanitized = sanitizeToNumber(e.target.value);
    form.setValue(fieldName, sanitized as any);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: existingAnamnesis
      ? {
          ...existingAnamnesis,
          medical_conditions: arrayToString(existingAnamnesis.medical_conditions),
          medications: arrayToString(existingAnamnesis.medications),
          allergies: arrayToString(existingAnamnesis.allergies),
          injuries: arrayToString(existingAnamnesis.injuries),
          surgeries: arrayToString(existingAnamnesis.surgeries),
          secondary_goals: arrayToString(existingAnamnesis.secondary_goals),
        }
      : {
          user_id: studentId,
          assessment_type: "initial" as AssessmentType,
          assessment_date: format(new Date(), "yyyy-MM-dd"),
        },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      medical_conditions: stringToArray(data.medical_conditions),
      medications: stringToArray(data.medications),
      allergies: stringToArray(data.allergies),
      injuries: stringToArray(data.injuries),
      surgeries: stringToArray(data.surgeries),
      secondary_goals: stringToArray(data.secondary_goals),
    };

    if (isEditing && existingAnamnesis) {
      updateAnamnesis({ ...payload, id: existingAnamnesis.id } as any);
    } else {
      createAnamnesis(payload as any);
    }
    
    onSuccess?.();
  };

  const assessmentTypeLabels: Record<AssessmentType, string> = {
    initial: "Avaliação Inicial",
    followup: "Reavaliação",
    monthly: "Avaliação Mensal",
    quarterly: "Avaliação Trimestral",
  };

  const sleepQualityLabels: Record<SleepQuality, string> = {
    poor: "Ruim",
    fair: "Regular",
    good: "Boa",
    excellent: "Excelente",
  };

  const stressLevelLabels: Record<StressLevel, string> = {
    low: "Baixo",
    moderate: "Moderado",
    high: "Alto",
    very_high: "Muito Alto",
  };

  const alcoholLabels: Record<AlcoholFrequency, string> = {
    never: "Nunca",
    rarely: "Raramente",
    weekly: "Semanalmente",
    daily: "Diariamente",
  };

  const smokingLabels: Record<SmokingStatus, string> = {
    never: "Nunca fumou",
    former: "Ex-fumante",
    current: "Fumante",
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Header com tipo e data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Anamnese" : "Nova Anamnese"}
            </CardTitle>
            <CardDescription>
              Preencha os dados de avaliação do aluno
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assessment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Avaliação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(assessmentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assessment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Avaliação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Pessoais */}
        <Section
          title="Dados Pessoais"
          icon={<User className="h-5 w-5 text-primary" />}
          defaultOpen
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupação / Profissão</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Desenvolvedor, Professor..." 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="emergency_contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contato de Emergência
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome do contato" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="emergency_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone de Emergência</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(00) 00000-0000" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* Histórico de Saúde */}
        <Section
          title="Histórico de Saúde"
          icon={<Heart className="h-5 w-5 text-red-500" />}
        >
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="medical_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Condições Médicas
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Diabetes, Hipertensão, Asma... (separe por vírgula)" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" />
                    Medicamentos em Uso
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Losartana 50mg, Metformina... (separe por vírgula)" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alergias</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Penicilina, Amendoim, Látex... (separe por vírgula)" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="injuries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesões Anteriores</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Tendinite no ombro, Entorse de tornozelo..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="surgeries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cirurgias Realizadas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Apendicectomia (2020), Artroscopia de joelho..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Section>

        {/* Estilo de Vida */}
        <Section
          title="Estilo de Vida"
          icon={<Moon className="h-5 w-5 text-indigo-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="sleep_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas de Sono/dia</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      max={24} 
                      step={0.5}
                      placeholder="Ex: 7" 
                      {...field}
                      value={field.value ?? ""}
                      onBlur={handleNumericBlur("sleep_hours")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sleep_quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualidade do Sono</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(sleepQualityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stress_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Estresse</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(stressLevelLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="alcohol_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo de Álcool</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(alcoholLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="smoking_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tabagismo</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(smokingLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* Avaliação Física */}
        <Section
          title="Avaliação Física / Medidas"
          icon={<Ruler className="h-5 w-5 text-green-500" />}
        >
          <div className="space-y-4">
            {/* Composição Corporal */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                Composição Corporal
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" /> Altura (cm)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="170" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("height_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Weight className="h-3 w-3" /> Peso (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step={0.1}
                          placeholder="70" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("weight_kg")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="body_fat_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Gordura</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step={0.1}
                          placeholder="15" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("body_fat_percentage")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="muscle_mass_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Massa Muscular (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step={0.1}
                          placeholder="30" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("muscle_mass_kg")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Circunferências */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                Circunferências (cm)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="waist_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cintura</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="80" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("waist_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="hip_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quadril</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="95" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("hip_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chest_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tórax</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="95" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("chest_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="arm_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Braço</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="32" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("arm_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="thigh_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coxa</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="55" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("thigh_cm")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Avaliação Fitness */}
        <Section
          title="Avaliação de Condicionamento"
          icon={<Activity className="h-5 w-5 text-orange-500" />}
        >
          <div className="space-y-4">
            {/* Sinais vitais */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                Sinais Vitais
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="resting_heart_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FC Repouso (bpm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="65" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("resting_heart_rate")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="blood_pressure_systolic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PA Sistólica (mmHg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="120" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("blood_pressure_systolic")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="blood_pressure_diastolic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PA Diastólica (mmHg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="80" 
                          {...field}
                          value={field.value ?? ""}
                          onBlur={handleNumericBlur("blood_pressure_diastolic")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Testes */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                Testes de Aptidão
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="flexibility_test"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teste de Flexibilidade</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Sentar e alcançar: +5cm" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="strength_test"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teste de Força</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Supino 1RM: 80kg" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endurance_test"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teste de Resistência</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Cooper: 2400m" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Objetivos */}
        <Section
          title="Objetivos"
          icon={<Target className="h-5 w-5 text-purple-500" />}
        >
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="primary_goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo Principal</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Perder 10kg, Ganhar massa muscular, Melhorar condicionamento..." 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="secondary_goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos Secundários</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Melhorar sono, Reduzir estresse, Aumentar energia... (separe por vírgula)" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso Meta (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step={0.1}
                        placeholder="65" 
                        {...field}
                        value={field.value ?? ""}
                        onBlur={handleNumericBlur("target_weight_kg")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="target_body_fat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Gordura Meta</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step={0.1}
                        placeholder="12" 
                        {...field}
                        value={field.value ?? ""}
                        onBlur={handleNumericBlur("target_body_fat")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Section>

        {/* Observações e Recomendações */}
        <Section
          title="Observações e Recomendações"
          icon={<FileText className="h-5 w-5 text-muted-foreground" />}
        >
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Gerais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Anotações sobre o aluno, pontos de atenção, limitações observadas..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recommendations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recomendações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Recomendações de treino, dieta, acompanhamento médico..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (
              "Salvando..."
            ) : isEditing ? (
              "Atualizar Anamnese"
            ) : (
              "Criar Anamnese"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
