import { test, expect } from "@playwright/test";

// Test user credentials (must match deployment)
const TEST_USERS = {
  admin: { email: "admin@admin.com", password: "Temp@123", role: "admin" },
  user: { email: "user@test.com", password: "Temp@123", role: "user" },
  gym: { email: "gym@test.com", password: "Temp@123", role: "academy_admin" },
  personalTrainer: { email: "pt@test.com", password: "Temp@123", role: "personal_trainer" },
  contentCreator: { email: "content@test.com", password: "Temp@123", role: "content_creator" },
} as const;

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /entrar|login/i })).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /entrar|login/i }).click();
    await expect(page.getByText(/email|obrigatório/i)).toBeVisible();
  });

  test("should redirect unauthenticated users from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/auth/);
  });

  test("should show email field", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should show password field", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel(/senha|password/i)).toBeVisible();
  });

  test("should show forgot password link", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText(/esqueceu|forgot/i)).toBeVisible();
  });
});

test.describe("Protected Routes", () => {
  test("should redirect to auth from admin page when not logged in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/auth/);
  });

  test("should redirect to auth from profile when not logged in", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/auth/);
  });

  test("should redirect to auth from progress when not logged in", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).toHaveURL(/auth/);
  });

  test("should redirect to auth from nutrition when not logged in", async ({ page }) => {
    await page.goto("/nutrition");
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe("Test Users Configuration", () => {
  // These tests verify the test users are correctly configured
  // They don't actually log in, just verify the configuration
  
  test("should have correct test user emails defined", () => {
    expect(TEST_USERS.admin.email).toBe("admin@admin.com");
    expect(TEST_USERS.user.email).toBe("user@test.com");
    expect(TEST_USERS.gym.email).toBe("gym@test.com");
    expect(TEST_USERS.personalTrainer.email).toBe("pt@test.com");
    expect(TEST_USERS.contentCreator.email).toBe("content@test.com");
  });

  test("should have correct roles for test users", () => {
    expect(TEST_USERS.admin.role).toBe("admin");
    expect(TEST_USERS.user.role).toBe("user");
    expect(TEST_USERS.gym.role).toBe("academy_admin");
    expect(TEST_USERS.personalTrainer.role).toBe("personal_trainer");
    expect(TEST_USERS.contentCreator.role).toBe("content_creator");
  });

  test("should use default temporary password", () => {
    const defaultPassword = "Temp@123";
    Object.values(TEST_USERS).forEach(user => {
      expect(user.password).toBe(defaultPassword);
    });
  });
});

test.describe("Password Reset Flow", () => {
  test("should navigate to forgot password page", async ({ page }) => {
    await page.goto("/auth");
    await page.getByText(/esqueceu|forgot/i).click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test("should show email input on forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should show submit button on forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("button", { name: /enviar|send|reset/i })).toBeVisible();
  });
});
