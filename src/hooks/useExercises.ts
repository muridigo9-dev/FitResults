import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Exercise,
  MuscleGroup,
} from "@/types/content";
import {
  ExerciseFilters,
  ExerciseFormData,
} from "@/types/workout";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { useI18nSafe } from "./useI18nSafe";
import { localizedField } from "@/lib/contentI18n";
import type { BlockReason } from "./useUserCapabilities";
// import { useUnifiedVisibility } from "./useUnifiedVisibility"; // Removed redundancy

// ============================================
// MUSCLE GROUPS HOOK
// ============================================

export function useMuscleGroups() {
  const { user } = useAuth();
  const { language } = useI18nSafe();

  const { data: muscleGroups = [], isLoading, error } = useQuery({
    queryKey: ["muscle-groups", user?.id, language],
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes (rarely changes)
    queryFn: async () => {
      const { data, error } = await supabase
        .from("muscle_groups")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Cast to any to bypass inferred type limitations
      const typedData = (data || []) as any[];

      return typedData.map((mg): MuscleGroup => ({
        id: mg.id,
        name: localizedField(mg, "name", language),
        slug: mg.slug || mg.name.toLowerCase().replace(/\s+/g, '-'),
        nameEn: mg.name_en,
        category: mg.category as MuscleGroup['category'],
        description: mg.description,
        imageUrl: mg.image_url || (mg.image_path ? supabase.storage.from('muscle-groups').getPublicUrl(mg.image_path).data.publicUrl : undefined),
        imagePath: mg.image_path,
        gifUrl: mg.gif_url,
        icon: mg.icon,
        sortOrder: mg.sort_order || 0,
        isActive: mg.is_active ?? true,
        createdByType: (mg.created_by_type || 'admin') as any,
        createdById: mg.created_by_id,
        academyId: mg.academy_id,
      }));
    },
  });

  // Group by category
  const groupedMuscleGroups = {
    upper: muscleGroups.filter(mg => mg.category === 'upper'),
    lower: muscleGroups.filter(mg => mg.category === 'lower'),
    core: muscleGroups.filter(mg => mg.category === 'core'),
    full: muscleGroups.filter(mg => mg.category === 'full'),
  };

  return {
    muscleGroups,
    groupedMuscleGroups,
    isLoading,
    error,
    getMuscleGroupById: (id: string) => muscleGroups.find(mg => mg.id === id),
    getMuscleGroupBySlug: (slug: string) => muscleGroups.find(mg => mg.slug === slug),
  };
}

// ============================================
// EXERCISES HOOK
// ============================================

export function useExercises(filters?: ExerciseFilters) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isEnabled } = useFeatureFlag('exercises_enabled');
  const { language } = useI18nSafe();

  // Fetch exercises
  const { data: exercises = [], isLoading, error, refetch } = useQuery({
    queryKey: ["exercises", user?.id, filters, language],
    enabled: !!user && isEnabled,
    staleTime: 0, // DISABLED CACHE for Admin immediate updates
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select(`
          *,
          primary_muscle_group:muscle_groups!primary_muscle_group_id(*)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      // Apply filters
      if (filters?.muscleGroupId) {
        query = query.eq("primary_muscle_group_id", filters.muscleGroupId);
      }
      if (filters?.equipment) {
        query = query.eq("equipment", filters.equipment);
      }
      if (filters?.difficulty) {
        query = query.eq("difficulty", filters.difficulty);
      }
      if (filters?.isCompound !== undefined) {
        query = query.eq("is_compound", filters.isCompound);
      }
      if (filters?.search) {
        // Search every language, so an English or Spanish name finds the
        // exercise even though the base column is pt-BR. Commas and parens
        // would break PostgREST's or() syntax.
        const term = filters.search.replace(/[,()]/g, " ").trim();
        query = query.or(
          `name.ilike.%${term}%,name_en.ilike.%${term}%,name_es.ilike.%${term}%`
        );
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains("tags", filters.tags);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Cast to any to access new columns
      const typedData = data as any[];

      return (typedData || []).map((ex): Exercise => ({
        id: ex.id,
        name: localizedField(ex, "name", language),
        slug: ex.slug || ex.name.toLowerCase().replace(/\s+/g, '-'),
        description: localizedField(ex, "description", language),
        instructions: localizedField(ex, "instructions", language),
        imageUrl: ex.image_url || (ex.image_path ? supabase.storage.from('exercises-media').getPublicUrl(ex.image_path).data.publicUrl : undefined),
        imagePath: ex.image_path,
        gifUrl: ex.gif_url,
        videoUrl: ex.video_url,
        thumbnailUrl: ex.thumbnail_url,
        primaryMuscleGroupId: ex.primary_muscle_group_id,
        primaryMuscleGroup: ex.primary_muscle_group ? {
          id: ex.primary_muscle_group.id,
          name: localizedField(ex.primary_muscle_group, "name", language),
          slug: ex.primary_muscle_group.slug,
          category: ex.primary_muscle_group.category,
          sortOrder: ex.primary_muscle_group.sort_order || 0,
          isActive: true,
          createdByType: 'admin' as any,
          imageUrl: ex.primary_muscle_group.image_url || (ex.primary_muscle_group.image_path ? supabase.storage.from('muscle-groups').getPublicUrl(ex.primary_muscle_group.image_path).data.publicUrl : undefined),
        } : undefined,
        equipment: ex.equipment || 'none',
        difficulty: ex.difficulty || 'intermediate',
        sets: ex.default_sets || 3,
        reps: ex.default_reps || '12',
        restSeconds: ex.default_rest_seconds || 60,
        order: 0,

        createdByType: ex.created_by_type || 'admin',
        createdById: ex.created_by_id,
        academyId: ex.academy_id,

        isCompound: ex.is_compound ?? false,
        tags: ex.tags || [],
        metadata: ex.metadata,
        createdAt: ex.created_at,
        updatedAt: ex.updated_at,

        // Correct Visibility Mapping
        visibilityType: ex.visibility || 'global',
        planIds: ex.plan_ids || [],
      }));
    },
  });

  // Create exercise
  const createExerciseMutation = useMutation({
    mutationFn: async (data: ExerciseFormData & { visibilityType?: string; planIds?: string[] }) => {
      const slug = data.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { data: result, error } = await supabase
        .from("exercises")
        .insert({
          name: data.name,
          slug,
          description: data.description,
          instructions: data.instructions,
          primary_muscle_group_id: data.primaryMuscleGroupId,
          equipment: data.equipment,
          difficulty: data.difficulty,
          default_sets: data.defaultSets,
          default_reps: data.defaultReps,
          default_rest_seconds: data.defaultRestSeconds,
          default_tempo: data.defaultTempo,
          image_url: data.imageUrl,
          video_url: data.videoUrl,
          tags: data.tags,
          is_compound: data.isCompound,
          created_by_id: user?.id,
          created_by_type: 'admin' as any,

          // Direct Visibility Save
          visibility: data.visibilityType || 'global',
          plan_ids: data.planIds || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Save muscle groups
      if (result && data.muscleGroupIds && data.muscleGroupIds.length > 0) {
        await (supabase as any)
          .from("exercise_muscle_groups")
          .insert(
            data.muscleGroupIds.map((mgId: string) => ({
              exercise_id: result.id,
              muscle_group_id: mgId
            }))
          );
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast({
        title: "Exercício criado",
        description: "O exercício foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update exercise
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExerciseFormData> & { visibilityType?: string; planIds?: string[] } }) => {
      const { data: result, error } = await supabase
        .from("exercises")
        .update({
          name: data.name,
          description: data.description,
          instructions: data.instructions,
          primary_muscle_group_id: data.primaryMuscleGroupId,
          equipment: data.equipment,
          difficulty: data.difficulty,
          default_sets: data.defaultSets,
          default_reps: data.defaultReps,
          default_rest_seconds: data.defaultRestSeconds,
          default_tempo: data.defaultTempo,
          image_url: data.imageUrl,
          video_url: data.videoUrl,
          tags: data.tags,
          is_compound: data.isCompound,

          // Direct update to simplified columns
          visibility: data.visibilityType,
          plan_ids: data.planIds,

          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["exercise"] }); // Also invalidate single
      toast({
        title: "Exercício atualizado",
        description: "O exercício foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete exercise
  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("exercises")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast({
        title: "Exercício removido",
        description: "O exercício foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover exercício",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group exercises by muscle group
  const exercisesByMuscleGroup = exercises.reduce((acc, ex) => {
    const key = ex.primaryMuscleGroupId || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  // Determine block reason
  const blockReason: BlockReason = !user
    ? "not_authenticated"
    : !isEnabled
      ? "feature_disabled"
      : null;

  return {
    exercises,
    exercisesByMuscleGroup,
    isLoading,
    error,
    refetch,
    createExercise: createExerciseMutation.mutate,
    updateExercise: updateExerciseMutation.mutate,
    deleteExercise: deleteExerciseMutation.mutate,
    isCreating: createExerciseMutation.isPending,
    isUpdating: updateExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
    getExerciseById: (id: string) => exercises.find(ex => ex.id === id),
    blockReason,
    featureEnabled: isEnabled,
  };
}

// ============================================
// SINGLE EXERCISE HOOK
// ============================================

export function useExercise(id: string | undefined) {
  const { user } = useAuth();
  const { language } = useI18nSafe();

  return useQuery({
    queryKey: ["exercise", id, language],
    enabled: !!user && !!id,
    staleTime: 0, // DISABLED CACHE
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("exercises")
        .select(`
          *,
          primary_muscle_group:muscle_groups!primary_muscle_group_id(*),
          secondary_muscles:exercise_secondary_muscles(
            muscle_group:muscle_groups(*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return null;

      const typedData = data as any;

      const exercise: Exercise = {
        id: typedData.id,
        name: localizedField(typedData, "name", language),
        slug: typedData.slug,
        description: localizedField(typedData, "description", language),
        instructions: localizedField(typedData, "instructions", language),
        imageUrl: typedData.image_url || (typedData.image_path ? supabase.storage.from('exercises-media').getPublicUrl(typedData.image_path).data.publicUrl : undefined),
        imagePath: typedData.image_path,
        gifUrl: typedData.gif_url,
        videoUrl: typedData.video_url,
        thumbnailUrl: typedData.thumbnail_url,
        primaryMuscleGroupId: typedData.primary_muscle_group_id,
        primaryMuscleGroup: typedData.primary_muscle_group ? {
          id: typedData.primary_muscle_group.id,
          name: localizedField(typedData.primary_muscle_group, "name", language),
          slug: typedData.primary_muscle_group.slug,
          category: typedData.primary_muscle_group.category as MuscleGroup['category'],
          sortOrder: typedData.primary_muscle_group.sort_order || 0,
          isActive: true,
          createdByType: 'admin' as any,
          imageUrl: typedData.primary_muscle_group.image_url || (typedData.primary_muscle_group.image_path ? supabase.storage.from('muscle-groups').getPublicUrl(typedData.primary_muscle_group.image_path).data.publicUrl : undefined),
        } : undefined,
        secondaryMuscleGroups: typedData.secondary_muscles?.map((sm: any) => ({
          id: sm.muscle_group.id,
          name: localizedField(sm.muscle_group, "name", language),
          slug: sm.muscle_group.slug,
          category: sm.muscle_group.category as MuscleGroup['category'],
          sortOrder: sm.muscle_group.sort_order || 0,
          isActive: true,
          createdByType: 'admin' as any,
          imageUrl: sm.muscle_group.image_url || (sm.muscle_group.image_path ? supabase.storage.from('muscle-groups').getPublicUrl(sm.muscle_group.image_path).data.publicUrl : undefined),
        })),
        equipment: typedData.equipment || 'none',
        difficulty: typedData.difficulty || 'intermediate',
        sets: typedData.default_sets || 3,
        reps: typedData.default_reps || '12',
        restSeconds: typedData.default_rest_seconds || 60,
        order: 0, // Default for standalone view

        createdByType: typedData.created_by_type || 'admin',
        createdById: typedData.created_by_id,
        academyId: typedData.academy_id,

        isCompound: typedData.is_compound ?? false,
        tags: typedData.tags || [],
        metadata: typedData.metadata,
        createdAt: typedData.created_at,
        updatedAt: typedData.updated_at,

        // Correct Visibility Mapping for Single Fetch
        visibilityType: typedData.visibility || 'global',
        planIds: typedData.plan_ids || [],
      };

      return exercise;
    },
  });
}
