import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Challenge } from "@/types/challenges";
import { toast } from "sonner";
// import { useUnifiedVisibility } from "./useUnifiedVisibility";

async function fetchChallenges(): Promise<Challenge[]> {
    const { data, error } = await supabase
        .from("challenges")
        .select(`
            *,
            days:challenge_days(
                *,
                tasks:challenge_tasks(*)
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching challenges:", error);
        toast.error("Erro ao carregar desafios: " + error.message);
        throw error;
    }

    return (data || []).map(challenge => {
        const safeChallenge = challenge as any;

        if (safeChallenge.days) {
            safeChallenge.days.sort((a: any, b: any) => a.day_number - b.day_number);
            safeChallenge.days.forEach((day: any) => {
                if (day.tasks) {
                    day.tasks.sort((a: any, b: any) => a.order_index - b.order_index);
                }
            });
        }

        // Map visibility fields from DB to Frontend Types
        safeChallenge.visibilityType = safeChallenge.visibility || 'global';
        safeChallenge.planIds = safeChallenge.plan_ids || [];

        return safeChallenge as Challenge;
    });
}

export function useAdminChallenges() {
    const queryClient = useQueryClient();
    // const { saveVisibilityConfig } = useUnifiedVisibility();

    const challengesQuery = useQuery({
        queryKey: ["admin-challenges"],
        queryFn: fetchChallenges,
        staleTime: 0, // DISABLED CACHE
    });

    // Save Challenge
    const saveChallengeMutation = useMutation({
        mutationFn: async ({ id, data }: { id?: string; data: any }) => {
            // 1. Save main challenge data
            const challengePayload = {
                name: data.name,
                description: data.description,
                cover_url: data.cover_url,
                duration_days: data.duration_days,
                is_active: data.is_active ?? true,
                visibility: data.visibilityType || 'global',
                plan_ids: data.planIds || [],
                created_by_type: 'admin' // Force explicit valid role
            };

            let challengeId = id;
            if (id) {
                const { error } = await supabase
                    .from("challenges")
                    .update(challengePayload)
                    .eq("id", id);
                if (error) throw error;
            } else {
                const { data: result, error } = await supabase
                    .from("challenges")
                    .insert(challengePayload)
                    .select()
                    .single();
                if (error) throw error;
                challengeId = result.id;
            }

            if (!challengeId) throw new Error("Failed to get challenge ID");

            // 2. Handle Days and Tasks
            if (id) {
                // Delete existing days (cascades to tasks)
                await supabase.from("challenge_days").delete().eq("challenge_id", id);
            }

            // Insert days and tasks
            if (data.days && data.days.length > 0) {
                for (const day of data.days) {
                    const { data: newDay, error: dayError } = await supabase
                        .from("challenge_days")
                        .insert({
                            challenge_id: challengeId,
                            day_number: day.day_number,
                            title: day.title,
                            description: day.description,
                        })
                        .select()
                        .single();

                    if (dayError) throw dayError;

                    // Insert tasks for this day
                    if (day.tasks && day.tasks.length > 0) {
                        await supabase.from("challenge_tasks").insert(
                            day.tasks.map((task: any) => ({
                                challenge_day_id: newDay.id,
                                type: task.type,
                                title: task.title,
                                description: task.description,
                                target_value: task.target_value,
                                target_unit: task.target_unit,
                                xp_reward: task.xp_reward,
                                order_index: task.order_index,
                                config: task.config || {},
                            }))
                        );
                    }
                }
            }

            // REMOVED REDUNDANT saveVisibilityConfig call

            return challengeId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
            toast.success("Desafio salvo com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao salvar desafio: " + error.message);
        }
    });

    // Toggle Active
    const toggleChallengeMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from("challenges")
                .update({ is_active: isActive })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
            toast.success("Status atualizado!");
        },
    });

    // Delete Challenge
    const deleteChallengeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("challenges")
                .update({ is_active: false })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
            toast.success("Desafio removido!");
        },
        onError: (error: any) => {
            toast.error("Erro ao remover: " + error.message);
        }
    });

    return {
        challenges: challengesQuery.data || [],
        isLoading: challengesQuery.isLoading,
        saveChallenge: (id: string | undefined, data: any) => saveChallengeMutation.mutateAsync({ id, data }),
        toggleActive: (id: string, isActive: boolean) => toggleChallengeMutation.mutateAsync({ id, isActive }),
        deleteChallenge: (id: string) => deleteChallengeMutation.mutateAsync(id),
    };
}
