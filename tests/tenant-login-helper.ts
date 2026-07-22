import { type Page } from "@playwright/test";

export const TEST_TENANT_EMAIL = process.env.TEST_TENANT_EMAIL || "";
export const TEST_TENANT_PASSWORD = process.env.TEST_TENANT_PASSWORD || "";

export async function loginTenant(page: Page): Promise<boolean> {
  const email = TEST_TENANT_EMAIL;
  const password = TEST_TENANT_PASSWORD;
  const timeout = 30000;

  console.log("Navigating to /login for tenant login...");
  await page.goto("/login", { waitUntil: "networkidle", timeout });

  try {
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  } catch {
    console.error("Login form did not appear. Taking screenshot.");
    await page.screenshot({ path: "test-results/login-page-failure.png", fullPage: true });
    return false;
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForSelector("#main-app-container", { timeout });
    return true;
  } catch {
    console.error("Dashboard did not load after login. Taking screenshot.");
    await page.screenshot({ path: "test-results/dashboard-load-failure.png", fullPage: true });
    return false;
  }
}
