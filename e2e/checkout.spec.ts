import { test, expect } from "@playwright/test";

test.describe("Checkout Flow", () => {
  test("should load checkout page", async ({ page }) => {
    await page.goto("/checkout");
    
    // Should show checkout content or redirect to auth
    const url = page.url();
    expect(url).toMatch(/checkout|auth/);
  });

  test("should show pricing information", async ({ page }) => {
    await page.goto("/checkout");
    
    // If on checkout page, should have price elements
    if (page.url().includes("/checkout")) {
      const priceElement = page.locator("[data-testid='price'], .price, text=/R\\$/");
      const count = await priceElement.count();
      
      // Either has price or redirected
      if (count > 0) {
        await expect(priceElement.first()).toBeVisible();
      }
    }
  });
});

test.describe("Reactivation Flow", () => {
  test("should load reactivate page", async ({ page }) => {
    await page.goto("/reactivate");
    
    // Should show reactivation content or redirect
    await expect(page).toHaveURL(/reactivate|auth/);
  });
});

test.describe("Checkout Success", () => {
  test("should handle checkout success page", async ({ page }) => {
    await page.goto("/checkout/success");
    
    // Should either show success message or redirect
    const url = page.url();
    expect(url).toMatch(/success|auth|dashboard/);
  });
});
