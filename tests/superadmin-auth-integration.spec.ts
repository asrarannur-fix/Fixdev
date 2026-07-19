import { test, expect } from "@playwright/test";
import { loginSuperAdmin } from "./superadmin-login-helper";

test.describe("Super Admin auth integration", () => {
  test.skip(!process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD, "Integration credentials are not configured");

  test("logs in, loads database data, and restores the session", async ({ page }) => {
    const loggedIn = await loginSuperAdmin(page);
    expect(loggedIn).toBe(true);

    await expect(page.locator("#main-app-container")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Global SaaS & Multi-Tenant Management")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText("Unexpected token '<'");
    await expect(page.locator("body")).not.toContainText(/NaN\s*hari/i);

    await page.reload();
    await expect(page.getByText("Global SaaS & Multi-Tenant Management")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(/NaN\s*hari/i);
  });
});