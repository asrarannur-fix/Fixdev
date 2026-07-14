import { test, expect } from "@playwright/test";

test.describe("Super Admin auth integration", () => {
  test.skip(!process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD, "Integration credentials are not configured");

  test("logs in, loads database data, and restores the session", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Akses Portal ERP/ }).first().click();
    await page.getByPlaceholder("Masukkan alamat email Anda").fill(process.env.TEST_SUPERADMIN_EMAIL!);
    await page.getByPlaceholder("••••••••").fill(process.env.TEST_SUPERADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Masuk Sistem", exact: true }).last().click();

    await expect(page.getByText("Global SaaS & Multi-Tenant Management")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText("Unexpected token '<'");
    await expect(page.locator("body")).not.toContainText(/NaN\s*hari/i);
    await expect(page.locator("#db-sync-status-btn")).toContainText("Cloud Aktif", { timeout: 15_000 });

    await page.reload();
    await expect(page.getByText("Global SaaS & Multi-Tenant Management")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(/NaN\s*hari/i);
  });
});
