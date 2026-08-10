import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  TrainerDashboardData,
  StudentProgress,
  ExerciseStats,
  ExerciseFeedbackMood,
} from "@/types/workout";

// ============================================
// TRAINER WORKOUT DASHBOARD HOOK
// ============================================

export function useTrainerWorkoutDashboard(academyId?: string, days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trainer-workout-dashboard", user?.id, academyId, days],
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async (): Promise<TrainerDashboardData> => {
      // Get trainer's students
      const { data: students } = await supabase
        .from("trainer_students")
        .select(`
          student_id,
          student:profiles!student_id(id, full_name, avatar_url)
        `)
        .eq("trainer_id", user!.id)
        .eq("status", "active");

      const studentIds = (students || []).map(s => s.student_id);
      const totalStudents = studentIds.length;

      if (totalStudents === 0) {
        return {
          totalStudents: 0,
          activeStudents: 0,
          totalSessionsToday: 0,
          totalSessionsThisWeek: 0,
          avgCompletionRate: 0,
          avgStudentMood: "moderate",
          avgStudentRating: 0,
          hardestExercises: [],
          recentFeedback: [],
          studentProgress: [],
          topStudents: [],
        };
      }

      // Get sessions for the period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          user_id,
          status,
          started_at,
          completed_at,
          total_duration_seconds,
          completed_exercises,
          total_exercises,
          overall_mood,
          overall_rating
        `)
        .in("user_id", studentIds)
        .gte("started_at", startDate.toISOString());

      // Calculate stats
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const sessionsToday = (sessions || []).filter(
        s => s.started_at.split("T")[0] === today
      );
      const sessionsThisWeek = (sessions || []).filter(
        s => new Date(s.started_at) >= weekAgo
      );
      const completedSessions = (sessions || []).filter(s => s.status === "completed");

      // Active students (had at least one session in the period)
      const activeStudentIds = new Set((sessions || []).map(s => s.user_id));
      const activeStudents = activeStudentIds.size;

      // Average completion rate
      const avgCompletionRate = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => {
          if (s.total_exercises > 0) {
            return sum + (s.completed_exercises / s.total_exercises);
          }
          return sum;
        }, 0) / completedSessions.length * 100
        : 0;

      // Average mood
      const moodCounts: Record<string, number> = {};
      completedSessions.forEach(s => {
        if (s.overall_mood) {
          moodCounts[s.overall_mood] = (moodCounts[s.overall_mood] || 0) + 1;
        }
      });
      const avgStudentMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ExerciseFeedbackMood || "moderate";

      // Average rating
      const ratingSessions = completedSessions.filter(s => s.overall_rating);
      const avgStudentRating = ratingSessions.length > 0
        ? ratingSessions.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / ratingSessions.length
        : 0;

      // Get exercise feedback for hardest exercises
      const { data: exerciseFeedback } = await supabase
        .from("session_exercises")
        .select(`
          exercise_id,
          mood,
          rating,
          like_dislike,
          exercise:exercises(id, name, image_url)
        `)
        .in("session_id", (sessions || []).map(s => s.id))
        .not("mood", "is", null);

      // Calculate hardest exercises
      const exerciseStats: Record<string, {
        exerciseId: string;
        name: string;
        imageUrl?: string;
        moodSum: number;
        ratingSum: number;
        count: number;
        dislikes: number;
      }> = {};

      const moodValues: Record<string, number> = {
        very_easy: 1,
        easy: 2,
        moderate: 3,
        hard: 4,
        very_hard: 5,
      };

      (exerciseFeedback || []).forEach(ef => {
        if (!ef.exercise_id || !ef.exercise) return;

        if (!exerciseStats[ef.exercise_id]) {
          exerciseStats[ef.exercise_id] = {
            exerciseId: ef.exercise_id,
            name: ef.exercise.name,
            imageUrl: ef.exercise.image_url,
            moodSum: 0,
            ratingSum: 0,
            count: 0,
            dislikes: 0,
          };
        }

        const stats = exerciseStats[ef.exercise_id];
        stats.count++;
        if (ef.mood) stats.moodSum += moodValues[ef.mood] || 3;
        if (ef.rating) stats.ratingSum += ef.rating;
        if (ef.like_dislike === "dislike") stats.dislikes++;
      });

      const hardestExercises: ExerciseStats[] = Object.values(exerciseStats)
        .map(stats => ({
          exerciseId: stats.exerciseId,
          exercise: {
            id: stats.exerciseId,
            name: stats.name,
            slug: stats.name.toLowerCase().replace(/\s+/g, '-'),
            imageUrl: stats.imageUrl,
            equipment: 'none' as const,
            difficulty: 'intermediate' as const,
            defaultSets: 3,
            defaultReps: '12',
            defaultRestSeconds: 60,
            isActive: true,
            isCompound: false,
            tags: [],
            createdByType: 'admin' as const,
            createdAt: '',
            updatedAt: '',
          },
          totalCompletions: stats.count,
          avgRating: stats.count > 0 ? stats.ratingSum / stats.count : 0,
          avgMood: (stats.count > 0 ?
            Object.entries(moodValues).find(([, v]) => v === Math.round(stats.moodSum / stats.count))?.[0]
            : 'moderate') as ExerciseFeedbackMood,
          likePercentage: stats.count > 0 ? ((stats.count - stats.dislikes) / stats.count) * 100 : 0,
          avgReps: 0,
          avgWeight: 0,
          maxWeight: 0,
          progressTrend: 'stable' as const,
        }))
        .sort((a, b) => {
          // Sort by average mood (higher = harder)
          const aMood = moodValues[a.avgMood] || 3;
          const bMood = moodValues[b.avgMood] || 3;
          return bMood - aMood;
        })
        .slice(0, 5);

      // Recent feedback
      const { data: recentFeedbackData } = await supabase
        .from("session_exercises")
        .select(`
          mood,
          rating,
          comment,
          created_at,
          exercise:exercises(name),
          session:workout_sessions(
            user_id,
            user:profiles!user_id(full_name)
          )
        `)
        .in("session_id", (sessions || []).map(s => s.id))
        .not("mood", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      const recentFeedback = (recentFeedbackData || [])
        .filter(f => f.session?.user && f.exercise)
        .map(f => ({
          studentId: f.session!.user_id,
          studentName: f.session!.user?.full_name || "Aluno",
          exerciseName: f.exercise!.name,
          mood: f.mood as ExerciseFeedbackMood,
          rating: f.rating || 0,
          comment: f.comment,
          createdAt: f.created_at,
        }));

      // Student progress
      const studentProgress: StudentProgress[] = await Promise.all(
        (students || []).map(async (s) => {
          const studentSessions = (sessions || []).filter(
            sess => sess.user_id === s.student_id
          );
          const studentCompletedSessions = studentSessions.filter(
            sess => sess.status === "completed"
          );

          // Get streak
          const { data: streak } = await supabase
            .from("workout_streaks")
            .select("current_streak")
            .eq("user_id", s.student_id)
            .single();

          const lastSession = studentSessions.sort(
            (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          )[0];

          // Calculate avg mood
          const studentMoods = studentCompletedSessions
            .filter(sess => sess.overall_mood)
            .map(sess => sess.overall_mood);
          const avgMood = studentMoods.length > 0
            ? studentMoods.sort((a, b) =>
              studentMoods.filter(m => m === b).length - studentMoods.filter(m => m === a).length
            )[0] as ExerciseFeedbackMood
            : undefined;

          // Completion rate
          const completionRate = studentSessions.length > 0
            ? (studentCompletedSessions.length / studentSessions.length) * 100
            : 0;

          return {
            studentId: s.student_id,
            studentName: s.student?.full_name || "Aluno",
            avatarUrl: s.student?.avatar_url,
            totalSessions: studentSessions.length,
            sessionsThisWeek: studentSessions.filter(
              sess => new Date(sess.started_at) >= weekAgo
            ).length,
            sessionsThisMonth: studentSessions.length,
            currentStreak: streak?.current_streak || 0,
            lastWorkoutDate: lastSession?.started_at?.split("T")[0],
            avgMood,
            avgRating: studentCompletedSessions.length > 0
              ? studentCompletedSessions.reduce((sum, sess) => sum + (sess.overall_rating || 0), 0) / studentCompletedSessions.length
              : undefined,
            completionRate,
          };
        })
      );

      // Top students by XP
      const { data: leaderboard } = await supabase
        .from("leaderboard")
        .select(`
          user_id,
          total_xp,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .in("user_id", studentIds)
        .order("total_xp", { ascending: false })
        .limit(5);

      const topStudents = (leaderboard || []).map(l => ({
        studentId: l.user_id,
        studentName: l.user?.full_name || "Aluno",
        avatarUrl: l.user?.avatar_url,
        totalXp: l.total_xp,
        streak: studentProgress.find(sp => sp.studentId === l.user_id)?.currentStreak || 0,
      }));

      return {
        totalStudents,
        activeStudents,
        totalSessionsToday: sessionsToday.length,
        totalSessionsThisWeek: sessionsThisWeek.length,
        avgCompletionRate: Math.round(avgCompletionRate),
        avgStudentMood,
        avgStudentRating: Math.round(avgStudentRating * 10) / 10,
        hardestExercises,
        recentFeedback,
        studentProgress: studentProgress.sort((a, b) => b.currentStreak - a.currentStreak),
        topStudents,
      };
    },
  });
}

// ============================================
// STUDENT WORKOUT STATS HOOK
// ============================================

export function useStudentWorkoutStats(studentId: string, days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["student-workout-stats", studentId, days],
    enabled: !!user && !!studentId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_student_workout_stats", {
          p_student_id: studentId,
          p_days: days,
        });

      if (error) throw error;
      return data;
    },
  });
}
