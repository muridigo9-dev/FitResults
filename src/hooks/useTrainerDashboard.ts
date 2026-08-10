import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrainerStudentSummary, TrainerStudentLimit } from "@/types/personalTrainer";

/**
 * Hook for trainer dashboard data
 */
export function useTrainerDashboard() {
  const { user } = useAuth();

  // Fetch student summaries
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["trainer-students-summary", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("trainer_student_summary")
        .select("*")
        .eq("trainer_id", user.id);

      if (error) throw error;
      return data as TrainerStudentSummary[];
    },
    enabled: !!user?.id,
  });

  // Fetch student limit info
  const { data: studentLimit, isLoading: isLoadingLimit } = useQuery({
    queryKey: ["trainer-student-limit", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any).rpc("get_trainer_student_limit", {
        p_trainer_id: user.id,
      });

      if (error) throw error;
      return data as TrainerStudentLimit;
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.status === "active").length,
    totalCheckins7Days: students.reduce((acc, s) => acc + s.checkins_last_7_days, 0),
    averageStreak: students.length 
      ? Math.round(students.reduce((acc, s) => acc + s.current_streak, 0) / students.length)
      : 0,
    studentsWithCheckinsToday: students.filter(
      (s) => s.last_checkin_date === new Date().toISOString().split("T")[0]
    ).length,
  };

  // Engagement rate (students who checked in last 7 days / total students)
  const engagementRate = students.length
    ? Math.round((students.filter((s) => s.checkins_last_7_days > 0).length / students.length) * 100)
    : 0;

  return {
    students,
    studentLimit,
    stats: {
      ...stats,
      engagementRate,
    },
    isLoading: isLoadingStudents || isLoadingLimit,
  };
}

/**
 * Hook for detailed student progress (for individual student view)
 */
export function useStudentProgress(studentId: string | null, startDate?: Date, endDate?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["student-progress", studentId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!user?.id || !studentId) return [];

      const { data, error } = await (supabase as any).rpc("get_student_progress", {
        _trainer_id: user.id,
        _student_id: studentId,
        _start_date: (startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
        _end_date: (endDate || new Date()).toISOString().split("T")[0],
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!studentId,
  });
}

/**
 * Hook for fetching student's assignments (for individual student view)
 */
export function useStudentAssignments(studentId: string | null) {
  return useQuery({
    queryKey: ["student-assignments", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await (supabase as any)
        .from("content_assignments")
        .select("*")
        .or(`and(assigned_to_type.eq.user,assigned_to_id.eq.${studentId})`)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
}

/**
 * Hook for trainer's quick stats
 */
export function useTrainerQuickStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trainer-quick-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get counts in parallel
      const [studentsResult, assignmentsResult, invitesResult] = await Promise.all([
        (supabase as any)
          .from("trainer_students")
          .select("id", { count: "exact", head: true })
          .eq("trainer_id", user.id)
          .eq("status", "active"),
        (supabase as any)
          .from("content_assignments")
          .select("id", { count: "exact", head: true })
          .eq("assigned_by", user.id)
          .eq("status", "active"),
        (supabase as any)
          .from("student_invites")
          .select("id", { count: "exact", head: true })
          .eq("invited_by", user.id)
          .eq("status", "pending"),
      ]);

      return {
        activeStudents: studentsResult.count || 0,
        activeAssignments: assignmentsResult.count || 0,
        pendingInvites: invitesResult.count || 0,
      };
    },
    enabled: !!user?.id,
  });
}
