/**
 * Simplified Unified Visibility Hook
 * Saves and retrieves visibility and plan_ids from main tables.
 */

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type EntityType = 'exercise' | 'workout' | 'dish' | 'diet_plan' | 'challenge';
export type VisibilityType = 'global' | 'academy' | 'private' | 'plan_restricted';

export interface VisibilityConfig {
    visibilityType: VisibilityType;
    planIds?: string[];
    academyId?: string;
    ownerId?: string;
}

export interface Plan {
    id: string;
    name: string;
    description?: string;
    price?: number;
    interval?: string;
}

export function useUnifiedVisibility() {
    const queryClient = useQueryClient();

    // Fetch available plans
    const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('plans')
                .select('id, name, description')
                .order('name');

            if (error) throw error;
            return (data || []) as Plan[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Get visibility config for an entity
    const getVisibilityConfig = async (
        entityType: EntityType,
        entityId: string
    ): Promise<VisibilityConfig | null> => {
        const mainTable = getMainTableName(entityType);

        try {
            const { data: entity, error } = await (supabase as any)
                .from(mainTable)
                .select('visibility, plan_ids') // Simplified: select columns directly
                .eq('id', entityId)
                .single();

            if (error) throw error;
            if (!entity) return null;

            return {
                visibilityType: entity.visibility || 'global',
                planIds: entity.plan_ids || [],
            };
        } catch (error) {
            console.error('Error fetching visibility config:', error);
            return null;
        }
    };

    // Save visibility config
    const saveVisibilityMutation = useMutation({
        mutationFn: async ({
            entityType,
            entityId,
            config
        }: {
            entityType: EntityType;
            entityId: string;
            config: VisibilityConfig;
        }) => {
            const mainTable = getMainTableName(entityType);

            // Update visibility and plan_ids in main table
            const { error } = await (supabase as any)
                .from(mainTable)
                .update({
                    visibility: config.visibilityType,
                    plan_ids: config.planIds || []
                })
                .eq('id', entityId);

            if (error) {
                console.error('Error saving visibility:', error);
                throw error;
            }

            return { success: true };
        },
        onSuccess: (_, variables) => {
            toast.success('Visibilidade atualizada!');
            // Invalidate specific entity queries
            queryClient.invalidateQueries({
                queryKey: [getQueryKey(variables.entityType)]
            });
        },
        onError: (error) => {
            console.error('Error saving visibility:', error);
            toast.error('Erro ao atualizar visibilidade');
        }
    });

    return {
        plans,
        isLoadingPlans,
        getVisibilityConfig,
        saveVisibilityConfig: saveVisibilityMutation.mutateAsync,
        isSavingVisibility: saveVisibilityMutation.isPending,
    };
}

function getMainTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
        exercise: 'exercises',
        workout: 'workouts',
        dish: 'dishes',
        diet_plan: 'diet_plans',
        challenge: 'challenges'
    };
    return tableMap[entityType];
}

function getQueryKey(entityType: EntityType): string {
    const keyMap: Record<EntityType, string> = {
        exercise: 'exercises',
        workout: 'workouts',
        dish: 'dishes',
        diet_plan: 'diet-plans',
        challenge: 'challenges'
    };
    return keyMap[entityType];
}
