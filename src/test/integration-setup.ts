/**
 * Integration Test Setup
 * 
 * Sets up MSW (Mock Service Worker) for mocking Supabase API calls
 * and provides test utilities for integration tests.
 */
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Test environment variables
process.env.VITE_SUPABASE_URL = "https://test-project.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";

// Default API handlers
export const handlers = [
  // Auth endpoints
  http.get("https://test-project.supabase.co/auth/v1/user", () => {
    return HttpResponse.json(null);
  }),

  // Feature flags
  http.get("https://test-project.supabase.co/rest/v1/feature_flags", () => {
    return HttpResponse.json([
      { key: "diets_enabled", enabled: true, allow_user_content: false, affects: "nutrition" },
      { key: "training_mode_enabled", enabled: true, allow_user_content: false, affects: "training" },
      { key: "gamification_enabled", enabled: true, allow_user_content: false, affects: "engagement" },
    ]);
  }),

  // User roles
  http.get("https://test-project.supabase.co/rest/v1/user_roles", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    if (userId?.includes("admin")) {
      return HttpResponse.json([{ role: "admin" }]);
    }
    return HttpResponse.json([{ role: "user" }]);
  }),

  // Profiles
  http.get("https://test-project.supabase.co/rest/v1/profiles", () => {
    return HttpResponse.json([]);
  }),
];

// Create MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Export server for custom handler additions
export { http, HttpResponse };
