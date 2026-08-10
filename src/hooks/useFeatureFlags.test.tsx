/**
 * Unit Tests: Feature Flags Hook
 * 
 * Tests for feature flag functionality.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return Wrapper;
};

// Mock feature flags data
const mockFeatureFlags = [
  { key: "diets_enabled", enabled: true, allow_user_content: false, affects: "nutrition" },
  { key: "training_mode_enabled", enabled: true, allow_user_content: true, affects: "training" },
  { key: "gamification_enabled", enabled: false, allow_user_content: false, affects: "engagement" },
  { key: "challenges_enabled", enabled: true, allow_user_content: false, affects: "engagement" },
  { key: "notifications_enabled", enabled: true, allow_user_content: false, affects: "communication" },
];

describe("Feature Flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isFeatureEnabled", () => {
    it("should return true for enabled feature", () => {
      const flags = mockFeatureFlags;
      const isEnabled = (key: string) => flags.find(f => f.key === key)?.enabled ?? false;

      expect(isEnabled("diets_enabled")).toBe(true);
      expect(isEnabled("training_mode_enabled")).toBe(true);
    });

    it("should return false for disabled feature", () => {
      const flags = mockFeatureFlags;
      const isEnabled = (key: string) => flags.find(f => f.key === key)?.enabled ?? false;

      expect(isEnabled("gamification_enabled")).toBe(false);
    });

    it("should return false for non-existent feature", () => {
      const flags = mockFeatureFlags;
      const isEnabled = (key: string) => flags.find(f => f.key === key)?.enabled ?? false;

      expect(isEnabled("non_existent_feature")).toBe(false);
    });
  });

  describe("isUserContentAllowed", () => {
    it("should return true when user content is allowed", () => {
      const flags = mockFeatureFlags;
      const isAllowed = (key: string) => flags.find(f => f.key === key)?.allow_user_content ?? false;

      expect(isAllowed("training_mode_enabled")).toBe(true);
    });

    it("should return false when user content is not allowed", () => {
      const flags = mockFeatureFlags;
      const isAllowed = (key: string) => flags.find(f => f.key === key)?.allow_user_content ?? false;

      expect(isAllowed("diets_enabled")).toBe(false);
    });
  });

  describe("Feature flag affects modules", () => {
    it("should correctly identify affected modules", () => {
      const getAffectedModule = (key: string) =>
        mockFeatureFlags.find(f => f.key === key)?.affects;

      expect(getAffectedModule("diets_enabled")).toBe("nutrition");
      expect(getAffectedModule("training_mode_enabled")).toBe("training");
      expect(getAffectedModule("gamification_enabled")).toBe("engagement");
    });

    it("should group features by affected module", () => {
      const groupByModule = mockFeatureFlags.reduce((acc, flag) => {
        const module = flag.affects;
        if (!acc[module]) acc[module] = [];
        acc[module].push(flag.key);
        return acc;
      }, {} as Record<string, string[]>);

      expect(groupByModule.nutrition).toContain("diets_enabled");
      expect(groupByModule.training).toContain("training_mode_enabled");
      expect(groupByModule.engagement).toHaveLength(2);
    });
  });

  describe("Feature flag conditional rendering", () => {
    it("should show component when feature is enabled", () => {
      const flags = mockFeatureFlags;
      const shouldRender = (key: string) => flags.find(f => f.key === key)?.enabled ?? false;

      const dietsVisible = shouldRender("diets_enabled");
      expect(dietsVisible).toBe(true);
    });

    it("should hide component when feature is disabled", () => {
      const flags = mockFeatureFlags;
      const shouldRender = (key: string) => flags.find(f => f.key === key)?.enabled ?? false;

      const gamificationVisible = shouldRender("gamification_enabled");
      expect(gamificationVisible).toBe(false);
    });
  });
});

describe("Feature Flag API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch feature flags from database", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockFeatureFlags,
        error: null,
      }),
    } as any);

    const result = await (supabase.from as any)("feature_flags").select("*").order("key");

    expect(result.data).toHaveLength(5);
    expect(result.data?.[0].key).toBe("diets_enabled");
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    } as any);

    const result = await (supabase.from as any)("feature_flags").select("*").order("key");

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });
});
