/**
 * Check-in Integration Tests
 * 
 * Tests for the complete check-in flow including:
 * - Meal registration from Diet
 * - Check-in persistence
 * - Challenge task completion
 * - Achievement granting
 * - Streak calculation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureTodayCheckin,
  addMealToCheckin,
  addWorkoutToCheckin,
  addChallengeTaskToCheckin,
  saveCompleteCheckin,
  getTodayISO,
} from "@/lib/checkinHelpers";
import {
  checkFirstCheckinAchievement,
  updateStreak,
} from "@/lib/achievementHelpers";

// Mock Supabase
vi.mock("@/integrations/supabase/client");

const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

describe("Check-in Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureTodayCheckin", () => {
    it("should return existing checkin if one exists", async () => {
      const mockCheckin = {
        id: "checkin-1",
        user_id: mockUser.id,
        date: getTodayISO(),
        status: "partial",
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockCheckin }),
            }),
          }),
        }),
      } as any);

      const result = await ensureTodayCheckin(mockUser.id);
      expect(result).toEqual(mockCheckin);
    });

    it("should create new checkin if none exists", async () => {
      const mockNewCheckin = {
        id: "checkin-new",
        user_id: mockUser.id,
        date: getTodayISO(),
        status: "partial",
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockNewCheckin }),
          }),
        }),
      } as any);

      const result = await ensureTodayCheckin(mockUser.id);
      expect(result).toEqual(mockNewCheckin);
    });
  });

  describe("addMealToCheckin", () => {
    it("should add meal to checkin idempotently", async () => {
      const mockCheckin = {
        id: "checkin-1",
        user_id: mockUser.id,
        date: getTodayISO(),
        status: "partial",
      };

      const mealData = {
        diet_id: "diet-1",
        diet_source: "system" as const,
        meal_type: "breakfast",
        completed: true,
      };

      // Mock ensureTodayCheckin
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockCheckin }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(
        addMealToCheckin(mockUser.id, mealData)
      ).resolves.not.toThrow();
    });

    it("should not create duplicate meals", async () => {
      const mockCheckin = {
        id: "checkin-1",
        user_id: mockUser.id,
        date: getTodayISO(),
        status: "partial",
      };

      const existingMeal = {
        id: "meal-1",
        checkin_id: mockCheckin.id,
        diet_id: "diet-1",
      };

      const mealData = {
        diet_id: "diet-1",
        diet_source: "system" as const,
        meal_type: "breakfast",
        completed: true,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingMeal }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await expect(
        addMealToCheckin(mockUser.id, mealData)
      ).resolves.not.toThrow();
    });
  });

  describe("addChallengeTaskToCheckin", () => {
    it("should complete challenge task idempotently", async () => {
      const taskData = {
        challenge_id: "challenge-1",
        task_id: "task-1",
        day_number: 1,
        completed: true,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(
        addChallengeTaskToCheckin(mockUser.id, taskData)
      ).resolves.not.toThrow();
    });

    it("should handle duplicate challenge tasks gracefully", async () => {
      const taskData = {
        challenge_id: "challenge-1",
        task_id: "task-1",
        day_number: 1,
        completed: true,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          error: { code: "23505" }, // Unique constraint violation
        }),
      } as any);

      await expect(
        addChallengeTaskToCheckin(mockUser.id, taskData)
      ).resolves.not.toThrow();
    });
  });

  describe("saveCompleteCheckin", () => {
    it("should save complete checkin with all data", async () => {
      const checkinData = {
        meals: [
          {
            diet_id: "diet-1",
            diet_source: "system" as const,
            meal_type: "breakfast",
            completed: true,
          },
        ],
        workouts: [
          {
            workout_id: "workout-1",
            workout_source: "system" as const,
            completed: true,
            duration_minutes: 30,
          },
        ],
        challengeTasks: [
          {
            challenge_id: "challenge-1",
            task_id: "task-1",
            day_number: 1,
            completed: true,
          },
        ],
        water: { current: 2000, goal: 2000 },
        mood: "great",
        weight: 75.5,
      };

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "checkin-1" },
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await saveCompleteCheckin(mockUser.id, checkinData);
      expect(result).toBe("checkin-1");
    });
  });

  describe("Achievement System", () => {
    it("should grant first checkin achievement", async () => {
      const mockAchievement = {
        id: "achievement-1",
        requirement_type: "checkin_count",
        requirement_value: 1,
        is_active: true,
        xp_reward: 50,
      };

      const mockQueryClient = {
        invalidateQueries: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockAchievement }),
              }),
            }),
          }),
          head: vi.fn().mockResolvedValue({ data: [{ id: "1" }] }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await checkFirstCheckinAchievement(
        mockUser.id,
        mockQueryClient as any
      );
      expect(result).toBe(true);
    });

    it("should not grant achievement twice", async () => {
      const mockAchievement = {
        id: "achievement-1",
        requirement_type: "checkin_count",
        requirement_value: 1,
        is_active: true,
        xp_reward: 50,
      };

      const existingUserAchievement = {
        id: "user-achievement-1",
        user_id: mockUser.id,
        achievement_id: mockAchievement.id,
      };

      const mockQueryClient = {
        invalidateQueries: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: existingUserAchievement,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await checkFirstCheckinAchievement(
        mockUser.id,
        mockQueryClient as any
      );
      expect(result).toBe(false);
    });
  });

  describe("Streak Calculation", () => {
    it("should increment streak for consecutive days", async () => {
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      const mockUserXp = {
        current_streak: 5,
        longest_streak: 10,
        last_checkin_date: yesterday,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockUserXp }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await updateStreak(mockUser.id);
      expect(result).toBe(6); // 5 + 1
    });

    it("should reset streak if day was skipped", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
        .toISOString()
        .split("T")[0];

      const mockUserXp = {
        current_streak: 5,
        longest_streak: 10,
        last_checkin_date: twoDaysAgo,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockUserXp }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await updateStreak(mockUser.id);
      expect(result).toBe(1); // Reset to 1
    });
  });
});
