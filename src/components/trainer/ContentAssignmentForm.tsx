import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainerStudents } from "@/hooks/useTrainerStudents";
import { useContentAssignments, ContentType } from "@/hooks/useContentAssignments";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useDiets } from "@/hooks/useDiets";
import { useChallenges } from "@/hooks/useChallenges";
import { useUserHabits } from "@/hooks/useHabits";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Dumbbell,
  UtensilsCrossed,
  Target,
  Star,
  User,
  Plus,
  Check,
  Search,
} from "lucide-react";

const formSchema = z.object({
  content_type: z.enum(["workout", "diet", "challenge", "habit"]),
  content_id: z.string().min(1, "Selecione um conteúdo"),
  student_id: z.string().min(1, "Selecione um aluno"),
  start_date: z.date({ required_error: "Data de início obrigatória" }),
  end_date: z.date().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ContentItem {
  id: string;
  name: string;
  description?: string;
}

interface ContentAssignmentFormProps {
  trigger?: React.ReactNode;
  defaultContentType?: ContentType;
  defaultContentId?: string;
  defaultStudentId?: string;
  onSuccess?: () => void;
}

const contentTypeConfig = {
  workout: {
    icon: Dumbbell,
    label: "Treino",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  diet: {
    icon: UtensilsCrossed,
    label: "Dieta",
    color: "text-success",
    bg: "bg-success/10",
  },
  challenge: {
    icon: Target,
    label: "Desafio",
    color: "text-tertiary",
    bg: "bg-tertiary/10",
  },
  habit: {
    icon: Star,
    label: "Hábito",
    color: "text-warning",
    bg: "bg-warning/10",
  },
};

export function ContentAssignmentForm({
  trigger,
  defaultContentType,
  defaultContentId,
  defaultStudentId,
  onSuccess,
}: ContentAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [searchContent, setSearchContent] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  const { studentSummaries = [], isLoading: isLoadingStudents } = useTrainerStudents();
  const { createAssignment } = useContentAssignments();
  const { allWorkouts = [], isLoading: isLoadingWorkouts } = useWorkouts();
  const { allDiets = [], isLoading: isLoadingDiets } = useDiets();
  const { challenges = [], isLoading: isLoadingChallenges } = useChallenges();
  const { habits = [], isLoading: isLoadingHabits } = useUserHabits();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content_type: defaultContentType || "workout",
      content_id: defaultContentId || "",
      student_id: defaultStudentId || "",
      start_date: new Date(),
      end_date: undefined,
      notes: "",
    },
  });

  const contentType = form.watch("content_type");

  const contentItems: ContentItem[] = useMemo(() => {
    switch (contentType) {
      case "workout":
        return allWorkouts.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description,
        }));
      case "diet":
        return allDiets.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
        }));
      case "challenge":
        return challenges.map((c: any) => ({
          id: c.id,
          name: c.title || c.name,
          description: c.description,
        }));
      case "habit":
        return habits.map((h: any) => ({
          id: h.id,
          name: h.name,
          description: h.description,
        }));
      default:
        return [];
    }
  }, [contentType, allWorkouts, allDiets, challenges, habits]);

  const filteredContent = useMemo(() => {
    if (!searchContent) return contentItems;
    const query = searchContent.toLowerCase();
    return contentItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }, [contentItems, searchContent]);

  const filteredStudents = useMemo(() => {
    if (!searchStudent) return studentSummaries;
    const query = searchStudent.toLowerCase();
    return studentSummaries.filter(
      (s: any) =>
        s.student_name?.toLowerCase().includes(query) ||
        s.student_email?.toLowerCase().includes(query)
    );
  }, [studentSummaries, searchStudent]);

  const isLoadingContent =
    isLoadingWorkouts || isLoadingDiets || isLoadingChallenges || isLoadingHabits;

  const onSubmit = async (values: FormData) => {
    const selectedContent = contentItems.find((c) => c.id === values.content_id);

    createAssignment.mutate(
      {
        content_type: values.content_type,
        content_id: values.content_id,
        assigned_to_type: "user",
        assigned_to_id: values.student_id,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: values.end_date ? format(values.end_date, "yyyy-MM-dd") : null,
        title: selectedContent?.name,
        notes: values.notes,
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          onSuccess?.();
        },
      }
    );
  };

  const selectedContent = contentItems.find((c) => c.id === form.watch("content_id"));
  const selectedStudent = studentSummaries.find(
    (s: any) => s.student_id === form.watch("student_id")
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atribuição
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Conteúdo</DialogTitle>
          <DialogDescription>
            Selecione o conteúdo, aluno e período para a atribuição
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Content Type */}
            <FormField
              control={form.control}
              name="content_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conteúdo</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(contentTypeConfig) as ContentType[]).map((type) => {
                        const config = contentTypeConfig[type];
                        const Icon = config.icon;
                        const isSelected = field.value === type;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              field.onChange(type);
                              form.setValue("content_id", "");
                            }}
                            className={cn(
                              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", config.color)} />
                            <span className="text-xs font-medium">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Selection */}
            <FormField
              control={form.control}
              name="content_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar {contentTypeConfig[contentType]?.label}</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={`Buscar ${contentTypeConfig[contentType]?.label.toLowerCase()}...`}
                          value={searchContent}
                          onChange={(e) => setSearchContent(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <ScrollArea className="h-40 border rounded-lg p-2">
                        {isLoadingContent ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : filteredContent.length === 0 ? (
                          <div className="text-center text-muted-foreground py-4 text-sm">
                            Nenhum conteúdo encontrado
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredContent.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => field.onChange(item.id)}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  field.value === item.id
                                    ? "bg-primary/10 border border-primary"
                                    : "hover:bg-muted"
                                )}
                              >
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded flex items-center justify-center shrink-0",
                                    contentTypeConfig[contentType]?.bg
                                  )}
                                >
                                  {(() => {
                                    const Icon = contentTypeConfig[contentType]?.icon;
                                    return (
                                      <Icon
                                        className={cn(
                                          "h-4 w-4",
                                          contentTypeConfig[contentType]?.color
                                        )}
                                      />
                                    );
                                  })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {field.value === item.id && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Student Selection */}
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar Aluno</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar aluno..."
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <ScrollArea className="h-40 border rounded-lg p-2">
                        {isLoadingStudents ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : filteredStudents.length === 0 ? (
                          <div className="text-center text-muted-foreground py-4 text-sm">
                            Nenhum aluno encontrado
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredStudents.map((student: any) => (
                              <div
                                key={student.student_id}
                                onClick={() => field.onChange(student.student_id)}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  field.value === student.student_id
                                    ? "bg-primary/10 border border-primary"
                                    : "hover:bg-muted"
                                )}
                              >
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {student.student_name || "Aluno"}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {student.student_email}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs shrink-0",
                                    student.status === "active" &&
                                      "text-success border-success/30"
                                  )}
                                >
                                  {student.status === "active" ? "Ativo" : student.status}
                                </Badge>
                                {field.value === student.student_id && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecione"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              : "Sem data limite"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          disabled={(date) =>
                            date < (form.getValues("start_date") || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções ou observações para o aluno..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Adicione orientações específicas para este período
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary */}
            {selectedContent && selectedStudent && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Resumo da Atribuição</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">{selectedContent.name}</span> será
                    atribuído para{" "}
                    <span className="font-medium text-foreground">
                      {selectedStudent.student_name}
                    </span>
                  </p>
                  <p>
                    Início:{" "}
                    <span className="font-medium text-foreground">
                      {format(form.watch("start_date"), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    {form.watch("end_date") && (
                      <>
                        {" "}
                        até{" "}
                        <span className="font-medium text-foreground">
                          {format(form.watch("end_date")!, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Atribuindo..." : "Atribuir Conteúdo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ContentAssignmentForm;
