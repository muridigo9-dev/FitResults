import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AcademyMember, AcademyRole, AcademyMemberStatus } from "@/contexts/AcademyContext";

// =====================================================
// TYPES
// =====================================================

export interface MemberWithDetails extends AcademyMember {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
  // Stats (if student)
  total_workouts?: number;
  total_checkins?: number;
  last_checkin?: string;
}

export interface UpdateMemberPayload {
  memberId: string;
  role?: AcademyRole;
  status?: AcademyMemberStatus;
}

// =====================================================
// FETCH MEMBERS
// =====================================================

export function useAcademyMembers(academyId?: string, role?: AcademyRole) {
  return useQuery({
    queryKey: ["academy-members", academyId, role],
    queryFn: async () => {
      if (!academyId) return [];

      let query = (supabase
        .from("academy_members" as any)
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq("academy_id", academyId)
        .eq("status", "active")
        .order("joined_at", { ascending: false }) as any);

      if (role) {
        query = query.eq("role", role);
      }

      const { data, error } = await query;

      if (error) throw error;

      return ((data || []) as any[]).map((member: any) => ({
        ...member,
        user: member.profiles,
      })) as MemberWithDetails[];
    },
    enabled: !!academyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// =====================================================
// FETCH SINGLE MEMBER
// =====================================================

export function useAcademyMember(academyId?: string, userId?: string) {
  return useQuery({
    queryKey: ["academy-member", academyId, userId],
    queryFn: async () => {
      if (!academyId || !userId) return null;

      const { data, error } = await (supabase
        .from("academy_members" as any)
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq("academy_id", academyId)
        .eq("user_id", userId)
        .single() as any);

      if (error) throw error;

      return {
        ...(data as any),
        user: (data as any).profiles,
      } as MemberWithDetails;
    },
    enabled: !!academyId && !!userId,
  });
}

// =====================================================
// FETCH TRAINERS (for student assignment)
// =====================================================

export function useAcademyTrainers(academyId?: string) {
  return useQuery({
    queryKey: ["academy-trainers", academyId],
    queryFn: async () => {
      if (!academyId) return [];

      const { data, error } = await (supabase
        .from("academy_members" as any)
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("academy_id", academyId)
        .eq("role", "trainer")
        .eq("status", "active")
        .order("joined_at", { ascending: false }) as any);

      if (error) throw error;

      return ((data || []) as any[]).map((member: any) => ({
        ...member,
        user: member.profiles,
      })) as MemberWithDetails[];
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// FETCH NUTRITIONISTS
// =====================================================

export function useAcademyNutritionists(academyId?: string) {
  return useQuery({
    queryKey: ["academy-nutritionists", academyId],
    queryFn: async () => {
      if (!academyId) return [];

      const { data, error } = await (supabase
        .from("academy_members" as any)
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("academy_id", academyId)
        .eq("role", "nutritionist")
        .eq("status", "active")
        .order("joined_at", { ascending: false }) as any);

      if (error) throw error;

      return ((data || []) as any[]).map((member: any) => ({
        ...member,
        user: member.profiles,
      })) as MemberWithDetails[];
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// FETCH STUDENTS (with stats)
// =====================================================

export function useAcademyStudents(academyId?: string) {
  return useQuery({
    queryKey: ["academy-students", academyId],
    queryFn: async () => {
      if (!academyId) return [];

      const { data, error } = await (supabase
        .from("academy_members" as any)
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq("academy_id", academyId)
        .eq("role", "student")
        .eq("status", "active")
        .order("joined_at", { ascending: false }) as any);

      if (error) throw error;

      // Fetch stats for each student (parallel)
      const membersWithStats = await Promise.all(
        ((data || []) as any[]).map(async (member: any) => {
          // Get workout count
          const { count: workoutCount } = await (supabase
            .from("user_workout_history" as any)
            .select("*", { count: "exact", head: true })
            .eq("user_id", member.user_id) as any);

          // Get checkin count and last checkin
          const { data: checkins, count: checkinCount } = await (supabase
            .from("checkins" as any)
            .select("created_at", { count: "exact" })
            .eq("user_id", member.user_id)
            .order("created_at", { ascending: false })
            .limit(1) as any);

          return {
            ...member,
            user: member.profiles,
            total_workouts: workoutCount || 0,
            total_checkins: checkinCount || 0,
            last_checkin: checkins?.[0]?.created_at,
          };
        })
      );

      return membersWithStats as MemberWithDetails[];
    },
    enabled: !!academyId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// =====================================================
// UPDATE MEMBER
// =====================================================

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role, status }: UpdateMemberPayload) => {
      const updates: any = {};
      if (role) updates.role = role;
      if (status) updates.status = status;

      const { error } = await (supabase
        .from("academy_members" as any)
        .update(updates)
        .eq("id", memberId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["academy-members"] });
      queryClient.invalidateQueries({ queryKey: ["academy-member"] });
      queryClient.invalidateQueries({ queryKey: ["academy-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar membro", {
        description: error.message,
      });
    },
  });
}

// =====================================================
// REMOVE MEMBER
// =====================================================

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      // Soft delete: change status to suspended
      const { error } = await (supabase
        .from("academy_members" as any)
        .update({ status: "suspended" as AcademyMemberStatus })
        .eq("id", memberId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido da academia");
      queryClient.invalidateQueries({ queryKey: ["academy-members"] });
      queryClient.invalidateQueries({ queryKey: ["academy-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover membro", {
        description: error.message,
      });
    },
  });
}

// =====================================================
// REACTIVATE MEMBER
// =====================================================

export function useReactivateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase
        .from("academy_members" as any)
        .update({ status: "active" as AcademyMemberStatus })
        .eq("id", memberId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro reativado");
      queryClient.invalidateQueries({ queryKey: ["academy-members"] });
      queryClient.invalidateQueries({ queryKey: ["academy-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao reativar membro", {
        description: error.message,
      });
    },
  });
}

// =====================================================
// ASSIGN TRAINER TO STUDENT
// =====================================================

export function useAssignTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, trainerId }: { studentId: string; trainerId: string }) => {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from("trainer_students")
        .select("id, status")
        .eq("student_id", studentId)
        .eq("trainer_id", trainerId)
        .single();

      if (existing) {
        // Update existing relationship
        const { error } = await supabase
          .from("trainer_students")
          .update({ status: "active" })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from("trainer_students")
          .insert({
            student_id: studentId,
            trainer_id: trainerId,
            status: "active",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Trainer atribuído ao aluno!");
      queryClient.invalidateQueries({ queryKey: ["trainer-students"] });
      queryClient.invalidateQueries({ queryKey: ["academy-students"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atribuir trainer", {
        description: error.message,
      });
    },
  });
}
