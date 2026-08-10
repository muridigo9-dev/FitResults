import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

/**
 * Achievement Helpers - Centralized achievement checking and granting
 * 
 * This module provides automatic achievement checking after various user actions.
 */

// ==========================================
// TYPES
// ==========================================

export interface AchievementCheck {
  requirementType: string;
  requirementValue: number;
  currentValue: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

// ==========================================
// ACHIEVEMENT CHECKING
// ==========================================

/**
 * Check and grant "First Check-in" achievement
 */
export async function checkFirstCheckinAchievement(
  userId: string,
  queryClient: QueryClient
): Promise<boolean> {
  try {
    // 1. Get the "First Check-in" achievement
    const { data: achievement } = await supabase
      .from("achievements")
      .select("*")
      .eq("requirement_type", "checkin_count")
      .eq("requirement_value", 1)
      .eq("is_active", true)
      .maybeSingle();

    if (!achievement) {
      console.warn("First check-in achievement not found in database");
      return false;
    }

    // 2. Check if user already has it
    const { data: existing } = await supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id)
      .maybeSingle();

    if (existing) {
      return false; // Already has it
    }

    // 3. Count user's check-ins
    const { data: checkins, error: countError } = await supabase
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw countError;

    const checkinCount = checkins?.length || 0;

    // 4. Grant achievement if requirement met
    if (checkinCount >= achievement.requirement_value) {
      await grantAchievement(userId, achievement.id, achievement.xp_reward, queryClient);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking first checkin achievement:", error);
    return false;
  }
}

/**
 * Check streak-based achievements (7, 14, 30 days, etc.)
 */
export async function checkStreakAchievements(
  userId: string,
  queryClient: QueryClient
): Promise<string[]> {
  try {
    // Get current streak from user_xp
    const { data: userXp } = await supabase
      .from("user_xp")
      .select("current_streak")
      .eq("user_id", userId)
      .maybeSingle();

    if (!userXp) return [];

    const currentStreak = userXp.current_streak || 0;

    // Get all streak achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("requirement_type", "streak_days")
      .eq("is_active", true)
      .lte("requirement_value", currentStreak);

    if (!achievements || achievements.length === 0) return [];

    // Get user's existing achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const earnedIds = new Set(
      (userAchievements || []).map((a) => a.achievement_id)
    );

    // Grant new achievements
    const granted: string[] = [];
    for (const achievement of achievements) {
      if (!earnedIds.has(achievement.id)) {
        await grantAchievement(
          userId,
          achievement.id,
          achievement.xp_reward,
          queryClient
        );
        granted.push(achievement.id);
      }
    }

    return granted;
  } catch (error) {
    console.error("Error checking streak achievements:", error);
    return [];
  }
}

/**
 * Check challenge completion achievements
 */
export async function checkChallengeAchievements(
  userId: string,
  queryClient: QueryClient
): Promise<string[]> {
  try {
    // Count completed challenges (using the participations table)
    const { data: completedChallenges, error } = await supabase
      .from("user_challenge_participations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    if (error) throw error;

    const count = completedChallenges?.length || 0;

    // Get challenge-based achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("requirement_type", "challenge_completed")
      .eq("is_active", true)
      .lte("requirement_value", count);

    if (!achievements || achievements.length === 0) return [];

    // Get user's existing achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const earnedIds = new Set(
      (userAchievements || []).map((a) => a.achievement_id)
    );

    // Grant new achievements
    const granted: string[] = [];
    for (const achievement of achievements) {
      if (!earnedIds.has(achievement.id)) {
        await grantAchievement(
          userId,
          achievement.id,
          achievement.xp_reward,
          queryClient
        );
        granted.push(achievement.id);
      }
    }

    return granted;
  } catch (error) {
    console.error("Error checking challenge achievements:", error);
    return [];
  }
}

/**
 * Check weight loss achievements
 */
export async function checkWeightLossAchievements(
  userId: string,
  queryClient: QueryClient
): Promise<string[]> {
  try {
    // Get first and last weight
    const { data: weights } = await supabase
      .from("weight_logs")
      .select("weight, date")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (!weights || weights.length < 2) return [];

    const firstWeight = weights[0].weight;
    const lastWeight = weights[weights.length - 1].weight;
    const weightLost = firstWeight - lastWeight;

    if (weightLost <= 0) return [];

    // Get weight loss achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("requirement_type", "weight_loss_kg")
      .eq("is_active", true)
      .lte("requirement_value", weightLost);

    if (!achievements || achievements.length === 0) return [];

    // Get user's existing achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const earnedIds = new Set(
      (userAchievements || []).map((a) => a.achievement_id)
    );

    // Grant new achievements
    const granted: string[] = [];
    for (const achievement of achievements) {
      if (!earnedIds.has(achievement.id)) {
        await grantAchievement(
          userId,
          achievement.id,
          achievement.xp_reward,
          queryClient
        );
        granted.push(achievement.id);
      }
    }

    return granted;
  } catch (error) {
    console.error("Error checking weight loss achievements:", error);
    return [];
  }
}

/**
 * Master function: check all achievements after check-in
 */
export async function checkAllAchievementsAfterCheckin(
  userId: string,
  queryClient: QueryClient
): Promise<{
  firstCheckin: boolean;
  streaks: string[];
  challenges: string[];
  weightLoss: string[];
}> {
  const [firstCheckin, streaks, challenges, weightLoss] = await Promise.all([
    checkFirstCheckinAchievement(userId, queryClient),
    checkStreakAchievements(userId, queryClient),
    checkChallengeAchievements(userId, queryClient),
    checkWeightLossAchievements(userId, queryClient),
  ]);

  return { firstCheckin, streaks, challenges, weightLoss };
}

// ==========================================
// GRANTING ACHIEVEMENTS
// ==========================================

/**
 * Grant an achievement to a user and award XP
 */
async function grantAchievement(
  userId: string,
  achievementId: string,
  xpReward: number,
  queryClient: QueryClient
): Promise<void> {
  try {
    // 1. Insert achievement
    const { error: insertError } = await supabase
      .from("user_achievements")
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
      });

    if (insertError) {
      // Ignore duplicate errors
      if (insertError.code !== "23505") {
        throw insertError;
      }
      return;
    }

    // 2. Award XP
    await awardXP(userId, xpReward);

    // 3. Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
    queryClient.invalidateQueries({ queryKey: ["user-xp", userId] });

    console.log(`✅ Granted achievement ${achievementId} with ${xpReward} XP to user ${userId}`);
  } catch (error) {
    console.error("Error granting achievement:", error);
    throw error;
  }
}

/**
 * Award XP to a user
 */
async function awardXP(userId: string, xp: number): Promise<void> {
  try {
    // Get current XP
    const { data: userXp } = await supabase
      .from("user_xp")
      .select("total_xp, current_level_id")
      .eq("user_id", userId)
      .maybeSingle();

    const currentXp = userXp?.total_xp || 0;
    const newTotalXp = currentXp + xp;

    // Determine new level
    const { data: levels } = await supabase
      .from("levels")
      .select("*")
      .lte("min_xp", newTotalXp)
      .order("min_xp", { ascending: false })
      .limit(1);

    const newLevel = levels?.[0];

    if (!userXp) {
      // Create user_xp record
      await supabase.from("user_xp").insert({
        user_id: userId,
        total_xp: newTotalXp,
        current_level_id: newLevel?.id,
        current_streak: 0,
        longest_streak: 0,
      });
    } else {
      // Update existing
      await supabase
        .from("user_xp")
        .update({
          total_xp: newTotalXp,
          current_level_id: newLevel?.id || userXp.current_level_id,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  } catch (error) {
    console.error("Error awarding XP:", error);
    throw error;
  }
}

/**
 * Update streak after check-in
 */
export async function updateStreak(userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get user XP
    const { data: userXp } = await supabase
      .from("user_xp")
      .select("current_streak, longest_streak, last_checkin_date")
      .eq("user_id", userId)
      .maybeSingle();

    let newStreak = 1;
    let newLongestStreak = 1;

    if (userXp) {
      const lastCheckin = userXp.last_checkin_date;

      if (lastCheckin === yesterday) {
        // Consecutive day
        newStreak = (userXp.current_streak || 0) + 1;
      } else if (lastCheckin === today) {
        // Already checked in today
        newStreak = userXp.current_streak || 1;
      } else {
        // Streak broken
        newStreak = 1;
      }

      newLongestStreak = Math.max(newStreak, userXp.longest_streak || 0);
    }

    // Update or insert
    await supabase.from("user_xp").upsert(
      {
        user_id: userId,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_checkin_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return newStreak;
  } catch (error) {
    console.error("Error updating streak:", error);
    return 1;
  }
}
