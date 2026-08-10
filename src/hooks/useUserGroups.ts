import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserGroup, UserGroupMember, GroupFormData } from "@/types/personalTrainer";

/**
 * Hook for managing user groups (Personal Trainer Mode)
 */
export function useUserGroups() {
  const queryClient = useQueryClient();

  // Fetch all groups (with member count)
  const { data: groups, isLoading } = useQuery({
    queryKey: ["user-groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_groups")
        .select(`
          *,
          user_group_members(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((group: any) => ({
        ...group,
        member_count: group.user_group_members?.[0]?.count || 0,
      })) as UserGroup[];
    },
  });

  // Create group
  const createGroup = useMutation({
    mutationFn: async (formData: GroupFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from("user_groups")
        .insert({
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast.success("Grupo criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  // Update group
  const updateGroup = useMutation({
    mutationFn: async ({ id, ...formData }: GroupFormData & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("user_groups")
        .update({
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast.success("Grupo atualizado!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete group
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("user_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast.success("Grupo removido!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    groups,
    isLoading,
    createGroup: createGroup.mutate,
    isCreating: createGroup.isPending,
    updateGroup: updateGroup.mutate,
    isUpdating: updateGroup.isPending,
    deleteGroup: deleteGroup.mutate,
    isDeleting: deleteGroup.isPending,
  };
}

/**
 * Hook for managing group members
 */
export function useGroupMembers(groupId: string | null) {
  const queryClient = useQueryClient();

  // Fetch members of a group
  const { data: members, isLoading } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await (supabase as any)
        .from("user_group_members")
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .eq("group_id", groupId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return data as UserGroupMember[];
    },
    enabled: !!groupId,
  });

  // Add member to group
  const addMember = useMutation({
    mutationFn: async ({ userId, roleInGroup = "student" }: { userId: string; roleInGroup?: "student" | "assistant" }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("user_group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
          role_in_group: roleInGroup,
          added_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast.success("Membro adicionado!");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Usuário já está no grupo");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Remove member from group
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from("user_group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast.success("Membro removido!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, roleInGroup }: { memberId: string; roleInGroup: "student" | "assistant" }) => {
      const { data, error } = await (supabase as any)
        .from("user_group_members")
        .update({ role_in_group: roleInGroup })
        .eq("id", memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success("Papel atualizado!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    members,
    isLoading,
    addMember: addMember.mutate,
    isAdding: addMember.isPending,
    removeMember: removeMember.mutate,
    isRemoving: removeMember.isPending,
    updateMemberRole: updateMemberRole.mutate,
    isUpdatingRole: updateMemberRole.isPending,
  };
}

/**
 * Hook for getting user's groups (for regular users)
 */
export function useMyGroups() {
  const { data: myGroups, isLoading } = useQuery({
    queryKey: ["my-groups"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("user_group_members")
        .select(`
          *,
          group:user_groups(*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
  });

  return { myGroups, isLoading };
}

/**
 * Hook for getting all groups (for admin/content forms)
 */
export function useAllGroups() {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["all-groups-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_groups")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return { groups, isLoading };
}
