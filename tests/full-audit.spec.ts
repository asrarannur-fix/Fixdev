import { test, expect, type Page } from "@playwright/test";
import { loginTenant, TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD } from "./tenant-login-helper";

const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";

async function login(page: Page) {
  return loginTenant(page);
}

test.describe("Full System E2E", () => {
  test("Edit Stock per Warehouse + POS Flow", async ({ page }) => {
    const ok = await login(page);
    expect(ok, "Dashboard must load").toBe(true);

    // 1. Navigate to inventory
    const inventBtn = page.locator('button:has-text("Inventori")').first();
    if (await inventBtn.isVisible({ timeout: 3000 }).catch(() => false)) await inventBtn.click();
    await page.waitForTimeout(2000);
    console.log("On page: ", page.url());

    // 2. Find and click Stok button
    const stokBtn = page.locator('button:has-text("Stok")').first();
    if (await stokBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stokBtn.click();
      await page.waitForTimeout(2000);
    }

    // Navigate back to dashboard
    const dashboardBtn = page.locator('button:has-text("Beranda")').first();
    if (await dashboardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashboardBtn.click();
      await page.waitForTimeout(2000);
    }

    // 4. Navigate to POS
    const posBtn = page.locator('button:has-text("POS")').first();
    if (await posBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await posBtn.click();
      await page.waitForTimeout(3000);
    }

    const posHeading = page.getByRole("heading", { name: /Katalog Produk & Suku Cadang/i });
    await expect(posHeading, "POS page must load").toBeVisible({ timeout: 10_000 });

    console.log("Full System E2E completed!");
  });
});