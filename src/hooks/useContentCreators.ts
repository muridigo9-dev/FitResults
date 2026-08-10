import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContentCreatorPermissions } from "@/types/personalTrainer";

interface ContentCreatorWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  permissions: ContentCreatorPermissions | null;
}

/**
 * Hook for managing content creators (admin only)
 */
export function useContentCreators() {
  const queryClient = useQueryClient();

  // Fetch all content creators with their permissions
  const { data: creators, isLoading } = useQuery({
    queryKey: ["content-creators"],
    queryFn: async () => {
      // Get all users with content_creator role
      const { data: roleData, error: roleError } = await (supabase as any)
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id(id, email, full_name, created_at)
        `)
        .eq("role", "content_creator");

      if (roleError) throw roleError;

      // Get permissions for each creator
      const creatorIds = roleData?.map((r: any) => r.user_id) || [];
      
      if (creatorIds.length === 0) return [];

      const { data: permissions, error: permError } = await (supabase as any)
        .from("content_creator_permissions")
        .select("*")
        .in("user_id", creatorIds);

      if (permError) throw permError;

      // Merge data
      return roleData.map((r: any) => ({
        id: r.profiles.id,
        email: r.profiles.email,
        full_name: r.profiles.full_name,
        created_at: r.profiles.created_at,
        permissions: permissions?.find((p: any) => p.user_id === r.user_id) || null,
      })) as ContentCreatorWithProfile[];
    },
  });

  // Promote user to content creator
  const promoteToCreator = useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions?: Partial<ContentCreatorPermissions>;
    }) => {
      // Add content_creator role
      const { error: roleError } = await (supabase as any)
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "content_creator",
        }, {
          onConflict: "user_id,role",
        });

      if (roleError) throw roleError;

      // Create default permissions
      const { error: permError } = await (supabase as any)
        .from("content_creator_permissions")
        .upsert({
          user_id: userId,
          can_create_diets: permissions?.can_create_diets ?? true,
          can_create_workouts: permissions?.can_create_workouts ?? true,
          can_create_challenges: permissions?.can_create_challenges ?? true,
          can_create_habits: permissions?.can_create_habits ?? true,
          allowed_group_ids: permissions?.allowed_group_ids ?? [],
        }, {
          onConflict: "user_id",
        });

      if (permError) throw permError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-creators"] });
      toast.success("Usuário promovido a Criador de Conteúdo!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update content creator permissions
  const updatePermissions = useMutation({
    mutationFn: async ({ userId, ...permissions }: Partial<ContentCreatorPermissions> & { userId: string }) => {
      const { data, error } = await (supabase as any)
        .from("content_creator_permissions")
        .update({
          can_create_diets: permissions.can_create_diets,
          can_create_workouts: permissions.can_create_workouts,
          can_create_challenges: permissions.can_create_challenges,
          can_create_habits: permissions.can_create_habits,
          allowed_group_ids: permissions.allowed_group_ids,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-creators"] });
      toast.success("Permissões atualizadas!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Remove content creator role
  const removeCreatorRole = useMutation({
    mutationFn: async (userId: string) => {
      // Remove role
      const { error: roleError } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "content_creator");

      if (roleError) throw roleError;

      // Remove permissions
      const { error: permError } = await (supabase as any)
        .from("content_creator_permissions")
        .delete()
        .eq("user_id", userId);

      if (permError) throw permError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-creators"] });
      toast.success("Permissão de criador removida!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    creators,
    isLoading,
    promoteToCreator: promoteToCreator.mutate,
    isPromoting: promoteToCreator.isPending,
    updatePermissions: updatePermissions.mutate,
    isUpdating: updatePermissions.isPending,
    removeCreatorRole: removeCreatorRole.mutate,
    isRemoving: removeCreatorRole.isPending,
  };
}

/**
 * Hook for content creators to get their own permissions
 */
export function useMyCreatorPermissions() {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ["my-creator-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("content_creator_permissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ContentCreatorPermissions | null;
    },
  });

  return { permissions, isLoading };
}
