import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "moderator" | "content_creator" | "personal_trainer" | "academy_admin" | "aluno" | "user";

export interface UserRoleData {
  role: AppRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  isContentCreator: boolean;
  isPersonalTrainer: boolean;
  isAcademyAdmin: boolean;
  isStudent: boolean;
  isUser: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Using type assertion since table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return (data?.role as AppRole | null) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    role: role ?? null,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isContentCreator: role === "content_creator",
    isPersonalTrainer: role === "personal_trainer",
    isAcademyAdmin: role === "academy_admin",
    isStudent: role === "aluno",
    isUser: role === "user" || !role, // Default to user if no role
    isLoading,
    error: error as Error | null,
  };
}
