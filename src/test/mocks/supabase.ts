/**
 * Supabase Mock
 * 
 * Provides a complete mock of the Supabase client for unit testing.
 */
import { vi } from "vitest";

// Mock auth session
export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_at: Date.now() + 3600000,
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "test-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: { full_name: "Test User" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  },
};

// Create chainable mock for Supabase queries
const createChainableMock = (returnData: any = null, returnError: any = null) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    then: vi.fn((callback) => callback({ data: returnData ? [returnData] : [], error: returnError })),
  };
  return chain;
};

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { session: null, user: mockSession.user },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: mockSession.user }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn((table: string) => createChainableMock()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file" } }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue({ status: "SUBSCRIBED" }),
    unsubscribe: vi.fn(),
  }),
};

// Mock for testing authenticated user
export const mockAuthenticatedSupabase = {
  ...mockSupabaseClient,
  auth: {
    ...mockSupabaseClient.auth,
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockSession.user },
      error: null,
    }),
  },
};

// Mock for testing admin user
export const mockAdminSupabase = {
  ...mockAuthenticatedSupabase,
  from: vi.fn((table: string) => {
    if (table === "user_roles") {
      return createChainableMock({ role: "admin" });
    }
    return createChainableMock();
  }),
};
