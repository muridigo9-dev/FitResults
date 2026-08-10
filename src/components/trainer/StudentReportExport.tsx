import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentProgress, StudentSummary, StudentProgress } from "@/hooks/useTrainerStudents";
import { useAnamnesis } from "@/hooks/useAnamnesis";
import { downloadStudentReportPDF, openStudentReportInNewTab } from "@/lib/pdfExport";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StudentReportExportProps {
  student: StudentSummary;
  trigger?: React.ReactNode;
}

type PeriodPreset = "7d" | "30d" | "90d" | "month" | "custom";

export function StudentReportExport({ student, trigger }: StudentReportExportProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("30d");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [trainerName, setTrainerName] = useState("Personal Trainer");

  // Fetch trainer name
  useEffect(() => {
    if (user?.id) {
      supabase.from("profiles").select("full_name").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.full_name) setTrainerName(data.full_name);
        });
    }
  }, [user?.id]);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    switch (periodPreset) {
      case "7d":
        return { start: subDays(end, 7), end };
      case "30d":
        return { start: subDays(end, 30), end };
      case "90d":
        return { start: subDays(end, 90), end };
      case "month":
        const lastMonth = subMonths(end, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "custom":
        return {
          start: customStart || subDays(end, 30),
          end: customEnd || end,
        };
      default:
        return { start: subDays(end, 30), end };
    }
  };

  const dateRange = getDateRange();

  const { data: progressData = [] } = useStudentProgress(
    student.student_id,
    dateRange.start,
    dateRange.end
  );

  const { anamnesisList = [] } = useAnamnesis(student.student_id);

  const handleExport = async (openInNewTab: boolean = false) => {
    setIsGenerating(true);

    try {
      // Get first and last anamnesis in period
      const sortedAnamnesis = [...anamnesisList].sort(
        (a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime()
      );
      const initialAnamnesis = sortedAnamnesis[0];
      const currentAnamnesis = sortedAnamnesis[sortedAnamnesis.length - 1];

      const metrics = [];

      // Weight
      if (initialAnamnesis?.weight_kg || currentAnamnesis?.weight_kg) {
        const change =
          initialAnamnesis?.weight_kg && currentAnamnesis?.weight_kg
            ? ((currentAnamnesis.weight_kg - initialAnamnesis.weight_kg) / initialAnamnesis.weight_kg) * 100
            : undefined;
        metrics.push({
          label: "Peso",
          initial: initialAnamnesis?.weight_kg ?? null,
          current: currentAnamnesis?.weight_kg ?? null,
          unit: "kg",
          change,
          changeType:
            change !== undefined
              ? change < 0
                ? ("positive" as const)
                : change > 0
                ? ("negative" as const)
                : ("neutral" as const)
              : undefined,
        });
      }

      // Body Fat
      if (initialAnamnesis?.body_fat_percentage || currentAnamnesis?.body_fat_percentage) {
        const change =
          initialAnamnesis?.body_fat_percentage && currentAnamnesis?.body_fat_percentage
            ? currentAnamnesis.body_fat_percentage - initialAnamnesis.body_fat_percentage
            : undefined;
        metrics.push({
          label: "Gordura Corporal",
          initial: initialAnamnesis?.body_fat_percentage ?? null,
          current: currentAnamnesis?.body_fat_percentage ?? null,
          unit: "%",
          change,
          changeType:
            change !== undefined
              ? change < 0
                ? ("positive" as const)
                : change > 0
                ? ("negative" as const)
                : ("neutral" as const)
              : undefined,
        });
      }

      // Muscle Mass
      if (initialAnamnesis?.muscle_mass_kg || currentAnamnesis?.muscle_mass_kg) {
        const change =
          initialAnamnesis?.muscle_mass_kg && currentAnamnesis?.muscle_mass_kg
            ? ((currentAnamnesis.muscle_mass_kg - initialAnamnesis.muscle_mass_kg) /
                initialAnamnesis.muscle_mass_kg) *
              100
            : undefined;
        metrics.push({
          label: "Massa Muscular",
          initial: initialAnamnesis?.muscle_mass_kg ?? null,
          current: currentAnamnesis?.muscle_mass_kg ?? null,
          unit: "kg",
          change,
          changeType:
            change !== undefined
              ? change > 0
                ? ("positive" as const)
                : change < 0
                ? ("negative" as const)
                : ("neutral" as const)
              : undefined,
        });
      }

      // Waist
      if (initialAnamnesis?.waist_cm || currentAnamnesis?.waist_cm) {
        const change =
          initialAnamnesis?.waist_cm && currentAnamnesis?.waist_cm
            ? currentAnamnesis.waist_cm - initialAnamnesis.waist_cm
            : undefined;
        metrics.push({
          label: "Circunferência Cintura",
          initial: initialAnamnesis?.waist_cm ?? null,
          current: currentAnamnesis?.waist_cm ?? null,
          unit: "cm",
          change,
          changeType:
            change !== undefined
              ? change < 0
                ? ("positive" as const)
                : change > 0
                ? ("negative" as const)
                : ("neutral" as const)
              : undefined,
        });
      }

      // Calculate summary from progress data
      const progressArray = progressData as StudentProgress[];
      const totalCheckins = progressArray.length;
      const workoutsCompleted = progressArray.reduce((sum, p) => sum + (p.workouts_completed || 0), 0);
      const habitsCompleted = progressArray.reduce((sum, p) => sum + (p.habits_completed || 0), 0);

      const reportData = {
        studentName: student.student_name || "Aluno",
        studentEmail: student.student_email || "",
        trainerName: trainerName,
        generatedAt: new Date(),
        period: dateRange,
        metrics,
        summary: {
          totalCheckins,
          averageStreak: student.current_streak || 0,
          longestStreak: student.longest_streak || 0,
          workoutsCompleted,
          habitsCompleted,
          totalXP: student.total_xp || 0,
          currentLevel: student.level || 1,
        },
        progressData: progressArray.map((p) => ({
          date: format(new Date(p.date), "dd/MM"),
          weight: p.weight || undefined,
          workouts: p.workouts_completed || undefined,
          water: p.water_completion_pct || undefined,
        })),
      };

      if (openInNewTab) {
        openStudentReportInNewTab(reportData);
      } else {
        downloadStudentReportPDF(reportData);
      }

      toast.success("Relatório gerado com sucesso!");
      setOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório de Evolução</DialogTitle>
          <DialogDescription>
            Gere um relatório PDF com a evolução de {student.student_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Period Selection */}
          <div className="space-y-3">
            <Label>Período do Relatório</Label>
            <RadioGroup
              value={periodPreset}
              onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "7d", label: "Últimos 7 dias" },
                { value: "30d", label: "Últimos 30 dias" },
                { value: "90d", label: "Últimos 90 dias" },
                { value: "month", label: "Mês anterior" },
                { value: "custom", label: "Personalizado" },
              ].map((option) => (
                <div key={option.value}>
                  <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      "flex items-center justify-center rounded-md border-2 p-3 cursor-pointer transition-all text-sm",
                      "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                      option.value === "custom" && "col-span-2"
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Date Range */}
          {periodPreset === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStart ? format(customStart, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEnd ? format(customEnd, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Period Preview */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Período selecionado</p>
            <p className="font-medium">
              {format(dateRange.start, "dd 'de' MMMM", { locale: ptBR })} a{" "}
              {format(dateRange.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleExport(true)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Visualizar
            </Button>
            <Button className="flex-1" onClick={() => handleExport(false)} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentReportExport;
