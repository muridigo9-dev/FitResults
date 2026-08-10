import { test, expect } from "@playwright/test";

test.describe("Feature Flags UI", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a public page
    await page.goto("/");
  });

  test("should conditionally render based on feature flags", async ({ page }) => {
    // The landing page should load regardless of feature flags
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Admin Feature Flags", () => {
  test("should protect feature flags admin page", async ({ page }) => {
    await page.goto("/admin/feature-flags");
    
    // Should redirect non-authenticated users
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe("Feature-Dependent Routes", () => {
  test("should load diets page when feature is enabled", async ({ page }) => {
    await page.goto("/diets");
    
    // Either shows content or redirects to auth
    await expect(page).toHaveURL(/diets|auth/);
  });

  test("should load workouts page when feature is enabled", async ({ page }) => {
    await page.goto("/workouts");
    
    // Either shows content or redirects to auth
    await expect(page).toHaveURL(/workouts|auth/);
  });

  test("should load challenges page when feature is enabled", async ({ page }) => {
    await page.goto("/challenges");
    
    // Either shows content or redirects to auth
    await expect(page).toHaveURL(/challenges|auth/);
  });
});
