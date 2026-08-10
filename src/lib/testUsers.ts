/**
 * Test User Configuration
 * 
 * This module centralizes the definition of test/system users
 * that bypass subscription checks and payment flows.
 * 
 * Test users are created via migrations/seeds and should:
 * - Never be redirected to /reactivate
 * - Have full access to their role-specific features
 * - Bypass all Stripe/payment logic
 */

// Email addresses of test users
export const TEST_USER_EMAILS = [
  "admin@admin.com",
  "user@test.com",
  "gym@test.com",
  "pt@test.com",
  "content@test.com",
] as const;

// Type for test user emails
export type TestUserEmail = typeof TEST_USER_EMAILS[number];

// Map of test user emails to their roles
export const TEST_USER_ROLES: Record<TestUserEmail, string> = {
  "admin@admin.com": "admin",
  "user@test.com": "user",
  "gym@test.com": "academy_admin",
  "pt@test.com": "personal_trainer",
  "content@test.com": "content_creator",
};

/**
 * Check if an email belongs to a test user
 */
export function isTestUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return TEST_USER_EMAILS.includes(email.toLowerCase() as TestUserEmail);
}

/**
 * Check if an email matches test user patterns
 * Includes: exact matches, @test.com domain, admin@admin.com
 */
export function isTestUserPattern(email: string | null | undefined): boolean {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  
  // Exact match
  if (TEST_USER_EMAILS.includes(lowerEmail as TestUserEmail)) {
    return true;
  }
  
  // Pattern match: ends with @test.com
  if (lowerEmail.endsWith("@test.com")) {
    return true;
  }
  
  // Admin pattern
  if (lowerEmail === "admin@admin.com") {
    return true;
  }
  
  return false;
}

/**
 * Get the role for a test user email
 */
export function getTestUserRole(email: string | null | undefined): string | null {
  if (!email) return null;
  const lowerEmail = email.toLowerCase() as TestUserEmail;
  return TEST_USER_ROLES[lowerEmail] || null;
}
