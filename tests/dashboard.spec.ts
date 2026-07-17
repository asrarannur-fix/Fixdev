import { expect, test } from "@playwright/test";

test.describe("Dashboard kritis", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Komputer Makassar Service/i);
    await expect(page.getByRole("button", { name: /Masuk/i })).toBeVisible();
  });

  test("portal login form loads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Masuk/i }).click();
    await expect(page.getByRole("heading", { name: /Masuk ke akun/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /alamat email/i })).toBeVisible();
  });
});