import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserStatus = "active" | "trial" | "trialing" | "expired" | "cancelled" | "suspended" | "none" | "past_due";
export type AccountStatus = "active" | "pending" | "cancelled" | "suspended";
export type UserRole = "admin" | "user" | "personal_trainer" | "academy_admin" | "content_creator";

// Test user emails - created via migrations/deploy
const TEST_USER_EMAILS = [
  "admin@admin.com",
  "user@test.com",
  "gym@test.com",
  "pt@test.com",
  "content@test.com",
];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  status: UserStatus;
  subscriptionStatus: UserStatus;
  accountStatus: AccountStatus;
  joinedAt: string;
  // Test user flag
  isTestUser: boolean;
  // Onboarding
  onboardingCompleted: boolean;
  // Engagement metrics
  streak: number;
  daysActiveLast7: number;
  daysActiveLast30: number;
  totalCheckins: number;
  contentsConsumed: number;
  lastLogin: string | null;
  lastCheckin: string | null;
  // Stripe
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  // Subscription Details
  planName: string | null;
  planExpiresAt: string | null;
  planPrice: number | null;
  planCurrency: string | null;
  // Metadata
  mustChangePassword: boolean;
}

export interface UserFilters {
  accountStatus: AccountStatus | "all";
  subscriptionStatus: UserStatus | "all";
  role: UserRole | "all";
  userType: "all" | "real" | "test";
}

interface ProfileWithExtras {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  subscription_status?: string | null;
  account_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  onboarding_completed?: boolean | null;
  current_plan_id?: string | null;
}

async function fetchUsers(): Promise<AdminUser[]> {
  // Fetch all profiles - use type assertion for extended columns
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  // Cast to our extended type
  const typedProfiles = (profiles || []) as unknown as ProfileWithExtras[];

  // Fetch user roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role");

  // Fetch user XP data for streaks
  const { data: xpData } = await supabase
    .from("user_xp")
    .select("user_id, current_streak, last_checkin_date");

  // Fetch all checkins
  const { data: checkins } = await supabase
    .from("daily_checkins")
    .select("user_id, date");

  // Fetch user content consumption (diets, workouts, challenges)
  const { data: userDiets } = await supabase
    .from("user_diets")
    .select("user_id");

  const { data: userWorkouts } = await supabase
    .from("user_workouts")
    .select("user_id");

  const { data: userChallenges } = await supabase
    .from("user_challenge_participations")
    .select("user_id");

  // Fetch subscriptions with plan info
  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select(`
      user_id,
      plan_id,
      status,
      expires_at,
      plans (
        name
      )
    `);

  // Fetch plan prices for value association
  const { data: planPrices } = await supabase
    .from("plan_prices")
    .select("plan_id, display_price, display_currency")
    .eq("is_active", true);

  // Create maps for quick lookup
  const rolesMap = new Map<string, UserRole[]>();
  roles?.forEach(r => {
    const existing = rolesMap.get(r.user_id) || [];
    existing.push(r.role as UserRole);
    rolesMap.set(r.user_id, existing);
  });

  const xpMap = new Map(xpData?.map(x => [x.user_id, x]) || []);

  // Count checkins per user and by period
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const checkinStats = new Map<string, { total: number; last7: number; last30: number; lastDate: string | null }>();

  checkins?.forEach(c => {
    const stats = checkinStats.get(c.user_id) || { total: 0, last7: 0, last30: 0, lastDate: null };
    stats.total++;

    if (c.date >= sevenDaysAgoStr) stats.last7++;
    if (c.date >= thirtyDaysAgoStr) stats.last30++;

    if (!stats.lastDate || c.date > stats.lastDate) {
      stats.lastDate = c.date;
    }

    checkinStats.set(c.user_id, stats);
  });

  // Count contents consumed per user
  const contentsMap = new Map<string, number>();
  userDiets?.forEach(d => contentsMap.set(d.user_id, (contentsMap.get(d.user_id) || 0) + 1));
  userWorkouts?.forEach(w => contentsMap.set(w.user_id, (contentsMap.get(w.user_id) || 0) + 1));
  userChallenges?.forEach(c => contentsMap.set(c.user_id, (contentsMap.get(c.user_id) || 0) + 1));

  // Map for subscriptions
  const subMap = new Map<string, any>();
  subscriptions?.forEach(s => {
    // Keep only the most relevant subscription if multiple exist
    if (!subMap.has(s.user_id) || s.status === "active") {
      subMap.set(s.user_id, s);
    }
  });

  // Map for prices (pick first active price for the plan)
  const priceMap = new Map<string, any>();
  planPrices?.forEach(p => {
    if (!priceMap.has(p.plan_id)) {
      priceMap.set(p.plan_id, p);
    }
  });

  // Helper to normalize subscription status
  const normalizeSubscriptionStatus = (status: string | null | undefined): UserStatus => {
    if (!status || status === "none") return "none";
    if (status === "trialing") return "trial";
    if (status === "active") return "active";
    if (status === "past_due" || status === "unpaid") return "expired";
    if (status === "cancelled" || status === "canceled") return "cancelled";
    if (status === "suspended" || status === "paused") return "suspended";
    return "none";
  };

  return typedProfiles.map(profile => {
    const xp = xpMap.get(profile.id);
    const sub = subMap.get(profile.id);
    const planId = sub?.plan_id || profile.current_plan_id;
    const price = planId ? priceMap.get(planId) : null;

    const stats = checkinStats.get(profile.id) || { total: 0, last7: 0, last30: 0, lastDate: null };
    const lastCheckin = stats.lastDate || xp?.last_checkin_date || null;
    const userRoles = rolesMap.get(profile.id) || [];
    const primaryRole: UserRole = userRoles.includes("admin" as UserRole) ? "admin" :
      userRoles.includes("personal_trainer" as UserRole) ? "personal_trainer" :
        userRoles.includes("academy_admin" as UserRole) ? "academy_admin" :
          userRoles.includes("content_creator" as UserRole) ? "content_creator" : "user";

    // Normalize subscription status from profile
    const subscriptionStatus = normalizeSubscriptionStatus(profile.subscription_status);
    const accountStatus = (profile.account_status as AccountStatus) || "active";

    // Check if test user
    const isTestUser = TEST_USER_EMAILS.includes(profile.email.toLowerCase());

    // Test users should usually show as active for demo purposes, 
    // but respect explicit cancellations or suspensions
    const isActuallyCancelled = accountStatus === "cancelled" || subscriptionStatus === "cancelled";
    const finalSubscriptionStatus = isTestUser && !isActuallyCancelled ? "active" : (isActuallyCancelled ? "cancelled" : subscriptionStatus);
    const finalAccountStatus = isTestUser && accountStatus !== "cancelled" && accountStatus !== "suspended" ? "active" : accountStatus;

    return {
      id: profile.id,
      name: profile.full_name || profile.email.split("@")[0],
      email: profile.email,
      role: primaryRole,
      roles: userRoles.length > 0 ? userRoles : ["user"],
      status: finalSubscriptionStatus,
      subscriptionStatus: finalSubscriptionStatus,
      accountStatus: finalAccountStatus,
      joinedAt: profile.created_at || "",
      isTestUser,
      onboardingCompleted: profile.onboarding_completed ?? false,
      streak: xp?.current_streak || 0,
      daysActiveLast7: stats.last7,
      daysActiveLast30: stats.last30,
      totalCheckins: stats.total,
      contentsConsumed: contentsMap.get(profile.id) || 0,
      lastLogin: null,
      lastCheckin,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: profile.stripe_subscription_id || null,
      // Plan Details
      planName: sub?.plans?.name || (profile.current_plan_id ? "Plano Associado" : null),
      planExpiresAt: sub?.expires_at || null,
      planPrice: price?.display_price || null,
      planCurrency: price?.display_currency || "BRL",
      mustChangePassword: false,
    };
  });
}

export function useAdminUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const resetStreakMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_xp")
        .update({ current_streak: 0 })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const toggleUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: UserRole; action: "add" | "remove" }) => {
      if (action === "add") {
        // Check if role exists
        const { data: existing } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", role as "admin" | "user")
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: role as "admin" | "user" });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role as "admin" | "user");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateAccountStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: AccountStatus }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ account_status: status })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateSubscriptionStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ subscription_status: status })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  // Password reset response type
  interface PasswordResetResponse {
    success: boolean;
    code?: string;
    message: string;
    remaining_seconds?: number;
    resend_id?: string;
  }

  const sendPasswordResetMutation = useMutation({
    mutationFn: async ({ email }: { email: string }): Promise<PasswordResetResponse> => {
      const { data, error } = await supabase.functions.invoke<PasswordResetResponse>("send-password-reset", {
        body: {
          email,
          redirect_url: window.location.origin + "/reset-password",
          is_admin_request: true, // Mark as admin request
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao enviar email de reset");
      }

      // Return the full response for the UI to handle
      return data as PasswordResetResponse;
    },
  });

  const forcePasswordChangeMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.functions.invoke("admin-force-password-change", {
        body: { user_id: userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  // Stats calculations
  const users = usersQuery.data || [];
  const stats = {
    total: users.length,
    active: users.filter(u => u.subscriptionStatus === "active").length,
    trial: users.filter(u => u.subscriptionStatus === "trial" || u.subscriptionStatus === "trialing").length,
    expired: users.filter(u => u.subscriptionStatus === "expired").length,
    cancelled: users.filter(u => u.subscriptionStatus === "cancelled").length,
    suspended: users.filter(u => u.accountStatus === "suspended").length,
    admins: users.filter(u => u.role === "admin").length,
    testUsers: users.filter(u => u.isTestUser).length,
    engagedLast7Days: users.filter(u => u.daysActiveLast7 > 0).length,
    noSubscription: users.filter(u => u.subscriptionStatus === "none").length,
    expiringSoon: users.filter(u =>
      u.planExpiresAt &&
      new Date(u.planExpiresAt) > new Date() &&
      new Date(u.planExpiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length,
    newThisWeek: users.filter(u =>
      new Date(u.joinedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  // Filter function
  const filterUsers = (filters: UserFilters): AdminUser[] => {
    return users.filter(user => {
      if (filters.accountStatus !== "all" && user.accountStatus !== filters.accountStatus) return false;
      if (filters.subscriptionStatus !== "all" && user.subscriptionStatus !== filters.subscriptionStatus) return false;
      if (filters.role !== "all" && !user.roles.includes(filters.role)) return false;
      if (filters.userType === "test" && !user.isTestUser) return false;
      if (filters.userType === "real" && user.isTestUser) return false;
      return true;
    });
  };

  return {
    users,
    stats,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    filterUsers,
    // Actions
    resetStreak: (userId: string) => resetStreakMutation.mutateAsync(userId),
    toggleUserRole: (userId: string, role: UserRole, action: "add" | "remove") =>
      toggleUserRoleMutation.mutateAsync({ userId, role, action }),
    updateAccountStatus: (userId: string, status: AccountStatus) =>
      updateAccountStatusMutation.mutateAsync({ userId, status }),
    updateSubscriptionStatus: (userId: string, status: UserStatus) =>
      updateSubscriptionStatusMutation.mutateAsync({ userId, status }),
    sendPasswordReset: async (email: string) => {
      const response = await sendPasswordResetMutation.mutateAsync({ email });
      return response;
    },
    forcePasswordChange: (userId: string) =>
      forcePasswordChangeMutation.mutateAsync({ userId }),
    // Loading states
    isSendingPasswordReset: sendPasswordResetMutation.isPending,
    isUpdatingStatus: updateAccountStatusMutation.isPending || updateSubscriptionStatusMutation.isPending,
  };
}

// Export test user emails for use elsewhere
export { TEST_USER_EMAILS };
