import { type Page } from "@playwright/test";

export async function loginAsOwner(page: Page): Promise<boolean> {
  const email = process.env.TEST_TENANT_EMAIL || "";
  const password = process.env.TEST_TENANT_PASSWORD || "";
  const timeout = 30000;

  console.log("Navigating to /login for UI login...");
  await page.goto("/login", { waitUntil: "networkidle", timeout: timeout });

  try {
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  } catch {
    console.error("Login form did not appear. Taking screenshot.");
    await page.screenshot({ path: "test-results/login-page-failure.png", fullPage: true });
    return false;
  }

  console.log("Filling login form...");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  console.log("Waiting for dashboard to load...");
  try {
    await page.waitForSelector("#main-app-container", { timeout: timeout });
    return true;
  } catch {
    console.error("Dashboard did not load after login. Taking screenshot.");
    await page.screenshot({ path: "test-results/dashboard-load-failure.png", fullPage: true });
    return false;
  }
}