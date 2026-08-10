import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Ruler,
  Activity,
  Heart,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAnamnesis } from "@/hooks/useAnamnesis";
import { Anamnesis, AssessmentType } from "@/types/personalTrainer";
import { cn } from "@/lib/utils";

interface AnamnesisHistoryProps {
  studentId: string;
}

interface MetricChange {
  label: string;
  currentValue: number | string | null | undefined;
  previousValue: number | string | null | undefined;
  unit: string;
  change?: number;
  trend?: "up" | "down" | "stable";
  isPositive?: boolean; // Se aumento é positivo (ex: massa muscular) ou negativo (ex: gordura)
}

const assessmentTypeLabels: Record<AssessmentType, string> = {
  initial: "Avaliação Inicial",
  followup: "Reavaliação",
  monthly: "Avaliação Mensal",
  quarterly: "Avaliação Trimestral",
};

function calculateChange(current: number | null | undefined, previous: number | null | undefined): { change: number; trend: "up" | "down" | "stable" } {
  if (!current || !previous) return { change: 0, trend: "stable" };
  const diff = current - previous;
  const percentChange = (diff / previous) * 100;
  return {
    change: Math.round(percentChange * 10) / 10,
    trend: diff > 0.01 ? "up" : diff < -0.01 ? "down" : "stable",
  };
}

function TrendIndicator({ trend, isPositive, change }: { trend: "up" | "down" | "stable"; isPositive?: boolean; change?: number }) {
  const isGood = isPositive ? trend === "up" : trend === "down";
  const isBad = isPositive ? trend === "down" : trend === "up";
  
  if (trend === "stable") {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-xs">Estável</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1",
      isGood && "text-success",
      isBad && "text-destructive",
      !isGood && !isBad && "text-muted-foreground"
    )}>
      {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span className="text-xs font-medium">
        {change !== undefined && `${change > 0 ? "+" : ""}${change}%`}
      </span>
    </div>
  );
}

function MetricCard({ metric }: { metric: MetricChange }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">
          {metric.currentValue ?? "—"} {metric.unit}
        </p>
        {metric.trend && (
          <TrendIndicator 
            trend={metric.trend} 
            isPositive={metric.isPositive} 
            change={metric.change} 
          />
        )}
      </div>
      {metric.previousValue !== undefined && metric.previousValue !== null && (
        <p className="text-xs text-muted-foreground">
          Anterior: {metric.previousValue} {metric.unit}
        </p>
      )}
    </div>
  );
}

function ComparisonView({ current, previous }: { current: Anamnesis; previous: Anamnesis }) {
  const metrics: MetricChange[] = useMemo(() => {
    return [
      {
        label: "Peso",
        currentValue: current.weight_kg,
        previousValue: previous.weight_kg,
        unit: "kg",
        ...calculateChange(current.weight_kg, previous.weight_kg),
        isPositive: false, // Geralmente perda de peso é o objetivo
      },
      {
        label: "% Gordura Corporal",
        currentValue: current.body_fat_percentage,
        previousValue: previous.body_fat_percentage,
        unit: "%",
        ...calculateChange(current.body_fat_percentage, previous.body_fat_percentage),
        isPositive: false,
      },
      {
        label: "Massa Muscular",
        currentValue: current.muscle_mass_kg,
        previousValue: previous.muscle_mass_kg,
        unit: "kg",
        ...calculateChange(current.muscle_mass_kg, previous.muscle_mass_kg),
        isPositive: true,
      },
      {
        label: "Circunferência Cintura",
        currentValue: current.waist_cm,
        previousValue: previous.waist_cm,
        unit: "cm",
        ...calculateChange(current.waist_cm, previous.waist_cm),
        isPositive: false,
      },
      {
        label: "Circunferência Quadril",
        currentValue: current.hip_cm,
        previousValue: previous.hip_cm,
        unit: "cm",
        ...calculateChange(current.hip_cm, previous.hip_cm),
        isPositive: false,
      },
      {
        label: "Circunferência Peitoral",
        currentValue: current.chest_cm,
        previousValue: previous.chest_cm,
        unit: "cm",
        ...calculateChange(current.chest_cm, previous.chest_cm),
        isPositive: true,
      },
      {
        label: "Circunferência Braço",
        currentValue: current.arm_cm,
        previousValue: previous.arm_cm,
        unit: "cm",
        ...calculateChange(current.arm_cm, previous.arm_cm),
        isPositive: true,
      },
      {
        label: "Circunferência Coxa",
        currentValue: current.thigh_cm,
        previousValue: previous.thigh_cm,
        unit: "cm",
        ...calculateChange(current.thigh_cm, previous.thigh_cm),
        isPositive: true,
      },
      {
        label: "FC Repouso",
        currentValue: current.resting_heart_rate,
        previousValue: previous.resting_heart_rate,
        unit: "bpm",
        ...calculateChange(current.resting_heart_rate, previous.resting_heart_rate),
        isPositive: false,
      },
    ].filter(m => m.currentValue !== null && m.currentValue !== undefined);
  }, [current, previous]);

  const daysBetween = Math.round(
    (new Date(current.assessment_date).getTime() - new Date(previous.assessment_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-center">
          <p className="font-medium">{format(new Date(previous.assessment_date), "dd/MM/yyyy")}</p>
          <p className="text-xs text-muted-foreground">{assessmentTypeLabels[previous.assessment_type]}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          <span className="text-xs">{daysBetween} dias</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-center">
          <p className="font-medium">{format(new Date(current.assessment_date), "dd/MM/yyyy")}</p>
          <p className="text-xs text-muted-foreground">{assessmentTypeLabels[current.assessment_type]}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function EvolutionChart({ anamnesisList }: { anamnesisList: Anamnesis[] }) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["weight_kg", "body_fat_percentage"]);

  const chartData = useMemo(() => {
    return [...anamnesisList].reverse().map((a) => ({
      date: format(new Date(a.assessment_date), "dd/MM/yy"),
      fullDate: format(new Date(a.assessment_date), "dd 'de' MMMM", { locale: ptBR }),
      weight_kg: a.weight_kg,
      body_fat_percentage: a.body_fat_percentage,
      muscle_mass_kg: a.muscle_mass_kg,
      waist_cm: a.waist_cm,
      hip_cm: a.hip_cm,
      chest_cm: a.chest_cm,
      arm_cm: a.arm_cm,
      thigh_cm: a.thigh_cm,
      resting_heart_rate: a.resting_heart_rate,
    }));
  }, [anamnesisList]);

  const metricOptions = [
    { value: "weight_kg", label: "Peso (kg)", color: "hsl(var(--primary))" },
    { value: "body_fat_percentage", label: "% Gordura", color: "hsl(var(--destructive))" },
    { value: "muscle_mass_kg", label: "Massa Muscular (kg)", color: "hsl(var(--success))" },
    { value: "waist_cm", label: "Cintura (cm)", color: "hsl(var(--warning))" },
    { value: "hip_cm", label: "Quadril (cm)", color: "hsl(var(--tertiary))" },
    { value: "chest_cm", label: "Peitoral (cm)", color: "hsl(var(--accent))" },
    { value: "arm_cm", label: "Braço (cm)", color: "hsl(210, 100%, 50%)" },
    { value: "thigh_cm", label: "Coxa (cm)", color: "hsl(280, 100%, 50%)" },
    { value: "resting_heart_rate", label: "FC Repouso (bpm)", color: "hsl(0, 100%, 60%)" },
  ];

  const toggleMetric = (value: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(value)
        ? prev.filter((m) => m !== value)
        : prev.length < 3
        ? [...prev, value]
        : prev
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Evolução das Métricas
        </CardTitle>
        <CardDescription>Selecione até 3 métricas para comparar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {metricOptions.map((option) => (
            <Badge
              key={option.value}
              variant={selectedMetrics.includes(option.value) ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              style={{
                backgroundColor: selectedMetrics.includes(option.value) ? option.color : undefined,
                borderColor: option.color,
                color: selectedMetrics.includes(option.value) ? "white" : option.color,
              }}
              onClick={() => toggleMetric(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
              />
              <Legend />
              {selectedMetrics.map((metricKey) => {
                const option = metricOptions.find((o) => o.value === metricKey);
                return (
                  <Line
                    key={metricKey}
                    type="monotone"
                    dataKey={metricKey}
                    stroke={option?.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={option?.label}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AnamnesisCard({ anamnesis, onCompare }: { anamnesis: Anamnesis; onCompare?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {assessmentTypeLabels[anamnesis.assessment_type]}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(anamnesis.assessment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{anamnesis.version}</Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {anamnesis.weight_kg && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Scale className="h-3 w-3" />
                    <span className="text-xs">Peso</span>
                  </div>
                  <p className="font-semibold">{anamnesis.weight_kg} kg</p>
                </div>
              )}
              {anamnesis.height_cm && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Ruler className="h-3 w-3" />
                    <span className="text-xs">Altura</span>
                  </div>
                  <p className="font-semibold">{anamnesis.height_cm} cm</p>
                </div>
              )}
              {anamnesis.body_fat_percentage && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-3 w-3" />
                    <span className="text-xs">% Gordura</span>
                  </div>
                  <p className="font-semibold">{anamnesis.body_fat_percentage}%</p>
                </div>
              )}
              {anamnesis.muscle_mass_kg && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-3 w-3" />
                    <span className="text-xs">Massa Muscular</span>
                  </div>
                  <p className="font-semibold">{anamnesis.muscle_mass_kg} kg</p>
                </div>
              )}
            </div>

            {/* Medidas Corporais */}
            {(anamnesis.waist_cm || anamnesis.hip_cm || anamnesis.chest_cm || anamnesis.arm_cm || anamnesis.thigh_cm) && (
              <div>
                <p className="text-sm font-medium mb-2">Medidas Corporais</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                  {anamnesis.waist_cm && (
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Cintura</p>
                      <p className="font-medium">{anamnesis.waist_cm} cm</p>
                    </div>
                  )}
                  {anamnesis.hip_cm && (
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Quadril</p>
                      <p className="font-medium">{anamnesis.hip_cm} cm</p>
                    </div>
                  )}
                  {anamnesis.chest_cm && (
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Peitoral</p>
                      <p className="font-medium">{anamnesis.chest_cm} cm</p>
                    </div>
                  )}
                  {anamnesis.arm_cm && (
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Braço</p>
                      <p className="font-medium">{anamnesis.arm_cm} cm</p>
                    </div>
                  )}
                  {anamnesis.thigh_cm && (
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Coxa</p>
                      <p className="font-medium">{anamnesis.thigh_cm} cm</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saúde Cardiovascular */}
            {(anamnesis.resting_heart_rate || anamnesis.blood_pressure_systolic) && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Saúde Cardiovascular
                </p>
                <div className="flex gap-4 text-sm">
                  {anamnesis.resting_heart_rate && (
                    <div>
                      <span className="text-muted-foreground">FC Repouso: </span>
                      <span className="font-medium">{anamnesis.resting_heart_rate} bpm</span>
                    </div>
                  )}
                  {anamnesis.blood_pressure_systolic && anamnesis.blood_pressure_diastolic && (
                    <div>
                      <span className="text-muted-foreground">PA: </span>
                      <span className="font-medium">
                        {anamnesis.blood_pressure_systolic}/{anamnesis.blood_pressure_diastolic} mmHg
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Objetivo */}
            {anamnesis.primary_goal && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Objetivo Principal
                </p>
                <p className="text-sm text-muted-foreground">{anamnesis.primary_goal}</p>
              </div>
            )}

            {/* Observações */}
            {anamnesis.observations && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-1">Observações</p>
                <p className="text-sm text-muted-foreground">{anamnesis.observations}</p>
              </div>
            )}

            {/* Ação de comparar */}
            {onCompare && (
              <Button variant="outline" size="sm" className="w-full" onClick={onCompare}>
                <Eye className="h-4 w-4 mr-2" />
                Comparar com outra avaliação
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function AnamnesisHistory({ studentId }: AnamnesisHistoryProps) {
  const { anamnesisList, isLoading } = useAnamnesis(studentId);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<{
    current?: Anamnesis;
    previous?: Anamnesis;
  }>({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (anamnesisList.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma anamnese registrada ainda</p>
      </div>
    );
  }

  const handleSelectForCompare = (anamnesis: Anamnesis) => {
    if (!selectedForCompare.current) {
      setSelectedForCompare({ current: anamnesis });
    } else if (!selectedForCompare.previous && anamnesis.id !== selectedForCompare.current.id) {
      // Ordenar para que current seja sempre a mais recente
      const isCurrent = new Date(anamnesis.assessment_date) > new Date(selectedForCompare.current.assessment_date);
      setSelectedForCompare({
        current: isCurrent ? anamnesis : selectedForCompare.current,
        previous: isCurrent ? selectedForCompare.current : anamnesis,
      });
    } else {
      setSelectedForCompare({ current: anamnesis });
    }
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Evolução */}
      {anamnesisList.length >= 2 && <EvolutionChart anamnesisList={anamnesisList} />}

      {/* Comparador Rápido */}
      {anamnesisList.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Comparar Avaliações</CardTitle>
                <CardDescription>Selecione duas avaliações para comparar a evolução</CardDescription>
              </div>
              {(selectedForCompare.current || selectedForCompare.previous) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedForCompare({})}
                >
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={selectedForCompare.previous?.id || ""}
                onValueChange={(id) => {
                  const anamnesis = anamnesisList.find((a) => a.id === id);
                  if (anamnesis) {
                    setSelectedForCompare((prev) => ({ ...prev, previous: anamnesis }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Avaliação anterior" />
                </SelectTrigger>
                <SelectContent>
                  {anamnesisList.map((a) => (
                    <SelectItem 
                      key={a.id} 
                      value={a.id}
                      disabled={a.id === selectedForCompare.current?.id}
                    >
                      {format(new Date(a.assessment_date), "dd/MM/yyyy")} - {assessmentTypeLabels[a.assessment_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedForCompare.current?.id || ""}
                onValueChange={(id) => {
                  const anamnesis = anamnesisList.find((a) => a.id === id);
                  if (anamnesis) {
                    setSelectedForCompare((prev) => ({ ...prev, current: anamnesis }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Avaliação atual" />
                </SelectTrigger>
                <SelectContent>
                  {anamnesisList.map((a) => (
                    <SelectItem 
                      key={a.id} 
                      value={a.id}
                      disabled={a.id === selectedForCompare.previous?.id}
                    >
                      {format(new Date(a.assessment_date), "dd/MM/yyyy")} - {assessmentTypeLabels[a.assessment_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedForCompare.current && selectedForCompare.previous && (
              <ComparisonView
                current={selectedForCompare.current}
                previous={selectedForCompare.previous}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Anamneses */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Histórico de Avaliações ({anamnesisList.length})
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {anamnesisList.map((anamnesis, index) => (
              <AnamnesisCard 
                key={anamnesis.id} 
                anamnesis={anamnesis}
                onCompare={
                  anamnesisList.length >= 2 
                    ? () => handleSelectForCompare(anamnesis)
                    : undefined
                }
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
