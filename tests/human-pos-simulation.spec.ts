import { test, expect } from "@playwright/test";
import { loginTenant } from "./tenant-login-helper";

test.setTimeout(60_000);

test("Owner can open POS catalog", async ({ page }) => {
  const ok = await loginTenant(page);
  expect(ok, "Owner dashboard must load").toBe(true);

  await page.getByRole("button", { name: /POS, buka menu|POS, terbuka/i }).first().click();
  await page.getByRole("button", { name: /^Kasir$/i }).click();
  await expect(page.getByRole("heading", { name: /Katalog Produk & Suku Cadang/i })).toBeVisible({ timeout: 10_000 });
});
