import { test, expect } from "@playwright/test";
import { loginTenant } from "./tenant-login-helper";

test.setTimeout(60_000);

test("Owner can open warranty center", async ({ page }) => {
  const ok = await loginTenant(page);
  expect(ok, "Owner dashboard must load").toBe(true);

  await page.getByRole("button", { name: /Servis, buka menu|Servis, terbuka/i }).first().click();
  await page.getByRole("button", { name: /^Garansi$/i }).click();
  await expect(page.getByRole("heading", { name: /Pusat Garansi, Retur & Komplain/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#tab-warranties-view")).toBeVisible();
});
