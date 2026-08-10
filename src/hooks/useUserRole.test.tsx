/**
 * Unit Tests: useUserRole Hook
 * 
 * Tests for user role hook functionality.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock the AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return Wrapper;
};

describe("useUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return loading state initially", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "test-user-id" },
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should return null role when user is not logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isUser).toBe(true);
  });

  it("should identify admin user correctly", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "admin-user-id" },
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBe("admin");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isUser).toBe(false);
  });

  it("should identify personal trainer correctly", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "trainer-user-id" },
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: "personal_trainer" },
        error: null,
      }),
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBe("personal_trainer");
    expect(result.current.isPersonalTrainer).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "test-user-id" },
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isUser).toBe(true);
  });

  it("should identify moderator correctly", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "mod-user-id" },
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: "moderator" },
        error: null,
      }),
    } as any);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBe("moderator");
    expect(result.current.isModerator).toBe(true);
  });
});
