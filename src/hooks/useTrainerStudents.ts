import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrainerStudent {
  id: string;
  trainer_id: string;
  student_id: string;
  status: "active" | "inactive" | "pending";
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface StudentSummary {
  trainer_id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  student_avatar: string | null;
  status: string;
  started_at: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  last_checkin_date: string | null;
  checkins_last_7_days: number;
  active_assignments: number;
}

export interface StudentProgress {
  date: string;
  mood: string | null;
  weight: number | null;
  water_ml: number | null;
  water_goal_ml: number | null;
  water_completion_pct: number;
  habits_completed: number;
  workouts_completed: number;
  meals_logged: number;
  checkin_exists: boolean;
}

/**
 * Hook for Personal Trainers to manage their students
 */
export function useTrainerStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch trainer's students using raw query (table may not exist yet)
  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ["trainer-students", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from("trainer_students" as any)
          .select("*")
          .eq("trainer_id", user.id)
          .order("started_at", { ascending: false });
        
        if (error) {
          // Table doesn't exist yet - return empty
          if (error.code === "42P01") return [];
          throw error;
        }
        return (data || []) as unknown as TrainerStudent[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch student summaries (with progress data)
  const { data: studentSummaries = [], isLoading: isSummaryLoading } = useQuery({
    queryKey: ["trainer-student-summaries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from("trainer_student_summary" as any)
          .select("*")
          .eq("trainer_id", user.id);
        
        if (error) {
          if (error.code === "42P01") return [];
          throw error;
        }
        return (data || []) as unknown as StudentSummary[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Add a student
  const addStudent = useMutation({
    mutationFn: async ({ studentId, notes }: { studentId: string; notes?: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      
      const { data, error } = await supabase
        .from("trainer_students" as any)
        .insert({
          trainer_id: user.id,
          student_id: studentId,
          notes: notes || null,
          status: "active",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-students"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-student-summaries"] });
      toast.success("Aluno adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar aluno: ${error.message}`);
    },
  });

  // Remove a student
  const removeStudent = useMutation({
    mutationFn: async (studentId: string) => {
      if (!user?.id) throw new Error("Não autenticado");
      
      const { error } = await supabase
        .from("trainer_students" as any)
        .update({ status: "inactive", ended_at: new Date().toISOString() })
        .eq("trainer_id", user.id)
        .eq("student_id", studentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-students"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-student-summaries"] });
      toast.success("Aluno removido");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover aluno: ${error.message}`);
    },
  });

  // Update student notes
  const updateStudentNotes = useMutation({
    mutationFn: async ({ studentId, notes }: { studentId: string; notes: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      
      const { error } = await supabase
        .from("trainer_students" as any)
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("trainer_id", user.id)
        .eq("student_id", studentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-students"] });
      toast.success("Anotações atualizadas");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    students,
    studentSummaries,
    isLoading: isLoading || isSummaryLoading,
    addStudent,
    removeStudent,
    updateStudentNotes,
    refetch,
  };
}

/**
 * Hook to get detailed progress for a specific student
 */
export function useStudentProgress(studentId: string | null, startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  return useQuery({
    queryKey: ["student-progress", studentId, start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<StudentProgress[]> => {
      if (!user?.id || !studentId) return [];
      
      try {
        const { data, error } = await supabase.rpc("get_student_progress" as any, {
          _trainer_id: user.id,
          _student_id: studentId,
          _start_date: start.toISOString().split("T")[0],
          _end_date: end.toISOString().split("T")[0],
        });
        
        if (error) {
          // Function doesn't exist yet
          if (error.code === "42883") return [];
          throw error;
        }
        return (data || []) as StudentProgress[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id && !!studentId,
  });
}

/**
 * Hook for students to see their trainer
 */
export function useMyTrainer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-trainer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from("trainer_students" as any)
          .select(`
            *,
            trainer:profiles!trainer_students_trainer_id_fkey(id, full_name, email, avatar_url)
          `)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        
        if (error) {
          if (error.code === "42P01") return null;
          throw error;
        }
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });
}
