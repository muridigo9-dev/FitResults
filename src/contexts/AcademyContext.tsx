import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// =====================================================
// TYPES
// =====================================================

export type AcademyRole = "owner" | "admin" | "trainer" | "nutritionist" | "student" | "content_creator";

export type AcademyMemberStatus = "active" | "suspended" | "pending";

export interface Academy {
  id: string;
  name: string;
  slug: string;
  owner_id?: string;
  plan_id?: string;
  logo_url?: string;
  primary_color?: string;
  max_trainers: number;
  max_nutritionists: number;
  max_students: number;
  max_content_creators?: number;
  status: "active" | "suspended" | "inactive";
  branding?: any;
  created_at: string;
  updated_at: string;
}

export interface AcademyMember {
  id: string;
  academy_id: string;
  user_id: string;
  role: AcademyRole;
  status: AcademyMemberStatus;
  joined_at: string;
  // Relations
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface AcademyStats {
  total_trainers: number;
  total_nutritionists: number;
  total_students: number;
  total_content_creators: number;
  total_workouts: number;
  total_diets: number;
  total_challenges: number;
  max_trainers: number;
  max_nutritionists: number;
  max_students: number;
}

// =====================================================
// CONTEXT
// =====================================================

interface AcademyContextType {
  // Current academy
  currentAcademy: Academy | null;
  isAcademyLoading: boolean;

  // User's academies (if multi-academy)
  userAcademies: Academy[];

  // User's role in current academy
  userRole: AcademyRole | null;
  userMembership: AcademyMember | null;

  // Academy stats
  academyStats: AcademyStats | null;

  // Permissions
  canInviteTrainers: boolean;
  canInviteNutritionists: boolean;
  canInviteStudents: boolean;
  canManageContent: boolean;
  canViewMembers: boolean;
  canManageAcademy: boolean;
  isAcademyOwner: boolean;
  isAcademyAdmin: boolean;
  isTrainer: boolean;
  isNutritionist: boolean;
  isStudent: boolean;

  // Actions
  switchAcademy: (academyId: string) => Promise<void>;
  refreshAcademy: () => void;
  refreshStats: () => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentAcademyId, setCurrentAcademyId] = useState<string | null>(null);

  // Fetch user's academies
  const { data: userAcademies = [], isLoading: isLoadingAcademies } = useQuery({
    queryKey: ["user-academies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase
        .from("academy_members" as any)
        .select(`
          academy_id,
          role,
          status,
          academies (
            id,
            name,
            slug,
            logo_url,
            max_trainers,
            max_nutritionists,
            max_students,
            status,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active") as any);

      if (error) throw error;

      return ((data || []) as any[])
        .filter((item: any) => item.academies && item.academies.status === "active")
        .map((item: any) => item.academies as Academy);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select first academy if none selected
  useEffect(() => {
    if (userAcademies.length > 0 && !currentAcademyId) {
      setCurrentAcademyId(userAcademies[0].id);
    }
  }, [userAcademies, currentAcademyId]);

  // Fetch current academy details
  const { data: currentAcademy, isLoading: isLoadingCurrentAcademy } = useQuery({
    queryKey: ["academy", currentAcademyId],
    queryFn: async () => {
      if (!currentAcademyId) return null;

      const { data, error } = await (supabase
        .from("academies" as any)
        .select("*")
        .eq("id", currentAcademyId)
        .single() as any);

      if (error) throw error;
      return data as Academy;
    },
    enabled: !!currentAcademyId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's membership in current academy
  const { data: userMembership } = useQuery({
    queryKey: ["academy-membership", currentAcademyId, user?.id],
    queryFn: async () => {
      if (!currentAcademyId || !user?.id) return null;

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
        .eq("academy_id", currentAcademyId)
        .eq("user_id", user.id)
        .single() as any);

      if (error) throw error;
      return data as AcademyMember;
    },
    enabled: !!currentAcademyId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch academy stats
  const { data: academyStats } = useQuery({
    queryKey: ["academy-stats", currentAcademyId],
    queryFn: async () => {
      if (!currentAcademyId) return null;

      const { data, error } = await (supabase.rpc("get_academy_usage_stats" as any, {
        _academy_id: currentAcademyId,
      }) as any);

      if (error) throw error;

      // Convert bigint to number
      const stats = data?.[0];
      if (!stats) return null;

      return {
        total_trainers: Number(stats.total_trainers),
        total_nutritionists: Number(stats.total_nutritionists),
        total_students: Number(stats.total_students),
        total_content_creators: Number(stats.total_content_creators || 0),
        total_workouts: Number(stats.total_workouts || 0),
        total_diets: Number(stats.total_diets || 0),
        total_challenges: Number(stats.total_challenges || 0),
        max_trainers: Number(stats.max_trainers),
        max_nutritionists: Number(stats.max_nutritionists),
        max_students: Number(stats.max_students),
      } as AcademyStats;
    },
    enabled: !!currentAcademyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Compute permissions based on role
  const userRole = userMembership?.role || null;
  const isAcademyOwner = userRole === "owner" || (currentAcademy?.owner_id === user?.id);
  const isAcademyAdmin = userRole === "owner" || userRole === "admin";
  const isTrainer = userRole === "trainer";
  const isNutritionist = userRole === "nutritionist";
  const isStudent = userRole === "student";

  const permissions = useMemo(() => ({
    canInviteTrainers: isAcademyAdmin,
    canInviteNutritionists: isAcademyAdmin,
    canInviteStudents: isAcademyAdmin || isTrainer || isNutritionist,
    canManageContent: isAcademyAdmin || isTrainer || isNutritionist || userRole === "content_creator",
    canViewMembers: isAcademyAdmin || isTrainer || isNutritionist,
    canManageAcademy: isAcademyAdmin,
  }), [isAcademyAdmin, isTrainer, isNutritionist, userRole]);

  // Actions
  const switchAcademy = async (academyId: string) => {
    if (!userAcademies.find(a => a.id === academyId)) {
      toast.error("Você não tem acesso a esta academia");
      return;
    }
    setCurrentAcademyId(academyId);
    queryClient.invalidateQueries({ queryKey: ["branding"] });
    toast.success("Academia alterada");
  };

  const refreshAcademy = () => {
    queryClient.invalidateQueries({ queryKey: ["academy", currentAcademyId] });
    queryClient.invalidateQueries({ queryKey: ["user-academies", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["academy-membership", currentAcademyId, user?.id] });
  };

  const refreshStats = () => {
    queryClient.invalidateQueries({ queryKey: ["academy-stats", currentAcademyId] });
  };

  const isAcademyLoading = isLoadingAcademies || isLoadingCurrentAcademy;

  return (
    <AcademyContext.Provider
      value={{
        currentAcademy,
        isAcademyLoading,
        userAcademies,
        userRole,
        userMembership,
        academyStats,
        canInviteTrainers: permissions.canInviteTrainers,
        canInviteNutritionists: permissions.canInviteNutritionists,
        canInviteStudents: permissions.canInviteStudents,
        canManageContent: permissions.canManageContent,
        canViewMembers: permissions.canViewMembers,
        canManageAcademy: permissions.canManageAcademy,
        isAcademyOwner,
        isAcademyAdmin,
        isTrainer,
        isNutritionist,
        isStudent,
        switchAcademy,
        refreshAcademy,
        refreshStats,
      }}
    >
      {children}
    </AcademyContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useAcademy() {
  const context = useContext(AcademyContext);
  if (context === undefined) {
    throw new Error("useAcademy must be used within an AcademyProvider");
  }
  return context;
}
