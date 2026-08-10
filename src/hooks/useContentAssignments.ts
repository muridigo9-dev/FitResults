import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ContentType = "diet" | "workout" | "challenge" | "habit";
export type AssignmentStatus = "scheduled" | "active" | "completed" | "cancelled";
export type AssignedToType = "user" | "group";

export interface ContentAssignment {
  id: string;
  content_type: ContentType;
  content_id: string;
  assigned_to_type: AssignedToType;
  assigned_to_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  title: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateAssignmentData {
  content_type: ContentType;
  content_id: string;
  assigned_to_type: AssignedToType;
  assigned_to_id: string;
  start_date: string;
  end_date?: string | null;
  title?: string;
  notes?: string;
}

/**
 * Hook for managing content assignments (for trainers/admins)
 */
export function useContentAssignments(contentType?: ContentType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch assignments created by current user
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ["content-assignments", user?.id, contentType],
    queryFn: async (): Promise<ContentAssignment[]> => {
      if (!user?.id) return [];
      
      try {
        let query = supabase
          .from("content_assignments" as any)
          .select("*")
          .eq("assigned_by", user.id)
          .order("start_date", { ascending: false });
        
        if (contentType) {
          query = query.eq("content_type", contentType);
        }
        
        const { data, error } = await query;
        if (error) {
          // Table doesn't exist yet
          if (error.code === "42P01") return [];
          throw error;
        }
        return (data || []) as unknown as ContentAssignment[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Create new assignment
  const createAssignment = useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      if (!user?.id) throw new Error("Não autenticado");
      
      const { data: result, error } = await supabase
        .from("content_assignments" as any)
        .insert({
          ...data,
          assigned_by: user.id,
          status: new Date(data.start_date) <= new Date() ? "active" : "scheduled",
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast.success("Conteúdo atribuído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir conteúdo: ${error.message}`);
    },
  });

  // Update assignment
  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentAssignment> & { id: string }) => {
      const { error } = await supabase
        .from("content_assignments" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast.success("Atribuição atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Complete/cancel assignment
  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AssignmentStatus }) => {
      const { error } = await supabase
        .from("content_assignments" as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["content-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast.success(status === "completed" ? "Atribuição concluída" : "Status atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete assignment
  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("content_assignments" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast.success("Atribuição removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    assignments,
    isLoading,
    createAssignment,
    updateAssignment,
    changeStatus,
    deleteAssignment,
    refetch,
  };
}

/**
 * Hook for users to see their assigned content
 */
export function useMyAssignments(contentType?: ContentType) {
  const { user } = useAuth();

  // Active assignments
  const { data: activeAssignments = [], isLoading: isActiveLoading } = useQuery({
    queryKey: ["my-assignments", "active", user?.id, contentType],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase.rpc("get_user_active_assignments" as any, {
          _user_id: user.id,
        });
        
        if (error) {
          // Function doesn't exist yet
          if (error.code === "42883") return [];
          throw error;
        }
        
        let results = (data || []) as any[];
        if (contentType) {
          results = results.filter((a) => a.content_type === contentType);
        }
        
        return results;
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Assignment history
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["my-assignments", "history", user?.id, contentType],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase.rpc("get_user_assignment_history" as any, {
          _user_id: user.id,
          _content_type: contentType || null,
        });
        
        if (error) {
          if (error.code === "42883") return [];
          throw error;
        }
        return (data || []) as any[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Group history by period
  const historyByPeriod = (history as any[]).reduce((acc: Record<string, any[]>, item: any) => {
    const period = item.period_label || "Outros";
    if (!acc[period]) acc[period] = [];
    acc[period].push(item);
    return acc;
  }, {});

  return {
    activeAssignments,
    history,
    historyByPeriod,
    isLoading: isActiveLoading || isHistoryLoading,
  };
}
