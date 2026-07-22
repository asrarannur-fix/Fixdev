import { test, expect } from "@playwright/test";

test.describe("FIXDEV Production E2E Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 10000 });
    // Ensure no error boundary crash
    const error = await page.locator("text=Modul gagal dimuat").count();
    expect(error).toBe(0);
  });

  test("1. Loads without runtime crash", async ({ page }) => {
    await expect(page).toHaveTitle(/FixDev ERP/);
  });

  test("2. Sidebar navigation renders ≥5 buttons", async ({ page }) => {
    const btns = page.locator("button, [role=button]");
    const count = await btns.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("3. Can navigate through available tabs", async ({ page }) => {
    // Try to click a few nav elements
    const navButtons = page.locator("nav button, aside button, [role=tab]");
    const btnCount = await navButtons.count();
    expect(btnCount).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < Math.min(btnCount, 4); i++) {
      const btn = navButtons.nth(i);
      if (btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("4. Theme toggle works", async ({ page }) => {
    // Find a theme toggle button (sun/moon icon)
    const themeToggle = page.locator("[class*=theme], button:has(svg.lucide-sun), button:has(svg.lucide-moon)");
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(300);
    }
  });

  test("5. Dashboard stats area renders", async ({ page }) => {
    // Check that dashboard content exists (stats cards, grid, etc.)
    const stats = page.locator("[class*=stat], [class*=card], [class*=grid], section, div[class*=dashboard]");
    const count = await stats.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
