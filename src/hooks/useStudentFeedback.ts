import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StudentFeedback, FeedbackRating, FeedbackSummary, ContentType } from "@/types/personalTrainer";

/**
 * Hook for managing student feedback
 */
export function useStudentFeedback(contentType?: ContentType | "exercise" | "assignment", contentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's feedback for specific content
  const { data: myFeedback, isLoading: isLoadingMy } = useQuery({
    queryKey: ["my-feedback", contentType, contentId, user?.id],
    queryFn: async () => {
      if (!user?.id || !contentType || !contentId) return null;

      const { data, error } = await (supabase as any)
        .from("student_feedback")
        .select("*")
        .eq("user_id", user.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentFeedback | null;
    },
    enabled: !!user?.id && !!contentType && !!contentId,
  });

  // Fetch feedback summary for content
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["feedback-summary", contentType, contentId],
    queryFn: async () => {
      if (!contentType || !contentId) return null;

      const { data, error } = await (supabase as any).rpc("get_content_feedback_summary", {
        p_content_type: contentType,
        p_content_id: contentId,
      });

      if (error) throw error;
      return data as FeedbackSummary;
    },
    enabled: !!contentType && !!contentId,
  });

  // Submit feedback
  const submitFeedback = useMutation({
    mutationFn: async ({
      rating,
      comment,
      difficulty_rating,
      would_recommend,
      assignment_id,
    }: {
      rating: FeedbackRating;
      comment?: string;
      difficulty_rating?: number;
      would_recommend?: boolean;
      assignment_id?: string;
    }) => {
      if (!user?.id || !contentType || !contentId) {
        throw new Error("Missing required fields");
      }

      const { data, error } = await (supabase as any)
        .from("student_feedback")
        .upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            rating,
            comment: comment || null,
            difficulty_rating: difficulty_rating || null,
            would_recommend: would_recommend ?? null,
            assignment_id: assignment_id || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,content_type,content_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as StudentFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feedback", contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: ["feedback-summary", contentType, contentId] });
      toast.success("Feedback enviado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Quick like/dislike
  const quickRate = useMutation({
    mutationFn: async (rating: "like" | "dislike") => {
      if (!user?.id || !contentType || !contentId) {
        throw new Error("Missing required fields");
      }

      const { data, error } = await (supabase as any)
        .from("student_feedback")
        .upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            rating,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,content_type,content_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-feedback", contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: ["feedback-summary", contentType, contentId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    myFeedback,
    summary,
    isLoading: isLoadingMy || isLoadingSummary,
    submitFeedback: submitFeedback.mutate,
    isSubmitting: submitFeedback.isPending,
    quickRate: quickRate.mutate,
    isRating: quickRate.isPending,
  };
}

/**
 * Hook for trainers to view all feedback for their content
 */
export function useTrainerFeedback(contentType?: ContentType, contentId?: string) {
  return useQuery({
    queryKey: ["trainer-feedback", contentType, contentId],
    queryFn: async () => {
      if (!contentType || !contentId) return [];

      const { data, error } = await (supabase as any)
        .from("student_feedback")
        .select(`
          *,
          user:profiles!user_id(id, full_name, avatar_url)
        `)
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contentType && !!contentId,
  });
}

/**
 * Hook for trainers to view all feedback FROM a specific student
 */
export function useStudentFeedbackList(studentId?: string) {
  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ["student-feedback-list", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await (supabase as any)
        .from("student_feedback")
        .select("*")
        .eq("user_id", studentId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data as StudentFeedback[];
    },
    enabled: !!studentId,
  });

  return { feedbackList, isLoading };
}
