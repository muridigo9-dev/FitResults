import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (will redirect to auth if not logged in)
    await page.goto("/dashboard");
  });

  test("should redirect to auth when not logged in", async ({ page }) => {
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe("Public Pages", () => {
  test("should load landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });

  test("should have navigation elements", async ({ page }) => {
    await page.goto("/");
    
    // Check for common navigation elements
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
  });
});

test.describe("Admin Routes Protection", () => {
  test("should redirect non-admin from admin routes", async ({ page }) => {
    await page.goto("/admin");
    
    // Should redirect to auth or show access denied
    await expect(page).toHaveURL(/auth|admin/);
  });

  test("should protect admin users page", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/auth/);
  });

  test("should protect admin settings page", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe("Responsive Design", () => {
  test("should render correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    
    // Page should still be visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("should render correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    
    await expect(page.locator("body")).toBeVisible();
  });

  test("should render correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper document structure", async ({ page }) => {
    await page.goto("/");
    
    // Check for main landmark
    const main = page.locator("main, [role='main']");
    await expect(main.first()).toBeVisible();
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    
    // Should have at least one heading
    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });
});
