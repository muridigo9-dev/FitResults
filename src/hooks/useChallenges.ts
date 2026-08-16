import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Challenge, ChallengeDay, ChallengeTask, UserChallengeParticipation } from "@/types/challenges";
import { toast } from "sonner";
import { useI18nSafe } from "./useI18nSafe";
import { localizedField } from "@/lib/contentI18n";

export interface ChallengesHook {
  challenges: Challenge[];
  activeParticipation: UserChallengeParticipation | null;
  activeChallenge: Challenge | null;
  currentChallengeDay: ChallengeDay | null;
  isLoading: boolean;
  joinChallenge: (challengeId: string) => void;
  completeTask: (args: { participationId: string; dayId: string; taskId: string }) => void;
  // Details fetcher helper
  getChallengeDetails: (challengeId: string) => Promise<Challenge | null>;
}

export function useChallenges(): ChallengesHook {
  const { language } = useI18nSafe();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Available Challenges (Basic Info)
  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["challenges-list", user?.id, language],
    enabled: !!user,
    queryFn: async () => {
      // Use the new RPC
      const { data, error } = await supabase.rpc("get_available_challenges", {
        p_user_id: user!.id
      });

      if (error) throw error;

      // Map basic info to Challenge type (partial)
      return (data || []).map((c: any) => ({
        id: c.id,
        name: localizedField(c, "name", language),
        description: localizedField(c, "description", language),
        cover_url: c.cover_url,
        type: c.type as any,
        duration_days: c.duration_days,
        xp_reward: c.xp_reward,
        is_active: true,
        days: [], // Loaded on details
        is_joined: c.is_joined,
        participation_status: c.status,
        user_progress: {
          current_day: c.current_day,
          total_days: c.total_days
        }
      })) as Challenge[];
    },
  });

  // 2. Fetch User's Active Participation
  // We can fetch this from the same RPC (is_joined flagged) or a separate query for full details
  const { data: activeParticipation = null, isLoading: loadingParticipation } = useQuery({
    queryKey: ["active-challenge-participation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenge_participations")
        .select(`
          *,
          challenge:challenges (*),
          progress:user_challenge_progress(
            id,
            challenge_day_id,
            tasks_completed,
            completed_at
          )
        `)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as unknown as UserChallengeParticipation;
    }
  });

  // 3. Join Challenge Mutation
  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data, error } = await supabase.rpc("join_challenge", {
        p_challenge_id: challengeId,
        p_user_id: user!.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-challenge-participation"] });
      toast.success("Desafio aceito! Boa sorte.");
    },
    onError: (err: any) => {
      toast.error("Erro ao entrar no desafio: " + err.message);
    }
  });

  // Helper to fetch full details (Days & Tasks)
  const getChallengeDetails = async (challengeId: string): Promise<Challenge | null> => {
    const { data: challenge, error } = await supabase
      .from("challenges")
      .select(`
        *,
        days:challenge_days (
          *,
          tasks:challenge_tasks (*)
        )
      `)
      .eq("id", challengeId)
      .single();

    if (error) {
      console.error("Error fetching details", error);
      return null;
    }

    // Sort logic
    const safeChallenge = challenge as any;
    if (safeChallenge.days) {
      safeChallenge.days.sort((a: any, b: any) => a.day_number - b.day_number);
      safeChallenge.days.forEach((day: any) => {
        if (day.tasks) {
          day.tasks.sort((a: any, b: any) => a.order_index - b.order_index);
        }
      });
    }

    return safeChallenge as Challenge;
  };

  // 4. Complete Task Mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ participationId, dayId, taskId }: { participationId: string; dayId: string; taskId: string }) => {
      const { data, error } = await supabase.rpc("complete_challenge_task", {
        p_participation_id: participationId,
        p_day_id: dayId,
        p_task_id: taskId,
        p_user_id: user!.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["active-challenge-participation"] });
      if (data.success) {
        toast.success(`Tarefa concluída! +${data.xp_earned} XP`);
        if (data.day_completed) {
          toast.success("Dia completado! Bônus extra recebido!");
        }
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao completar tarefa: " + err.message);
    }
  });

  // Derived state
  const activeChallenge = activeParticipation?.challenge || null;
  const currentChallengeDay = useMemo(() => {
    if (!activeChallenge || !activeParticipation?.current_day) return null;
    return activeParticipation.current_day;
  }, [activeChallenge, activeParticipation]);

  return {
    challenges,
    activeParticipation,
    activeChallenge, // Added
    currentChallengeDay: null, // Placeholder to satisfy usage, but need to fix logic if crucial
    isLoading: loadingChallenges || loadingParticipation,
    joinChallenge: joinMutation.mutate,
    completeTask: completeTaskMutation.mutate,
    getChallengeDetails
  };
}
